import { describe, it, expect } from 'vitest';
import { classifyRegime } from '../regime_engine/index';
import { computeComponents, computeSRScore, computeEEP, classifyTier } from '../scoring/index';
import { computeExpectationGap, computeRealityDivergence } from '../intelligence/index';
import { attackCandidate } from '../skeptic/index';
import type { CompanyFacts } from '../connectors/types';
import type { RegimeInputs } from '../domain/types';

const regimeInputs: RegimeInputs = {
  vix: 16, vixTermStructure: 0.95, yield2y: 4.3, yield10y: 4.2, rateTrend: 0.1, realYield: 1.8,
  creditSpreadProxy: 0.3, dollarTrend: 0.1, breadth: 0.5, newHighsLows: 0.2, nasdaqVsSpx: 0.3,
  spxVsRussell: 0.3, semisVsSoftware: 0.3, cyclicalsLeadership: 0, sectorRotationVelocity: 0.4,
  liquidityProxy: 0.2, earningsRevisionBreadth: 0.2, eventRiskConcentration: 0.3,
};

function company(over: Partial<CompanyFacts>): CompanyFacts {
  return {
    ticker: 'TST', name: 'Test', theme: 'semiconductors', thesisKeys: [], marketCapB: 50,
    embeddedExpectation: 0.5, consensusReality: 0.5, observedReality: 0.6, emergingReality: 0.8,
    crowding: 0.3, valuation: 0.5, balanceSheet: 0.7, liquidity: 0.7, developerGravity: 0.5,
    productAdoption: 0.6, catalystQuality: 0.7, fragility: 0.4, ...over,
  };
}

describe('Adaptive Scoring + EEP', () => {
  const regime = classifyRegime(regimeInputs);

  function inputsFor(c: CompanyFacts) {
    const eg = computeExpectationGap(c, [], []);
    const rd = computeRealityDivergence(c, [], []);
    return {
      company: c, regime, expectationGap: eg, realityDivergence: rd, narrative: undefined,
      preConsensusScore: 0.6, causalPositioning: 0.5, revisionsSignal: 0.4, relativeStrengthSignal: 0.2,
      flowSignal: 0.3, valuationEdgeSignal: 0.4, thesisSupport: 0.6, regimeFit: 0.7,
    };
  }

  it('rewards under-embedded reality divergence with higher EEP', () => {
    const underPriced = company({ embeddedExpectation: 0.4, emergingReality: 0.85, crowding: 0.3 });
    const fullyPriced = company({ embeddedExpectation: 0.9, emergingReality: 0.9, crowding: 0.85 });
    const i1 = inputsFor(underPriced);
    const i2 = inputsFor(fullyPriced);
    const eep1 = computeEEP(i1, computeComponents(i1));
    const eep2 = computeEEP(i2, computeComponents(i2));
    expect(eep1).toBeGreaterThan(eep2);
  });

  it('produces SR scores within the unit interval', () => {
    const i = inputsFor(company({}));
    const sr = computeSRScore(computeComponents(i), regime);
    expect(sr).toBeGreaterThanOrEqual(0);
    expect(sr).toBeLessThanOrEqual(1);
  });

  it('rejects a candidate when the skeptic wins decisively', () => {
    const fragile = company({ valuation: 0.95, crowding: 0.92, balanceSheet: 0.2, fragility: 0.9, embeddedExpectation: 0.95, emergingReality: 0.95 });
    const i = inputsFor(fragile);
    const comp = computeComponents(i);
    const verdict = attackCandidate('cand_TST', { company: fragile, components: comp, setupStage: 'late', regimeMismatch: 0.8, narrativeCrowdedEuphoric: true });
    expect(verdict.skepticWins).toBe(true);
    const tier = classifyTier(0.4, 0.3, regime, verdict, comp);
    expect(tier).toBe('rejected');
  });
});
