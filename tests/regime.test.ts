import { describe, it, expect } from 'vitest';
import { classifyRegime } from '../regime_engine/index';
import type { RegimeInputs } from '../domain/types';

const baseline: RegimeInputs = {
  vix: 16,
  vixTermStructure: 0.95,
  yield2y: 4.3,
  yield10y: 4.2,
  rateTrend: 0.1,
  realYield: 1.8,
  creditSpreadProxy: 0.3,
  dollarTrend: 0.1,
  breadth: 0.5,
  newHighsLows: 0.2,
  nasdaqVsSpx: 0.3,
  spxVsRussell: 0.3,
  semisVsSoftware: 0.3,
  cyclicalsLeadership: 0,
  sectorRotationVelocity: 0.4,
  liquidityProxy: 0.2,
  earningsRevisionBreadth: 0.2,
  eventRiskConcentration: 0.3,
};

describe('Market Regime Brain', () => {
  it('classifies a regime with a normalized confidence and explanation', () => {
    const r = classifyRegime(baseline);
    expect(r.label).toBeTruthy();
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
    expect(r.explanation.length).toBeGreaterThan(10);
    const total = Object.values(r.scores).reduce((a, b) => a + (b ?? 0), 0);
    expect(total).toBeCloseTo(1, 1);
  });

  it('selects a defensive/watchlist posture under a volatility shock', () => {
    const shock = classifyRegime({ ...baseline, vix: 38, vixTermStructure: 1.3, creditSpreadProxy: 0.8, breadth: 0.2, earningsRevisionBreadth: -0.4 });
    expect(['defensive', 'watchlist_only', 'selective']).toContain(shock.operatingMode);
    expect(shock.policy.acceptanceThreshold).toBeGreaterThan(0.6);
  });

  it('rewrites signal weights via policy (penalizes fragility in stress)', () => {
    const stress = classifyRegime({ ...baseline, vix: 34, creditSpreadProxy: 0.85, breadth: 0.25 });
    expect(stress.policy.signalWeights.fragilityRisk).toBeGreaterThan(1);
  });

  it('goes offensive in a clear liquidity-expansion / mania setup', () => {
    const risk = classifyRegime({ ...baseline, vix: 12, vixTermStructure: 0.85, liquidityProxy: 0.9, nasdaqVsSpx: 0.8, semisVsSoftware: 0.8, breadth: 0.35, earningsRevisionBreadth: 0.5 });
    expect(['offensive', 'selective']).toContain(risk.operatingMode);
  });
});
