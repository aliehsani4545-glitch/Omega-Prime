import { describe, it, expect } from 'vitest';
import { buildHistory, factsAtPeriod, forwardReturn, HISTORY_PERIODS } from '../connectors/history';
import { runDebate } from '../agents/debate';
import { applyEvidenceDecay } from '../causal_graph/decay';
import { buildCausalGraph } from '../causal_graph/seed';
import { attackCandidate } from '../skeptic/index';
import { computeComponents } from '../scoring/index';
import { computeExpectationGap, computeRealityDivergence } from '../intelligence/index';
import { classifyRegime } from '../regime_engine/index';
import { UNIVERSE } from '../connectors/index';
import type { CompanyFacts } from '../connectors/types';
import type { RegimeInputs, SignalObservation } from '../domain/types';

const regimeInputs: RegimeInputs = {
  vix: 16, vixTermStructure: 0.95, yield2y: 4.3, yield10y: 4.2, rateTrend: 0.1, realYield: 1.8,
  creditSpreadProxy: 0.3, dollarTrend: 0.1, breadth: 0.5, newHighsLows: 0.2, nasdaqVsSpx: 0.3,
  spxVsRussell: 0.3, semisVsSoftware: 0.3, cyclicalsLeadership: 0, sectorRotationVelocity: 0.4,
  liquidityProxy: 0.2, earningsRevisionBreadth: 0.2, eventRiskConcentration: 0.3,
};

describe('Temporal data layer', () => {
  it('builds a full trajectory per company, deterministically', () => {
    const h1 = buildHistory();
    const h2 = buildHistory();
    expect(h1.length).toBe(UNIVERSE.length);
    expect(h1[0]!.periods.length).toBe(HISTORY_PERIODS);
    // Deterministic: same priceIndex path on rebuild.
    expect(h1[0]!.periods.at(-1)!.priceIndex).toBe(h2[0]!.periods.at(-1)!.priceIndex);
  });

  it('projects facts as-of a period using only that period', () => {
    const f0 = factsAtPeriod('MU', 0)!;
    const fLast = factsAtPeriod('MU', HISTORY_PERIODS - 1)!;
    expect(f0).toBeDefined();
    // Reality generally rises over time toward the emerging target.
    expect(fLast.emergingReality).toBeGreaterThan(f0.emergingReality - 0.2);
  });

  it('forwardReturn looks forward and is undefined past the horizon', () => {
    expect(forwardReturn('MU', 0, 3)).toBeTypeOf('number');
    expect(forwardReturn('MU', HISTORY_PERIODS - 1, 3)).toBeUndefined();
  });
});

describe('Agent debate / reconciliation', () => {
  const regime = classifyRegime(regimeInputs);
  function debateFor(c: CompanyFacts) {
    const eg = computeExpectationGap(c, [], []);
    const rd = computeRealityDivergence(c, [], []);
    const components = computeComponents({
      company: c, regime, expectationGap: eg, realityDivergence: rd, narrative: undefined,
      preConsensusScore: 0.6, causalPositioning: 0.5, revisionsSignal: 0.3, relativeStrengthSignal: 0.2,
      flowSignal: 0.3, valuationEdgeSignal: 0.4, thesisSupport: 0.6, regimeFit: 0.7,
    });
    const skeptic = attackCandidate('cand', { company: c, components, setupStage: 'emerging', regimeMismatch: 0.1, narrativeCrowdedEuphoric: false });
    return runDebate({ ticker: c.ticker, components, skeptic, expectationGap: eg.gapScore, realityDivergence: rd.divergenceScore, preConsensus: 0.6 });
  }

  it('bull prevails for a clean under-embedded name with weak skeptic', () => {
    const clean = { ...UNIVERSE.find((c) => c.ticker === 'POWL')!, crowding: 0.2, fragility: 0.3, balanceSheet: 0.7 };
    const v = debateFor(clean);
    expect(v.winner).toBe('bull');
    expect(v.convictionDelta).toBeGreaterThan(0);
  });

  it('skeptic pulls conviction down for a toxic name', () => {
    const toxic = { ...UNIVERSE.find((c) => c.ticker === 'PLTR')!, valuation: 0.96, crowding: 0.95, balanceSheet: 0.2, fragility: 0.9, embeddedExpectation: 0.95, emergingReality: 0.95 };
    const v = debateFor(toxic);
    expect(v.skepticForce).toBeGreaterThan(0);
    expect(v.convictionDelta).toBeLessThan(debateFor({ ...toxic, crowding: 0.2, valuation: 0.4, fragility: 0.3, balanceSheet: 0.8 }).convictionDelta);
  });
});

describe('Causal edge decay/refresh', () => {
  it('refreshes corroborated edges and decays uncorroborated ones', () => {
    const g = buildCausalGraph();
    const before = new Map(g.allEdges().map((e) => [e.id, e.confidence]));
    // Corroborate MU strongly; leave others without support.
    const signals: SignalObservation[] = [
      { id: 's1', family: 'supply_constraint', name: 'MU supply', ticker: 'MU', value: 0.8, velocity: 0.6, direction: 'bullish', isInflection: true, confidence: 0.7, provenance: [], observedAt: new Date().toISOString() },
    ];
    const report = applyEvidenceDecay(g, signals);
    expect(report.refreshed + report.decayed).toBe(g.allEdges().length);
    // The MU edge (HBM -> MU) should not have decayed below its prior.
    const muEdge = g.allEdges().find((e) => g.getNode(e.to)?.ticker === 'MU');
    expect(muEdge!.confidence).toBeGreaterThanOrEqual(before.get(muEdge!.id)! - 1e-9);
  });
});
