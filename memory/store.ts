/**
 * Research Memory Layer + Provenance/Audit Layer
 * ----------------------------------------------
 * Canonical in-process snapshot of all research objects. Every mutation is
 * audited. Designed for event replay and explainability. Persistence is
 * optional (database/repository.ts) — the platform runs fully in-memory.
 */
import type {
  RegimeState,
  Thesis,
  Candidate,
  SignalObservation,
  Narrative,
  Inevitability,
  ExpectationGap,
  RealityDivergence,
  InformationAdvantageSignal,
  Alert,
  AuditEvent,
  LearningRecord,
  SkepticObjection,
  DebateVerdict,
  LearnedWeights,
} from '../domain/types';
import { id, nowISO } from '../domain/util';
import type { CausalGraph } from '../causal_graph/graph';

export interface MemorySnapshot {
  generatedAt: string;
  regime?: RegimeState;
  regimeHistory: RegimeState[];
  theses: Thesis[];
  candidates: Candidate[];
  narratives: Narrative[];
  inevitabilities: Inevitability[];
  expectationGaps: ExpectationGap[];
  realityDivergences: RealityDivergence[];
  informationAdvantage: InformationAdvantageSignal[];
  signals: SignalObservation[];
  skepticObjections: SkepticObjection[];
  debates: DebateVerdict[];
  learnedWeights?: LearnedWeights;
  alerts: Alert[];
  learning: LearningRecord[];
  audit: AuditEvent[];
}

export class ResearchMemory {
  regime?: RegimeState;
  regimeHistory: RegimeState[] = [];
  theses: Thesis[] = [];
  candidates: Candidate[] = [];
  narratives: Narrative[] = [];
  inevitabilities: Inevitability[] = [];
  expectationGaps: ExpectationGap[] = [];
  realityDivergences: RealityDivergence[] = [];
  informationAdvantage: InformationAdvantageSignal[] = [];
  signals: SignalObservation[] = [];
  skepticObjections: SkepticObjection[] = [];
  debates: DebateVerdict[] = [];
  learnedWeights?: LearnedWeights;
  alerts: Alert[] = [];
  learning: LearningRecord[] = [];
  audit: AuditEvent[] = [];
  causalGraph?: CausalGraph;

  private logged = false;

  audited(actor: string, action: string, targetType: string, targetId: string, note?: string, before?: unknown, after?: unknown): void {
    this.audit.push({ id: id('audit'), at: nowISO(), actor, action, targetType, targetId, note, before, after });
  }

  setRegime(regime: RegimeState): void {
    if (this.regime) this.regimeHistory.push(this.regime);
    this.regime = regime;
    this.audited('regime_brain', 'classify', 'regime', regime.id, regime.explanation);
  }

  addAlert(alert: Alert): void {
    this.alerts.push(alert);
    this.audited('alert_center', 'raise', 'alert', alert.id, alert.title);
  }

  thesisById(tid: string): Thesis | undefined {
    return this.theses.find((t) => t.id === tid);
  }

  candidateByTicker(ticker: string): Candidate | undefined {
    return this.candidates.find((c) => c.ticker === ticker);
  }

  snapshot(): MemorySnapshot {
    return {
      generatedAt: nowISO(),
      regime: this.regime,
      regimeHistory: this.regimeHistory,
      theses: this.theses,
      candidates: this.candidates,
      narratives: this.narratives,
      inevitabilities: this.inevitabilities,
      expectationGaps: this.expectationGaps,
      realityDivergences: this.realityDivergences,
      informationAdvantage: this.informationAdvantage,
      signals: this.signals,
      skepticObjections: this.skepticObjections,
      debates: this.debates,
      learnedWeights: this.learnedWeights,
      alerts: this.alerts,
      learning: this.learning,
      audit: this.audit,
    };
  }
}

/** Process-wide singleton memory used by the API + pipeline. */
let __memory: ResearchMemory | undefined;
export function getMemory(): ResearchMemory {
  if (!__memory) __memory = new ResearchMemory();
  return __memory;
}
export function resetMemory(): ResearchMemory {
  __memory = new ResearchMemory();
  return __memory;
}
