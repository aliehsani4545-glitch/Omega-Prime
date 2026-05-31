/**
 * Backtest engine (leakage-free).
 * -------------------------------
 * At each period t we score every company using ONLY information available at t
 * (facts projected to t, deltas from t-1). Forward returns over `horizon` are
 * used solely as evaluation labels — never fed into scoring. This separation is
 * what makes the optimizer's out-of-sample improvement meaningful.
 */
import type { RegimeState, BacktestResult, BacktestPeriodResult, BacktestPick } from '../domain/types';
import { UNIVERSE } from '../connectors/universe';
import { factsAtPeriod, forwardReturn, HISTORY_PERIODS } from '../connectors/history';
import { computeExpectationGap, computeRealityDivergence } from '../intelligence/index';
import { computeComponents, computeSRScore, computeEEP } from '../scoring/index';
import { buildCausalGraph } from '../causal_graph/seed';
import { clamp, round, mean } from '../domain/util';

// Causal positioning is ~static structure; precompute once and reuse per period.
let __causal: Map<string, number> | undefined;
function causalPositioning(ticker: string): number {
  if (!__causal) {
    const g = buildCausalGraph();
    const b = g.query('driver:hyperscaler_capex', 4, 0.02);
    const max = Math.max(0.0001, ...b.map((x) => x.transmittedWeight));
    __causal = new Map(b.filter((x) => x.node.ticker).map((x) => [x.node.ticker!, x.transmittedWeight / max]));
  }
  return __causal.get(ticker) ?? 0.15;
}

/** Change-of-state scalars derived from real period-over-period deltas at t. */
function scalarsAtPeriod(ticker: string, period: number, T: number) {
  const now = factsAtPeriod(ticker, period, T);
  const prev = factsAtPeriod(ticker, Math.max(0, period - 1), T);
  if (!now || !prev) return undefined;
  return {
    revisions: clamp((now.observedReality - prev.observedReality) * 6, -1, 1),
    flow: clamp((now.observedReality - now.embeddedExpectation) * 2, -1, 1),
    valuationEdge: clamp((now.emergingReality - now.embeddedExpectation) * 2.2, -1, 1),
    relStrength: clamp((now.consensusReality - 0.5) * 2, -1, 1),
    preConsensus: clamp((now.emergingReality - now.consensusReality) * 1.8, 0, 1),
  };
}

export interface ScoredAtPeriod {
  ticker: string;
  sr: number;
  eep: number;
}

export function scoreAtPeriod(
  period: number,
  regime: RegimeState,
  overrides: Record<string, number>,
  T: number = HISTORY_PERIODS,
): ScoredAtPeriod[] {
  const out: ScoredAtPeriod[] = [];
  for (const c of UNIVERSE) {
    const facts = factsAtPeriod(c.ticker, period, T);
    const sc = scalarsAtPeriod(c.ticker, period, T);
    if (!facts || !sc) continue;
    const eg = computeExpectationGap(facts, [], []);
    const rd = computeRealityDivergence(facts, [], []);
    const inputs = {
      company: facts,
      regime,
      expectationGap: eg,
      realityDivergence: rd,
      narrative: undefined,
      preConsensusScore: sc.preConsensus,
      causalPositioning: causalPositioning(c.ticker),
      revisionsSignal: sc.revisions,
      relativeStrengthSignal: sc.relStrength,
      flowSignal: sc.flow,
      valuationEdgeSignal: sc.valuationEdge,
      thesisSupport: 0.6,
      regimeFit: 0.6,
      profileOverrides: overrides,
    };
    const components = computeComponents(inputs);
    const sr = computeSRScore(components, regime, overrides);
    const eep = computeEEP(inputs, components);
    out.push({ ticker: c.ticker, sr, eep });
  }
  return out;
}

function spearman(pairs: Array<[number, number]>): number {
  const n = pairs.length;
  if (n < 2) return 0;
  const rank = (vals: number[]): number[] => {
    const idx = vals.map((v, i) => [v, i] as [number, number]).sort((a, b) => a[0] - b[0]);
    const r = new Array<number>(n);
    idx.forEach(([, i], pos) => (r[i] = pos + 1));
    return r;
  };
  const rx = rank(pairs.map((p) => p[0]));
  const ry = rank(pairs.map((p) => p[1]));
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (rx[i]! - mx) * (ry[i]! - my);
    dx += (rx[i]! - mx) ** 2;
    dy += (ry[i]! - my) ** 2;
  }
  return dx === 0 || dy === 0 ? 0 : num / Math.sqrt(dx * dy);
}

export function evaluatePeriod(
  period: number,
  regime: RegimeState,
  overrides: Record<string, number>,
  horizon: number,
  topK: number,
  T: number = HISTORY_PERIODS,
): { result: BacktestPeriodResult; picks: BacktestPick[] } {
  const scored = scoreAtPeriod(period, regime, overrides, T)
    .map((s) => ({ ...s, fwd: forwardReturn(s.ticker, period, horizon, T) }))
    .filter((s): s is ScoredAtPeriod & { fwd: number } => s.fwd !== undefined);

  scored.sort((a, b) => b.sr - a.sr);
  const returns = scored.map((s) => s.fwd).sort((a, b) => a - b);
  const median = returns[Math.floor(returns.length / 2)] ?? 0;

  const top = scored.slice(0, topK);
  const bottom = scored.slice(-topK);
  const topReturn = mean(top.map((s) => s.fwd));
  const bottomReturn = mean(bottom.map((s) => s.fwd));
  const hitRate = top.length ? top.filter((s) => s.fwd > median).length / top.length : 0;
  const rankIC = spearman(scored.map((s) => [s.sr, s.fwd] as [number, number]));

  const picks: BacktestPick[] = top.map((s) => ({
    period,
    ticker: s.ticker,
    srScore: round(s.sr, 4),
    eep: round(s.eep, 4),
    forwardReturn: round(s.fwd, 4),
    hit: s.fwd > median,
  }));

  return {
    result: {
      period,
      topReturn: round(topReturn, 4),
      bottomReturn: round(bottomReturn, 4),
      spread: round(topReturn - bottomReturn, 4),
      hitRate: round(hitRate, 4),
      rankIC: round(rankIC, 4),
    },
    picks,
  };
}

export interface BacktestConfig {
  horizon?: number;
  topK?: number;
  periods?: number[];
  overrides?: Record<string, number>;
  T?: number;
}

export function runBacktest(regime: RegimeState, config: BacktestConfig = {}): BacktestResult {
  const T = config.T ?? HISTORY_PERIODS;
  const horizon = config.horizon ?? 3;
  const topK = config.topK ?? 5;
  const overrides = config.overrides ?? {};
  // Default: every period that has a full forward horizon available.
  const periods = config.periods ?? Array.from({ length: T - horizon }, (_, i) => i);

  const perPeriod: BacktestPeriodResult[] = [];
  const picks: BacktestPick[] = [];
  for (const t of periods) {
    const { result, picks: p } = evaluatePeriod(t, regime, overrides, horizon, topK, T);
    perPeriod.push(result);
    picks.push(...p);
  }

  return {
    generatedAt: new Date().toISOString(),
    horizon,
    topK,
    periodsEvaluated: periods,
    perPeriod,
    meanSpread: round(mean(perPeriod.map((p) => p.spread)), 4),
    meanHitRate: round(mean(perPeriod.map((p) => p.hitRate)), 4),
    meanRankIC: round(mean(perPeriod.map((p) => p.rankIC)), 4),
    picks,
  };
}
