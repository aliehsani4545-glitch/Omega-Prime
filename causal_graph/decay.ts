/**
 * Causal edge decay/refresh.
 * --------------------------
 * Edges are not static facts. When recent signals corroborate the downstream
 * node, the edge confidence is refreshed toward its structural weight; when no
 * fresh evidence arrives, confidence decays at the edge's decay rate. This keeps
 * the causal graph honest — stale causal claims lose force over time.
 */
import type { SignalObservation } from '../domain/types';
import type { CausalGraph } from './graph';
import { clamp, nowISO } from '../domain/util';

export interface DecayReport {
  refreshed: number;
  decayed: number;
}

export function applyEvidenceDecay(graph: CausalGraph, signals: SignalObservation[]): DecayReport {
  // Index recent positive corroboration by ticker.
  const corroboration = new Map<string, number>();
  for (const s of signals) {
    if (!s.ticker) continue;
    if (s.velocity > 0) {
      corroboration.set(s.ticker, (corroboration.get(s.ticker) ?? 0) + s.velocity * (s.isInflection ? 1.5 : 1));
    }
  }

  let refreshed = 0;
  let decayed = 0;
  for (const edge of graph.allEdges()) {
    const toNode = graph.getNode(edge.to);
    const ticker = toNode?.ticker;
    const support = ticker ? corroboration.get(ticker) ?? 0 : 0;

    if (support > 0.2) {
      // Fresh evidence → pull confidence toward structural weight.
      const lift = clamp(support * 0.15, 0, 0.2);
      edge.confidence = clamp(edge.confidence + (edge.weight - edge.confidence) * 0.5 + lift, 0.05, 1);
      refreshed++;
    } else {
      // No corroboration → decay confidence at the edge's decay rate.
      edge.confidence = clamp(edge.confidence * (1 - edge.decay * 0.25), 0.05, 1);
      decayed++;
    }
    edge.updatedAt = nowISO();
  }
  return { refreshed, decayed };
}
