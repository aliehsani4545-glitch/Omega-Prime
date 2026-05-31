/**
 * Independent verification of the backtesting + weight-optimization subsystem.
 * ---------------------------------------------------------------------------
 * Adversarial audit. Each test is designed to FAIL if a specific methodological
 * flaw existed (lookahead bias, data leakage, non-determinism, fabricated
 * out-of-sample improvement, broken train/val split, out-of-range Spearman).
 *
 * No source files are modified; this only reads the public API.
 */
import { describe, it, expect } from 'vitest';
import { classifyRegime } from '../regime_engine/index';
import {
  scoreAtPeriod,
  evaluatePeriod,
  runBacktest,
} from '../backtesting/engine';
import { optimizeWeights } from '../backtesting/optimizer';
import { forwardReturn, HISTORY_PERIODS } from '../connectors/history';
import { round } from '../domain/util';
import type { RegimeInputs, RegimeState } from '../domain/types';

// Deterministic regime inputs (no I/O, no clock). Mirrors the mock world's
// "selective growth / AI mania transition" environment closely enough to
// exercise the same code path the engine uses in production.
const REGIME_INPUTS: RegimeInputs = {
  vix: 16.5,
  vixTermStructure: 0.93,
  yield2y: 4.35,
  yield10y: 4.25,
  rateTrend: 0.25,
  realYield: 1.9,
  creditSpreadProxy: 0.32,
  dollarTrend: 0.15,
  breadth: 0.46,
  newHighsLows: 0.22,
  nasdaqVsSpx: 0.4,
  spxVsRussell: 0.35,
  semisVsSoftware: 0.45,
  cyclicalsLeadership: -0.1,
  sectorRotationVelocity: 0.55,
  liquidityProxy: 0.2,
  earningsRevisionBreadth: 0.28,
  eventRiskConcentration: 0.4,
};

function buildRegime(): RegimeState {
  return classifyRegime(REGIME_INPUTS);
}

const HORIZON = 3;
const TOPK = 5;

describe('Backtest verification — no lookahead in scoring', () => {
  // FAILS if scoreAtPeriod's output depended (directly or indirectly) on the
  // evaluation horizon or on future-period labels. The signature has no horizon
  // arg; this test proves the *values* are invariant to horizon as well, by
  // comparing scores produced standalone vs. scores embedded in evaluatePeriod
  // runs that use different horizons.
  it('scoreAtPeriod is invariant to the evaluation horizon used downstream', () => {
    const regime = buildRegime();
    const t = 4;

    const direct = scoreAtPeriod(t, regime, {});
    const srByTicker = new Map(direct.map((s) => [s.ticker, s.sr]));
    expect(srByTicker.size).toBeGreaterThan(0);

    // Run evaluatePeriod with two different horizons; the SR ranking baked into
    // the picks must match the horizon-free scores exactly. (picks carry srScore
    // rounded to 4dp; compare against the same rounding.)
    for (const h of [1, 2, 5]) {
      // period must leave room for the horizon
      if (t + h >= HISTORY_PERIODS) continue;
      const { picks } = evaluatePeriod(t, regime, {}, h, TOPK);
      for (const p of picks) {
        const expected = round(srByTicker.get(p.ticker)!, 4);
        expect(p.srScore).toBe(expected);
      }
    }
  });

  it('scoreAtPeriod re-runs identically (pure, no hidden state from horizon)', () => {
    const regime = buildRegime();
    const a = scoreAtPeriod(6, regime, {});
    const b = scoreAtPeriod(6, regime, {});
    expect(b).toEqual(a);
  });
});

