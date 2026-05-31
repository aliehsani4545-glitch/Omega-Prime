/**
 * Adaptive weight optimizer — the closed learning loop.
 * -----------------------------------------------------
 * "Improve the system every time reality disagrees." We hill-climb the SR
 * component weight multipliers to maximize the strategy spread on IN-SAMPLE
 * (train) periods, then report the change in OUT-OF-SAMPLE (validation) spread.
 *
 * Gradient-free coordinate ascent (no ML deps), bounded and deterministic.
 * Out-of-sample validation guards against overfitting; if val does not improve
 * we say so plainly (the rider: expose uncertainty, do not perform confidence).
 */
import type { RegimeState, OptimizationResult, LearnedWeights } from '../domain/types';
import { runBacktest, type BacktestConfig } from './engine';
import { HISTORY_PERIODS } from '../connectors/history';
import { clamp, round } from '../domain/util';

/** Components the optimizer is allowed to tune (the return-relevant ones). */
const TUNABLE = [
  'realityDivergence',
  'expectationGap',
  'revisions',
  'valuationVsEmbedded',
  'relativeStrength',
  'causalPositioning',
  'catalystQuality',
  'crowdingRisk',
  'fragilityRisk',
];

function splitPeriods(T: number, horizon: number): { train: number[]; val: number[] } {
  const all = Array.from({ length: T - horizon }, (_, i) => i);
  const cut = Math.floor(all.length * 0.6);
  return { train: all.slice(0, cut), val: all.slice(cut) };
}

function metrics(regime: RegimeState, overrides: Record<string, number>, periods: number[], cfg: BacktestConfig) {
  const r = runBacktest(regime, { ...cfg, periods, overrides });
  return { spread: r.meanSpread, hitRate: r.meanHitRate, rankIC: r.meanRankIC };
}

export interface OptimizerConfig {
  horizon?: number;
  topK?: number;
  T?: number;
  iterations?: number;
}

export function optimizeWeights(regime: RegimeState, config: OptimizerConfig = {}): OptimizationResult {
  const T = config.T ?? HISTORY_PERIODS;
  const horizon = config.horizon ?? 3;
  const topK = config.topK ?? 5;
  const maxIters = config.iterations ?? 6;
  const cfg: BacktestConfig = { horizon, topK, T };
  const { train, val } = splitPeriods(T, horizon);

  const baseOverrides: Record<string, number> = {};
  const baselineTrain = metrics(regime, baseOverrides, train, cfg);
  const baselineVal = metrics(regime, baseOverrides, val, cfg);

  // Coordinate ascent on the TRAIN objective (spread).
  let best: Record<string, number> = { ...baseOverrides };
  let bestObj = baselineTrain.spread;
  let iterations = 0;
  let step = 0.4;
  for (let iter = 0; iter < maxIters; iter++) {
    iterations++;
    let improvedThisPass = false;
    for (const comp of TUNABLE) {
      const current = best[comp] ?? 1;
      for (const factor of [1 + step, 1 - step]) {
        const candidate = { ...best, [comp]: clamp(current * factor, 0.2, 4) };
        const obj = metrics(regime, candidate, train, cfg).spread;
        if (obj > bestObj + 1e-6) {
          best = candidate;
          bestObj = obj;
          improvedThisPass = true;
        }
      }
    }
    if (!improvedThisPass) {
      step *= 0.5;
      if (step < 0.05) break;
    }
  }

  const optimizedTrain = metrics(regime, best, train, cfg);
  const optimizedVal = metrics(regime, best, val, cfg);

  const changedComponents = TUNABLE.map((c) => ({ component: c, from: 1, to: round(best[c] ?? 1, 3) }))
    .filter((c) => Math.abs(c.to - 1) >= 0.02);

  const learned: LearnedWeights = {
    multipliers: Object.fromEntries(Object.entries(best).map(([k, v]) => [k, round(v, 3)])),
    trainedAt: new Date().toISOString(),
    objective: `max train top${topK}-bottom${topK} spread, horizon ${horizon}`,
  };

  const improvementValSpread = round(optimizedVal.spread - baselineVal.spread, 4);
  const notes: string[] = [];
  notes.push(`Trained on periods [${train.join(',')}], validated on [${val.join(',')}] (out-of-sample).`);
  if (improvementValSpread > 0) {
    notes.push(`Out-of-sample spread improved by ${(improvementValSpread * 100).toFixed(2)}pp — weights generalize.`);
  } else {
    notes.push(`Out-of-sample spread did NOT improve (${(improvementValSpread * 100).toFixed(2)}pp) — likely overfit; keep baseline weights.`);
  }
  notes.push('Recommendations are operator-gated: apply via /api/optimizer/apply only after review.');

  return {
    learned,
    baseline: {
      trainSpread: baselineTrain.spread,
      valSpread: baselineVal.spread,
      trainHitRate: baselineTrain.hitRate,
      valHitRate: baselineVal.hitRate,
      valRankIC: baselineVal.rankIC,
    },
    optimized: {
      trainSpread: optimizedTrain.spread,
      valSpread: optimizedVal.spread,
      trainHitRate: optimizedTrain.hitRate,
      valHitRate: optimizedVal.hitRate,
      valRankIC: optimizedVal.rankIC,
    },
    improvementValSpread,
    iterations,
    trainPeriods: train,
    valPeriods: val,
    changedComponents,
    notes,
  };
}
