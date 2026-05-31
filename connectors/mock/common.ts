import type { SignalObservation, SignalDirection, Provenance, SourceCategory } from '../../domain/types';
import { id, clamp, mulberry32, hashString } from '../../domain/util';

export function rngFor(key: string): () => number {
  return mulberry32(hashString(key));
}

export function dir(value: number): SignalDirection {
  if (value > 0.12) return 'bullish';
  if (value < -0.12) return 'bearish';
  return 'neutral';
}

export function prov(
  source: SourceCategory,
  sourceId: string,
  reference: string,
  freshnessDays: number,
  reliability: number,
  asOf: string,
): Provenance {
  return { source, sourceId, reference, observedAt: asOf, freshnessDays, reliability };
}

export function signal(params: {
  family: string;
  name: string;
  ticker?: string;
  value: number; // -1..1 state
  velocity: number; // -1..1 change-of-state
  confidence: number;
  provenance: Provenance[];
  asOf: string;
  inflectionThreshold?: number;
}): SignalObservation {
  const v = clamp(params.value, -1, 1);
  const vel = clamp(params.velocity, -1, 1);
  const thr = params.inflectionThreshold ?? 0.22;
  return {
    id: id('sig'),
    family: params.family,
    name: params.name,
    ticker: params.ticker,
    value: v,
    velocity: vel,
    direction: dir(v),
    isInflection: Math.abs(vel) >= thr,
    confidence: clamp(params.confidence, 0, 1),
    provenance: params.provenance,
    observedAt: params.asOf,
  };
}
