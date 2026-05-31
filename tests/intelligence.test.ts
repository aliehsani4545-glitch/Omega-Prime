import { describe, it, expect } from 'vitest';
import { computeExpectationGap, computeRealityDivergence, computePreConsensus } from '../intelligence/index';
import { buildAllTheses, thesisIndex } from '../thesis_engine/index';
import { UNIVERSE } from '../connectors/index';
import { MockFundamentalsConnector } from '../connectors/mock/fundamentals';
import type { SignalObservation } from '../domain/types';

describe('Expectation Gap & Reality Divergence', () => {
  it('scores a larger gap when emerging reality exceeds embedded expectations', () => {
    const mu = UNIVERSE.find((c) => c.ticker === 'MU')!;
    const nvda = UNIVERSE.find((c) => c.ticker === 'NVDA')!;
    const egMu = computeExpectationGap(mu, [], []);
    const egNvda = computeExpectationGap(nvda, [], []);
    expect(egMu.gapScore).toBeGreaterThan(egNvda.gapScore);
  });

  it('reality divergence stays within [0,1] and tracks emerging-vs-consensus', () => {
    for (const c of UNIVERSE) {
      const rd = computeRealityDivergence(c, [], []);
      expect(rd.divergenceScore).toBeGreaterThanOrEqual(0);
      expect(rd.divergenceScore).toBeLessThanOrEqual(1);
    }
  });
});

describe('Thesis engine', () => {
  it('builds theses linked to companies and indexes tickers', () => {
    const theses = buildAllTheses(UNIVERSE);
    expect(theses.length).toBeGreaterThan(0);
    const idx = thesisIndex(theses);
    expect(idx.get('MU')!.length).toBeGreaterThan(0);
  });
});

describe('Pre-consensus detection', () => {
  it('rewards positive inflections with low embedded recognition', async () => {
    const conn = new MockFundamentalsConnector();
    const signals = await conn.getFundamentalSignals(new Date().toISOString());
    const byTicker = new Map<string, SignalObservation[]>();
    for (const s of signals) {
      if (!s.ticker) continue;
      const arr = byTicker.get(s.ticker) ?? [];
      arr.push(s);
      byTicker.set(s.ticker, arr);
    }
    const scores = computePreConsensus(byTicker, (t) => UNIVERSE.find((c) => c.ticker === t)?.embeddedExpectation ?? 0.5);
    expect(scores.length).toBeGreaterThan(0);
    // sorted descending
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]!.score).toBeGreaterThanOrEqual(scores[i]!.score);
    }
  });
});
