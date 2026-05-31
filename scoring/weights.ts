/**
 * Base SR-score component weights and the adaptive weighting pipeline.
 * Effective weight = base * regimePolicyMultiplier * profileOverride.
 * Penalty components (crowdingRisk, fragilityRisk) subtract from the score.
 */
import type { SRComponents, RegimePolicy } from '../domain/types';
import { clamp } from '../domain/util';

export const POSITIVE_COMPONENTS: Array<keyof SRComponents> = [
  'realityDivergence',
  'expectationGap',
  'regimeFit',
  'thesisSupport',
  'causalPositioning',
  'narrativeStrength',
  'narrativeGravity',
  'revisions',
  'relativeStrength',
  'catalystQuality',
  'flowSponsorship',
  'valuationVsEmbedded',
  'balanceSheetResilience',
  'liquidity',
];

export const PENALTY_COMPONENTS: Array<keyof SRComponents> = ['crowdingRisk', 'fragilityRisk'];

/** Base weights reflect first principles: divergence & expectation gaps lead. */
export const BASE_WEIGHTS: Record<keyof SRComponents, number> = {
  realityDivergence: 1.6,
  expectationGap: 1.5,
  regimeFit: 1.2,
  thesisSupport: 1.1,
  causalPositioning: 1.0,
  narrativeStrength: 0.7,
  narrativeGravity: 0.9,
  revisions: 1.1,
  relativeStrength: 1.0,
  catalystQuality: 0.9,
  flowSponsorship: 0.8,
  valuationVsEmbedded: 1.0,
  balanceSheetResilience: 0.7,
  liquidity: 0.5,
  crowdingRisk: 1.2, // penalty magnitude
  fragilityRisk: 1.1, // penalty magnitude
};

export interface EffectiveWeights {
  weights: Record<keyof SRComponents, number>;
}

export function effectiveWeights(
  policy: RegimePolicy,
  profileOverrides: Record<string, number> = {},
): EffectiveWeights {
  const weights = {} as Record<keyof SRComponents, number>;
  for (const key of Object.keys(BASE_WEIGHTS) as Array<keyof SRComponents>) {
    const base = BASE_WEIGHTS[key];
    const regimeMult = policy.signalWeights[key] ?? 1;
    const override = profileOverrides[key] ?? 1;
    weights[key] = clamp(base * regimeMult * override, 0, 6);
  }
  return { weights };
}
