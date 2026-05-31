/**
 * Research Director — the conductor.
 * Runs one full intelligence cycle and populates Research Memory:
 *   regime → signals → theses → agents → causal graph → intelligence layers →
 *   scoring → skeptic → candidates/tiers → alerts → learning.
 *
 * This is the single source of truth the API serves.
 */
import type { ISODate, Candidate, OperatingMode, Alert, SignalObservation, Narrative } from '../domain/types';
import { id, nowISO, unit, clamp, internalProvenance, mean, round } from '../domain/util';

import { buildConnectors, UNIVERSE } from '../connectors/index';
import { classifyRegime } from '../regime_engine/index';
import { buildAllTheses, evolveThesis, thesisIndex, thesisRegimeFit } from '../thesis_engine/index';
import { buildSpecialistRoster } from '../agents/specialists';
import { runAgents } from './agent_runner';
import { buildCausalGraph } from '../causal_graph/seed';
import { applyEvidenceDecay } from '../causal_graph/decay';
import { runDebate } from '../agents/debate';
import {
  computeExpectationGap,
  computeRealityDivergence,
  computeNarrative,
  computePreConsensus,
  computeInevitability,
  computeInformationAdvantage,
} from '../intelligence/index';
import { INEVITABILITY_SEEDS } from './inevitability_seeds';
import { computeComponents, computeSRScore, computeEEP, classifySetupStage, classifyTier, portfolioRoleFor } from '../scoring/index';
import { attackCandidate } from '../skeptic/index';
import { ResearchMemory } from '../memory/store';
import { createLearningRecord, seedLearningHistory } from '../learning/index';

export interface PipelineOptions {
  profileOverrides?: Record<string, number>;
  acceptanceThreshold?: number;
  convictionThreshold?: number;
  watchlistMode?: boolean;
  regimeOverride?: OperatingMode;
  /** Operator-applied learned weight multipliers (closed learning loop). */
  learnedWeights?: import('../domain/types').LearnedWeights;
}

function signalValue(signals: SignalObservation[], ticker: string, family: string, field: 'value' | 'velocity' = 'value'): number {
  const s = signals.find((x) => x.ticker === ticker && x.family === family);
  return s ? s[field] : 0;
}

