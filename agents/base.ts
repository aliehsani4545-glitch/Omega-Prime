/**
 * Agent framework. Each agent has: purpose, typed output, confidence model,
 * evidence/provenance contract, contradiction handling, retry + escalation.
 * v1 agents are deterministic heuristics; the same contract supports LLM-backed
 * reasoning agents (OMEGA_AGENT_MODE=llm) as an upgrade path.
 */
import type { AgentOutput, AgentContext, AgentStatus, SignalObservation } from '../domain/types';
import { unit, nowISO, combineConfidence } from '../domain/util';

export interface Agent {
  readonly name: string;
  readonly purpose: string;
  /** Minimum confidence below which the agent self-reports low_confidence. */
  readonly confidenceFloor: number;
  run(ctx: AgentContext): Promise<AgentOutput>;
}

export interface AgentResult {
  summary: string;
  signals: SignalObservation[];
  data: unknown;
  confidence: number;
  contradictions?: string[];
}

/** Base class implementing retry, escalation, and the output contract. */
export abstract class BaseAgent implements Agent {
  abstract readonly name: string;
  abstract readonly purpose: string;
  readonly confidenceFloor: number = 0.35;
  readonly maxRetries: number = 2;

  /** Subclasses implement the actual analysis. */
  protected abstract execute(ctx: AgentContext): Promise<AgentResult>;

  async run(ctx: AgentContext): Promise<AgentOutput> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const r = await this.execute(ctx);
        const contradictions = r.contradictions ?? this.detectContradictions(r.signals);
        const status = this.statusFor(r.confidence, contradictions);
        return {
          agent: this.name,
          status,
          summary: r.summary,
          signals: r.signals,
          data: r.data,
          contradictions,
          escalate: status === 'escalated' || status === 'contradiction',
          confidence: unit(r.confidence),
          provenance: r.signals.flatMap((s) => s.provenance).slice(0, 8),
          producedAt: nowISO(),
        };
      } catch (err) {
        lastError = err;
      }
    }
    // Exhausted retries → escalate with error status.
    return {
      agent: this.name,
      status: 'error',
      summary: `Agent failed after ${this.maxRetries + 1} attempts: ${String(lastError)}`,
      signals: [],
      data: null,
      contradictions: [],
      escalate: true,
      confidence: 0,
      provenance: [],
      producedAt: nowISO(),
    };
  }

  /** A signal set is contradictory if bullish and bearish inflections coexist. */
  protected detectContradictions(signals: SignalObservation[]): string[] {
    const bull = signals.filter((s) => s.isInflection && s.direction === 'bullish').length;
    const bear = signals.filter((s) => s.isInflection && s.direction === 'bearish').length;
    if (bull > 0 && bear > 0 && Math.min(bull, bear) / Math.max(bull, bear) > 0.4) {
      return [`Conflicting inflections: ${bull} bullish vs ${bear} bearish.`];
    }
    return [];
  }

  protected statusFor(confidence: number, contradictions: string[]): AgentStatus {
    if (contradictions.length > 0) return 'contradiction';
    if (confidence < this.confidenceFloor) return 'low_confidence';
    return 'ok';
  }

  protected confidenceFromSignals(signals: SignalObservation[]): number {
    return combineConfidence(signals.map((s) => s.confidence));
  }
}