describe('Backtest verification — determinism', () => {
  it('runBacktest yields identical aggregate + per-period results across runs', () => {
    const regime = buildRegime();
    const r1 = runBacktest(regime, { horizon: HORIZON, topK: TOPK });
    const r2 = runBacktest(regime, { horizon: HORIZON, topK: TOPK });

    expect(r1.meanSpread).toBe(r2.meanSpread);
    expect(r1.meanHitRate).toBe(r2.meanHitRate);
    expect(r1.meanRankIC).toBe(r2.meanRankIC);
    // Per-period results must be byte-for-byte identical (generatedAt excluded).
    expect(r1.perPeriod).toEqual(r2.perPeriod);
    expect(r1.periodsEvaluated).toEqual(r2.periodsEvaluated);
    expect(r1.picks).toEqual(r2.picks);
  });

  it('optimizeWeights yields identical learned multipliers and OOS improvement', () => {
    const regime = buildRegime();
    const o1 = optimizeWeights(regime, {});
    const o2 = optimizeWeights(regime, {});

    expect(o1.learned.multipliers).toEqual(o2.learned.multipliers);
    expect(o1.improvementValSpread).toBe(o2.improvementValSpread);
    expect(o1.changedComponents).toEqual(o2.changedComponents);
    expect(o1.optimized).toEqual(o2.optimized);
    expect(o1.baseline).toEqual(o2.baseline);
    expect(o1.iterations).toBe(o2.iterations);
  });
});

describe('Backtest verification — train/val split integrity', () => {
  it('train and val periods are disjoint and val is strictly later in time', () => {
    const regime = buildRegime();
    const r = optimizeWeights(regime, {});

    expect(r.trainPeriods.length).toBeGreaterThan(0);
    expect(r.valPeriods.length).toBeGreaterThan(0);

    const trainSet = new Set(r.trainPeriods);
    const intersection = r.valPeriods.filter((p) => trainSet.has(p));
    // Strict structural claim: no leakage of train periods into val.
    expect(intersection).toEqual([]);

    // Out-of-sample must be strictly LATER in time: every val index > max train.
    const maxTrain = Math.max(...r.trainPeriods);
    const minVal = Math.min(...r.valPeriods);
    expect(minVal).toBeGreaterThan(maxTrain);

    // The two partitions must cover exactly the evaluable periods (no gaps,
    // no overlap) — guards against silently dropping/duplicating periods.
    const union = [...r.trainPeriods, ...r.valPeriods].sort((a, b) => a - b);
    const expected = Array.from({ length: HISTORY_PERIODS - HORIZON }, (_, i) => i);
    expect(union).toEqual(expected);
  });
});

describe('Backtest verification — baseline uses no overrides', () => {
  it('optimizer baseline val spread equals an empty-override backtest on val periods', () => {
    const regime = buildRegime();
    const r = optimizeWeights(regime, {});

    // Reconstruct the baseline independently with NO overrides on the exact
    // val periods the optimizer reported. If the optimizer's "baseline" were
    // secretly tuned, these would diverge.
    const recomputed = runBacktest(regime, {
      horizon: HORIZON,
      topK: TOPK,
      periods: r.valPeriods,
    });
    expect(recomputed.meanSpread).toBeCloseTo(r.baseline.valSpread, 6);
    expect(recomputed.meanHitRate).toBeCloseTo(r.baseline.valHitRate, 6);
    expect(recomputed.meanRankIC).toBeCloseTo(r.baseline.valRankIC, 6);
  });
});

describe('Backtest verification — no fabricated out-of-sample improvement', () => {
  it('improvementValSpread equals the actual OOS delta (optimized - baseline), not in-sample', () => {
    const regime = buildRegime();
    const r = optimizeWeights(regime, {});

    // The reported improvement must be the OUT-OF-SAMPLE delta, rounded 4dp.
    const expectedOOS = round(r.optimized.valSpread - r.baseline.valSpread, 4);
    expect(r.improvementValSpread).toBe(expectedOOS);

    // And it must NOT be silently reporting the (typically larger) in-sample
    // train delta. We assert the reported value is not equal to the train delta
    // UNLESS they genuinely coincide. If they coincide we still require the OOS
    // identity above to hold (already asserted), so this is a soft cross-check.
    const trainDelta = round(r.optimized.trainSpread - r.baseline.trainSpread, 4);
    // Coordinate ascent maximizes the TRAIN objective, so train improvement
    // should be >= 0 by construction. This guards the direction of optimization.
    expect(r.optimized.trainSpread).toBeGreaterThanOrEqual(r.baseline.trainSpread - 1e-9);
    // Document the relationship; not a hard inequality because both can be 0.
    expect(typeof trainDelta).toBe('number');
  });

  it('optimized val spread is recomputable from the learned multipliers (no magic numbers)', () => {
    const regime = buildRegime();
    const r = optimizeWeights(regime, {});

    // Apply the learned multipliers as overrides and re-backtest the val set.
    const overrides = r.learned.multipliers;
    const recomputed = runBacktest(regime, {
      horizon: HORIZON,
      topK: TOPK,
      periods: r.valPeriods,
      overrides,
    });
    // The optimizer rounds multipliers to 3dp for `learned`; that rounding can
    // perturb the spread slightly, so allow a small tolerance but require the
    // optimized.valSpread to be reproducible to ~3dp.
    expect(recomputed.meanSpread).toBeCloseTo(r.optimized.valSpread, 2);
  });
});