export async function runPipeline(options: PipelineOptions = {}): Promise<ResearchMemory> {
  const memory = new ResearchMemory();
  const asOf: ISODate = nowISO();
  const connectors = buildConnectors();

  // 1) Regime ---------------------------------------------------------------
  const regimeInputs = await connectors.marketData.getRegimeInputs(asOf);
  const regime = classifyRegime(regimeInputs);
  if (options.regimeOverride) {
    regime.operatingMode = options.regimeOverride;
    regime.explanation += ` [operator override → ${options.regimeOverride}]`;
  }
  memory.setRegime(regime);

  // Effective scoring weights = learned multipliers (closed loop) overlaid by
  // any explicit operator profile overrides.
  const effectiveOverrides: Record<string, number> = {
    ...(options.learnedWeights?.multipliers ?? {}),
    ...(options.profileOverrides ?? {}),
  };
  if (options.learnedWeights) {
    memory.learnedWeights = options.learnedWeights;
    memory.audited('learning_loop', 'apply', 'weights', 'learned', options.learnedWeights.objective);
  }

  // 2) Signals --------------------------------------------------------------
  const [marketSig, fundSig, altSig] = await Promise.all([
    connectors.marketData.getMarketSignals(asOf),
    connectors.fundamentals.getFundamentalSignals(asOf),
    connectors.altData.getAltSignals(asOf),
  ]);
  const signals = [...marketSig, ...fundSig, ...altSig];
  memory.signals = signals;

  // 3) Theses (build + evolve) ---------------------------------------------
  const theses = buildAllTheses(UNIVERSE).map((t) => evolveThesis(t, signals));
  memory.theses = theses;
  const tIndex = thesisIndex(theses);
  const thesisByTicker = (ticker: string) => tIndex.get(ticker) ?? [];
  const industryByTicker = (ticker: string) => UNIVERSE.find((c) => c.ticker === ticker)?.theme ?? 'other';

  // 4) Agents (parallel fan-out + reconciliation) ---------------------------
  const roster = buildSpecialistRoster();
  const agentRun = await runAgents(roster, { regime, signals, theses, asOf });
  for (const o of agentRun.outputs) {
    memory.audited(o.agent, 'analyze', 'agent_output', o.agent, o.summary);
  }
  if (agentRun.escalations.length) {
    memory.audited('research_director', 'reconcile', 'agents', 'roster', `${agentRun.escalations.length} escalations, ${agentRun.contradictions.length} contradictions`);
  }
  const contributingAgents = agentRun.outputs.filter((o) => o.status === 'ok').map((o) => o.agent);

  // 5) Causal graph (with evidence decay/refresh from current signals) -------
  const graph = buildCausalGraph();
  const decayReport = applyEvidenceDecay(graph, signals);
  memory.causalGraph = graph;
  memory.audited('causal_graph', 'decay', 'graph', 'edges', `refreshed ${decayReport.refreshed}, decayed ${decayReport.decayed}`);
  const causalRoot = 'driver:hyperscaler_capex';
  const beneficiaries = graph.query(causalRoot, 4, 0.02);
  const maxTransmit = Math.max(0.0001, ...beneficiaries.map((b) => b.transmittedWeight));
  const causalPositioningFor = (ticker: string): number => {
    const b = beneficiaries.find((x) => x.node.ticker === ticker);
    return b ? clamp(b.transmittedWeight / maxTransmit) : 0.15;
  };

  // 6) Intelligence layers --------------------------------------------------
  const narrativeByThesis = new Map<string, Narrative>();
  for (const t of theses) {
    const members = UNIVERSE.filter((c) => t.linkedCompanies.includes(c.ticker));
    const n = computeNarrative(t, members, signals);
    narrativeByThesis.set(t.id, n);
    memory.narratives.push(n);
  }

  memory.inevitabilities = INEVITABILITY_SEEDS.map((s) => computeInevitability(s, UNIVERSE, signals));
  memory.informationAdvantage = computeInformationAdvantage(signals, thesisByTicker, industryByTicker);

  const signalsByTicker = new Map<string, SignalObservation[]>();
  for (const s of signals) {
    if (!s.ticker) continue;
    const arr = signalsByTicker.get(s.ticker) ?? [];
    arr.push(s);
    signalsByTicker.set(s.ticker, arr);
  }
  const preConsensus = computePreConsensus(signalsByTicker, (t) => UNIVERSE.find((c) => c.ticker === t)?.embeddedExpectation ?? 0.5);
  const preMap = new Map(preConsensus.map((p) => [p.ticker, p]));

  // 7) Per-company scoring → candidates ------------------------------------
  const candidates: Candidate[] = [];
  for (const c of UNIVERSE) {
    const thesisIds = thesisByTicker(c.ticker);
    const eg = computeExpectationGap(c, signals, thesisIds);
    const rd = computeRealityDivergence(c, signals, thesisIds);
    memory.expectationGaps.push(eg);
    memory.realityDivergences.push(rd);

    const linkedTheses = theses.filter((t) => thesisIds.includes(t.id));
    const primaryThesis = linkedTheses.sort((a, b) => b.conviction - a.conviction)[0];
    const narrative = primaryThesis ? narrativeByThesis.get(primaryThesis.id) : undefined;
    const thesisSupport = linkedTheses.length ? mean(linkedTheses.map((t) => t.conviction)) : 0.4;
    const regimeFit = linkedTheses.length ? mean(linkedTheses.map((t) => thesisRegimeFit(t, regime))) : 0.5;
    const pre = preMap.get(c.ticker)?.score ?? 0;

    const scoringInputs = {
      company: c,
      regime,
      expectationGap: eg,
      realityDivergence: rd,
      narrative,
      preConsensusScore: pre,
      causalPositioning: causalPositioningFor(c.ticker),
      revisionsSignal: signalValue(signals, c.ticker, 'estimate_revision', 'velocity'),
      relativeStrengthSignal: signalValue(signals, c.ticker, 'relative_strength'),
      flowSignal: signalValue(signals, c.ticker, 'institutional_flow'),
      valuationEdgeSignal: signalValue(signals, c.ticker, 'valuation_vs_embedded'),
      thesisSupport,
      regimeFit,
      profileOverrides: effectiveOverrides,
    };

    const components = computeComponents(scoringInputs);
    let sr = computeSRScore(components, regime, effectiveOverrides);
    let eep = computeEEP(scoringInputs, components);

    const setupStage = classifySetupStage(components, pre, c.embeddedExpectation);
    const regimeMismatch = clamp(1 - regimeFit) * (regime.operatingMode === 'defensive' ? 1 : 0.7);
    const verdict = attackCandidate(`cand_${c.ticker}`, {
      company: c,
      components,
      setupStage,
      regimeMismatch,
      narrativeCrowdedEuphoric: narrative?.classification === 'crowded_euphoric',
    });
    memory.skepticObjections.push(...verdict.objections);

    // Skeptic penalties shrink conviction/confidence and SR.
    let conviction = unit(thesisSupport - verdict.convictionPenalty * 0.5);
    let confidence = unit(mean([eg.confidence, rd.confidence]) - verdict.confidencePenalty * 0.5);
    if (verdict.skepticWins) sr = round(sr * (1 - verdict.aggregateSeverity * 0.3), 4);

    const acceptanceOverride = options.watchlistMode ? 0.99 : options.acceptanceThreshold;
    const tier = classifyTier(eep, sr, regime, verdict, components, acceptanceOverride);
    const portfolioRole = portfolioRoleFor(tier, components, eep);

    const contrarianRisks = [...verdict.objections.map((o) => o.statement), ...(primaryThesis?.risks ?? [])].slice(0, 5);
    const catalysts = primaryThesis ? primaryThesis.evidence.slice(0, 3).map((e) => e.statement) : ['Reality divergence vs consensus'];
    const invalidationTriggers = primaryThesis?.invalidation ?? ['Thesis-specific invalidation pending'];

    candidates.push({
      id: `cand_${c.ticker}`,
      ticker: c.ticker,
      company: c.name,
      theme: c.theme,
      thesisIds,
      eep,
      srScore: sr,
      components,
      regimeFit: unit(regimeFit),
      evidenceQuality: unit(mean([eg.confidence, rd.confidence, thesisSupport])),
      setupStage,
      tier,
      whyNow: `${rd.divergenceScore > 0.6 ? 'Reality diverging from consensus' : 'Reality firming'}; expectation gap ${(eg.gapScore * 100).toFixed(0)}/100, pre-consensus ${(pre * 100).toFixed(0)}/100.`,
      whyNotObvious: c.embeddedExpectation > 0.8 ? 'Largely embedded — edge is in second-order/bottleneck exposure.' : 'Emerging reality not yet fully reflected in estimates/price.',
      supportingThesis: primaryThesis ? `${primaryThesis.identity}: ${primaryThesis.description}` : 'Cross-thesis beneficiary',
      contrarianRisks,
      catalysts,
      invalidationTriggers,
      crowdingRisk: components.crowdingRisk,
      conviction,
      portfolioRole,
      timeHorizonDays: primaryThesis?.timeHorizonDays ?? 365,
      catalystWindowDays: setupStage === 'early' ? 180 : setupStage === 'emerging' ? 120 : 60,
      skepticVerdict: verdict,
      confidence,
      provenance: [internalProvenance('candidate assembled by research director')],
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });
  }

  candidates.sort((a, b) => b.srScore - a.srScore);
  memory.candidates = candidates;

  // 7b) Agent debate / reconciliation for the leading candidates -----------
  for (const cand of candidates.filter((c) => c.tier === 'tier1' || c.tier === 'tier2')) {
    const eg = memory.expectationGaps.find((e) => e.ticker === cand.ticker);
    const rd = memory.realityDivergences.find((r) => r.ticker === cand.ticker);
    const verdict = runDebate({
      ticker: cand.ticker,
      components: cand.components,
      skeptic: cand.skepticVerdict!,
      expectationGap: eg?.gapScore ?? cand.components.expectationGap,
      realityDivergence: rd?.divergenceScore ?? cand.components.realityDivergence,
      preConsensus: preMap.get(cand.ticker)?.score ?? 0,
    });
    memory.debates.push(verdict);
    // Reconcile: the debate nudges conviction (bounded).
    cand.conviction = unit(cand.conviction + verdict.convictionDelta * 0.2);
    cand.updatedAt = nowISO();
    memory.audited('debate', 'reconcile', 'candidate', cand.id, `${verdict.winner}: ${verdict.rationale}`);
  }

  // 8) Alerts ---------------------------------------------------------------
  const alerts: Alert[] = [];
  for (const cand of candidates) {
    if (cand.tier === 'tier1' && cand.srScore >= regime.policy.alertThreshold) {
      alerts.push({
        id: id('alert'),
        at: nowISO(),
        severity: cand.srScore > 0.78 ? 'elevated' : 'watch',
        title: `${cand.ticker} — Tier 1 emerging leadership (EEP ${(cand.eep * 100).toFixed(0)})`,
        body: cand.whyNow,
        tickers: [cand.ticker],
        thesisIds: cand.thesisIds,
        srScore: cand.srScore,
        acknowledged: false,
      });
    }
  }
  for (const a of alerts) memory.addAlert(a);

  // 9) Learning -------------------------------------------------------------
  memory.learning = [
    ...seedLearningHistory(),
    ...candidates.filter((c) => c.tier === 'tier1' || c.tier === 'tier2').map((c) => createLearningRecord(c, regime, contributingAgents)),
  ];

  memory.audited('research_director', 'complete', 'pipeline', 'run', `Regime ${regime.label}; ${candidates.length} candidates; ${alerts.length} alerts.`);
  return memory;
}
