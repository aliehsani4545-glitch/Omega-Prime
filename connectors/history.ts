/**
 * Temporal data layer
 * --------------------
 * Generates deterministic multi-period reality trajectories per company so the
 * engines can measure TRUE change-of-state (real deltas) and the backtester can
 * evaluate forward returns.
 *
 * The synthetic world deliberately embodies the platform's core hypothesis:
 *   price (embedded) chases consensus, which lags true reality.
 * Where true reality has run ahead of what is embedded, the gap tends to close
 * over the following periods → positive forward return. Crowded names mean-revert.
 * Noise is added so the relationship is real but not trivial — leaving room for
 * the optimizer to discover which SR components actually predict returns.
 *
 * This validates the MACHINERY (does the scoring rank future winners?), not the
 * market. See docs/UPGRADE_PATHS.md and CHANGELOG.md for the honesty note.
 */
import type { CompanyHistory, RealityPeriod } from '../domain/types';
import type { CompanyFacts } from './types';
import { UNIVERSE, companyByTicker } from './universe';
import { mulberry32, hashString, clamp } from '../domain/util';

export const HISTORY_PERIODS = 16;

function buildCompanyHistory(c: CompanyFacts, T: number): CompanyHistory {
  const rnd = mulberry32(hashString('hist:' + c.ticker));
  const periods: RealityPeriod[] = [];

  // True reality drifts from an earlier level toward the company's emerging
  // reality (where it is heading), with stochastic steps.
  const target = c.emergingReality;
  let trueR = clamp(target - 0.18 - rnd() * 0.12, 0.05, 0.95);
  let consensus = clamp(trueR - 0.08, 0.05, 0.95);
  let embedded = clamp(consensus - 0.05, 0.05, 0.98);
  let price = 100;

  const drift = (target - trueR) / T; // per-period pull toward target
  const alphaConsensus = 0.3; // consensus catches up to truth (lag)
  const betaPrice = 0.45; // price catches up to consensus
  // Crowded names get a reversion headwind on price.
  const crowdHeadwind = (c.crowding - 0.5) * 0.6;

  for (let t = 0; t < T; t++) {
    // True reality: drift toward target + noise.
    trueR = clamp(trueR + drift + (rnd() - 0.5) * 0.05, 0.03, 0.99);
    // Consensus lags truth.
    consensus = clamp(consensus + alphaConsensus * (trueR - consensus) + (rnd() - 0.5) * 0.03, 0.03, 0.99);
    // Observed sits between consensus and truth.
    const observed = clamp((consensus + trueR) / 2 + (rnd() - 0.5) * 0.03, 0.03, 0.99);
    // Price/embedded chases consensus, with crowding reversion + noise.
    const priceDelta = betaPrice * (consensus - embedded) - crowdHeadwind * 0.04 + (rnd() - 0.5) * 0.04;
    embedded = clamp(embedded + priceDelta, 0.03, 0.99);
    // Price index compounds the same delta proportionally (return proxy).
    price = price * (1 + priceDelta * 0.9 + (rnd() - 0.5) * 0.015);

    periods.push({
      period: t,
      trueReality: trueR,
      consensusReality: consensus,
      observedReality: observed,
      embedded,
      priceIndex: price,
    });
  }
  return { ticker: c.ticker, periods };
}

let __cache: CompanyHistory[] | undefined;
export function buildHistory(T: number = HISTORY_PERIODS): CompanyHistory[] {
  if (__cache && __cache[0]?.periods.length === T) return __cache;
  __cache = UNIVERSE.map((c) => buildCompanyHistory(c, T));
  return __cache;
}

export function historyFor(ticker: string, T: number = HISTORY_PERIODS): CompanyHistory | undefined {
  return buildHistory(T).find((h) => h.ticker === ticker);
}

/**
 * Project a company's facts AS OF a given period, using only information
 * available at t. emergingReality = the leading-edge true reality at t;
 * embeddedExpectation = what is priced at t. This lets the existing engines
 * (expectation gap, reality divergence, scoring) run unchanged at any period.
 */
export function factsAtPeriod(ticker: string, period: number, T: number = HISTORY_PERIODS): CompanyFacts | undefined {
  const base = companyByTicker(ticker);
  const hist = historyFor(ticker, T);
  if (!base || !hist) return undefined;
  const p = hist.periods[Math.max(0, Math.min(period, hist.periods.length - 1))];
  if (!p) return undefined;
  return {
    ...base,
    embeddedExpectation: p.embedded,
    consensusReality: p.consensusReality,
    observedReality: p.observedReality,
    emergingReality: p.trueReality,
    valuation: clamp(0.4 + p.embedded * 0.5, 0, 1),
    catalystQuality: clamp((p.trueReality - p.embedded) * 1.6 + 0.5, 0, 1),
  };
}

/** Realized forward return over `horizon` periods (eval-only label). */
export function forwardReturn(ticker: string, period: number, horizon: number, T: number = HISTORY_PERIODS): number | undefined {
  const hist = historyFor(ticker, T);
  if (!hist) return undefined;
  const now = hist.periods[period];
  const fut = hist.periods[period + horizon];
  if (!now || !fut) return undefined;
  return fut.priceIndex / now.priceIndex - 1;
}