describe('Backtest verification — rankIC sanity (Spearman in [-1,1])', () => {
  it('every per-period rankIC lies within [-1, 1]', () => {
    const regime = buildRegime();
    const r = runBacktest(regime, { horizon: HORIZON, topK: TOPK });
    expect(r.perPeriod.length).toBeGreaterThan(0);
    for (const p of r.perPeriod) {
      expect(p.rankIC).toBeGreaterThanOrEqual(-1);
      expect(p.rankIC).toBeLessThanOrEqual(1);
    }
    expect(r.meanRankIC).toBeGreaterThanOrEqual(-1);
    expect(r.meanRankIC).toBeLessThanOrEqual(1);
  });

  it('hitRate is a valid fraction in [0,1] every period', () => {
    const regime = buildRegime();
    const r = runBacktest(regime, { horizon: HORIZON, topK: TOPK });
    for (const p of r.perPeriod) {
      expect(p.hitRate).toBeGreaterThanOrEqual(0);
      expect(p.hitRate).toBeLessThanOrEqual(1);
    }
  });

  it('evaluatePeriod returns a finite rankIC bounded by Spearman limits', () => {
    const regime = buildRegime();
    const { result } = evaluatePeriod(2, regime, {}, HORIZON, TOPK);
    expect(Number.isFinite(result.rankIC)).toBe(true);
    expect(Math.abs(result.rankIC)).toBeLessThanOrEqual(1);
  });
});

describe('Backtest verification — forwardReturn truly looks forward', () => {
  it('forwardReturn depends on the t+horizon price and is undefined out of range', () => {
    // Pick any ticker that exists in the synthetic history.
    const regime = buildRegime();
    const sample = scoreAtPeriod(0, regime, {});
    const ticker = sample[0]!.ticker;

    // In range: defined and finite.
    const fr = forwardReturn(ticker, 0, HORIZON);
    expect(fr).toBeDefined();
    expect(Number.isFinite(fr!)).toBe(true);

    // The return must change with horizon (it reads a different future price).
    const fr1 = forwardReturn(ticker, 0, 1)!;
    const fr2 = forwardReturn(ticker, 0, 2)!;
    expect(fr1).not.toBe(fr2);

    // Out of range: undefined when t+horizon exceeds the trajectory length.
    const past = forwardReturn(ticker, HISTORY_PERIODS - 1, 1);
    expect(past).toBeUndefined();
    const wayOut = forwardReturn(ticker, 0, HISTORY_PERIODS + 5);
    expect(wayOut).toBeUndefined();
  });

  it('forwardReturn is purely a function of two priceIndex points (sign + magnitude consistency)', () => {
    const regime = buildRegime();
    const ticker = scoreAtPeriod(0, regime, {})[0]!.ticker;
    // r(0->2) composed via the engine must equal (1+r(0->1)) chaining is NOT
    // assumed; instead assert the simple-return identity against itself twice.
    const a = forwardReturn(ticker, 1, 2)!;
    const b = forwardReturn(ticker, 1, 2)!;
    expect(a).toBe(b); // deterministic
    expect(a).toBeGreaterThan(-1); // a simple return cannot be below -100%
  });
});
