/**
 * Shared pure utilities. No I/O. Deterministic where possible so the
 * pipeline is reproducible and auditable.
 */

import type { Provenance, Unit } from './types';

/** Clamp to [min,max]. */
export const clamp = (x: number, min = 0, max = 1): number => Math.min(max, Math.max(min, x));

/** Clamp to the unit interval [0,1]. */
export const unit = (x: number): Unit => clamp(x, 0, 1);

/** Map a value in [-1,1] to [0,1]. */
export const toUnit = (x: number): Unit => unit((x + 1) / 2);

/** Logistic squashing for combining raw additive evidence. */
export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

/** Weighted mean over [value, weight] pairs. Ignores zero-weight terms. */
export function weightedMean(pairs: Array<[number, number]>): number {
  let num = 0;
  let den = 0;
  for (const [v, w] of pairs) {
    num += v * w;
    den += w;
  }
  return den === 0 ? 0 : num / den;
}

export const mean = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

export const round = (x: number, dp = 4): number => {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
};

/**
 * Deterministic seeded PRNG (mulberry32) — used by mock connectors so the
 * platform produces identical, reproducible seed data on every run.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit string hash → useful as a deterministic seed. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

let __counter = 0;
/** Monotonic, human-readable id. Deterministic within a process run. */
export function id(prefix: string): string {
  __counter += 1;
  return `${prefix}_${__counter.toString(36).padStart(5, '0')}`;
}

export const nowISO = (): string => new Date().toISOString();

/** Convenience builder for an internal-model provenance record. */
export function internalProvenance(note: string, reliability = 0.7): Provenance {
  return {
    source: 'internal_model',
    sourceId: 'omega.core',
    observedAt: nowISO(),
    freshnessDays: 0,
    reliability,
    note,
  };
}

/**
 * Combine confidence values as independent corroboration:
 * 1 - Π(1 - c_i). More corroborating sources → higher combined confidence.
 */
export function combineConfidence(confidences: number[]): Unit {
  if (confidences.length === 0) return 0;
  const product = confidences.reduce((acc, c) => acc * (1 - clamp(c)), 1);
  return unit(1 - product);
}
