/**
 * Thesis Evolution Engine
 * -----------------------
 * Builds theses from defs + universe, then evolves their confidence,
 * conviction, velocities and status from live signals. Preserves full history.
 */
import type { Thesis, ThesisStatus, EvidenceItem, SignalObservation, ThesisHistoryEntry, RegimeState } from '../domain/types';
import type { CompanyFacts } from '../connectors/types';
import { id, unit, clamp, nowISO, internalProvenance, mean } from '../domain/util';
import { THESIS_DEFS, type ThesisDef } from './defs';

export { THESIS_DEFS } from './defs';

function evidenceItems(statements: string[], supports: boolean): EvidenceItem[] {
  return statements.map((s) => ({
    id: id('ev'),
    statement: s,
    supports,
    weight: 0.6,
    confidence: 0.6,
    provenance: [internalProvenance('thesis seed evidence')],
    observedAt: nowISO(),
  }));
}

export function buildThesis(def: ThesisDef, universe: CompanyFacts[]): Thesis {
  const members = universe.filter((c) => def.companies.includes(c.ticker));
  const gap = mean(members.map((c) => c.emergingReality - c.embeddedExpectation));
  const crowding = mean(members.map((c) => c.crowding));
  const conviction = unit(0.4 + gap * 1.5);
  const confidence = unit(0.45 + mean(members.map((c) => c.observedReality - 0.4)) * 0.6);
  const now = nowISO();

  const status: ThesisStatus = crowding > 0.82 ? 'crowded' : gap > 0.2 ? 'accelerating' : gap > 0.1 ? 'strengthening' : 'emerging';

  return {
    id: `thesis_${def.key}`,
    identity: def.identity,
    category: def.category,
    description: def.description,
    evidence: evidenceItems(def.evidence, true),
    disconfirming: evidenceItems(def.disconfirming, false),
    risks: def.risks,
    conviction,
    confidence,
    confidenceVelocity: clamp(gap * 1.2, -1, 1),
    convictionVelocity: clamp(gap * 1.1, -1, 1),
    invalidation: def.invalidation,
    regimeSensitivity: def.regimeSensitivity,
    crowding: unit(crowding),
    supportingSignals: def.supportingSignals,
    leadIndicators: def.leadIndicators,
    laggingIndicators: def.laggingIndicators,
    beneficiaryNetwork: def.companies,
    timeHorizonDays: def.timeHorizonDays,
    status,
    linkedCompanies: def.companies,
    history: [
      { at: now, status, confidence, conviction, note: 'Thesis instantiated from definition + universe facts.' },
    ],
    provenance: [internalProvenance(`thesis "${def.key}" built from defs + universe`)],
    createdAt: now,
    updatedAt: now,
  };
}

export function buildAllTheses(universe: CompanyFacts[]): Thesis[] {
  return THESIS_DEFS.map((d) => buildThesis(d, universe));
}

/**
 * Evolve a thesis from fresh signals: update velocities, possibly transition
 * status, and append a history entry when the status changes.
 */
export function evolveThesis(thesis: Thesis, signals: SignalObservation[]): Thesis {
  const linked = signals.filter((s) => s.ticker && thesis.linkedCompanies.includes(s.ticker));
  if (linked.length === 0) return thesis;

  const leadVel = mean(linked.filter((s) => thesis.leadIndicators.includes(s.family)).map((s) => s.velocity));
  const supportVel = mean(linked.filter((s) => thesis.supportingSignals.includes(s.family)).map((s) => s.velocity));
  const aggregateVel = clamp((leadVel * 0.6 + supportVel * 0.4), -1, 1);

  const newConfidence = unit(thesis.confidence + aggregateVel * 0.05);
  const newConviction = unit(thesis.conviction + aggregateVel * 0.04);

  let status = thesis.status;
  if (thesis.crowding > 0.85) status = 'crowded';
  else if (aggregateVel > 0.3) status = 'accelerating';
  else if (aggregateVel > 0.1) status = 'strengthening';
  else if (aggregateVel < -0.3) status = 'weakening';
  else if (aggregateVel < -0.6) status = 'broken';

  const statusChanged = status !== thesis.status;
  const history: ThesisHistoryEntry[] = statusChanged
    ? [
        ...thesis.history,
        { at: nowISO(), status, confidence: newConfidence, conviction: newConviction, note: `Status → ${status} (signal velocity ${aggregateVel.toFixed(2)}).`, trigger: 'signal_evolution' },
      ]
    : thesis.history;

  return {
    ...thesis,
    confidence: newConfidence,
    conviction: newConviction,
    confidenceVelocity: aggregateVel,
    convictionVelocity: aggregateVel,
    status,
    history,
    updatedAt: nowISO(),
  };
}

/** Regime fit for a thesis in [0,1] given the active regime. */
export function thesisRegimeFit(thesis: Thesis, regime: RegimeState): number {
  const raw = thesis.regimeSensitivity[regime.label] ?? 0;
  return unit((raw + 1) / 2);
}

/** Map ticker → thesis ids that link it. */
export function thesisIndex(theses: Thesis[]): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  for (const t of theses) {
    for (const ticker of t.linkedCompanies) {
      const arr = idx.get(ticker) ?? [];
      arr.push(t.id);
      idx.set(ticker, arr);
    }
  }
  return idx;
}
