/**
 * Adaptive Scoring Engine
 * -----------------------
 * Produces SR (operational ranking) and EEP (north-star) scores, the setup
 * stage, tier, and portfolio role. Weights adapt to regime + operator profile.
 */
import type {
  SRComponents,
  RegimeState,
  ExpectationGap,
  RealityDivergence,
  Narrative,
  SetupStage,
  CandidateTier,
  PortfolioRole,
  SkepticVerdict,
} from '../domain/types';
import type { CompanyFacts } from '../connectors/types';
import { clamp, unit, weightedMean, round, toUnit } from '../domain/util';
import { effectiveWeights, POSITIVE_COMPONENTS, PENALTY_COMPONENTS } from './weights';

export { effectiveWeights, BASE_WEIGHTS } from './weights';

export interface ScoringInputs {
  company: CompanyFacts;
  regime: RegimeState;
  expectationGap: ExpectationGap;
  realityDivergence: RealityDivergence;
  narrative?: Narrative;
  preConsensusScore: number; // 0..1
  causalPositioning: number; // 0..1 from causal graph transmitted weight
  revisionsSignal: number; // -1..1
  relativeStrengthSignal: number; // -1..1
  flowSignal: number; // -1..1
  valuationEdgeSignal: number; // -1..1
  thesisSupport: number; // 0..1
  regimeFit: number; // 0..1
  profileOverrides?: Record<string, number>;
}

export function computeComponents(i: ScoringInputs): SRComponents {
  const c = i.company;
  return {
    realityDivergence: i.realityDivergence.divergenceScore,
    expectationGap: i.expectationGap.gapScore,
    regimeFit: unit(i.regimeFit),
    thesisSupport: unit(i.thesisSupport),
    causalPositioning: unit(i.causalPositioning),
    narrativeStrength: i.narrative ? i.narrative.velocity : 0.5,
    narrativeGravity: i.narrative ? i.narrative.gravity : 0.5,
    revisions: toUnit(i.revisionsSignal),
    relativeStrength: toUnit(i.relativeStrengthSignal),
    catalystQuality: unit(c.catalystQuality),
    flowSponsorship: toUnit(i.flowSignal),
    valuationVsEmbedded: toUnit(i.valuationEdgeSignal),
    balanceSheetResilience: unit(c.balanceSheet),
    liquidity: unit(c.liquidity),
    crowdingRisk: unit(c.crowding),
    fragilityRisk: unit(c.fragility),
  };
}

export function computeSRScore(
  components: SRComponents,
  regime: RegimeState,
  profileOverrides: Record<string, number> = {},
): number {
  const { weights } = effectiveWeights(regime.policy, profileOverrides);

  const positivePairs: Array<[number, number]> = POSITIVE_COMPONENTS.map((k) => [components[k], weights[k]]);
  const positiveRaw = weightedMean(positivePairs); // 0..1
  // Contrast around the neutral midpoint so genuine edge separates from noise
  // (a weighted mean of many components otherwise compresses toward 0.5).
  const positive = clamp(0.5 + (positiveRaw - 0.5) * 1.6, 0, 1);

  // Penalties scale down the score multiplicatively (regime amplifies penalties).
  const penaltyWeightSum = PENALTY_COMPONENTS.reduce((a, k) => a + weights[k], 0);
  const penalty = weightedMean(PENALTY_COMPONENTS.map((k) => [components[k], weights[k]] as [number, number]));
  const penaltyFactor = clamp(1 - penalty * clamp(penaltyWeightSum / 3, 0.2, 0.6), 0.3, 1);

  return round(unit(positive * penaltyFactor), 4);
}

/**
 * EEP (Expectation Expansion Potential) — the north star. Probability that
 * future reality exceeds embedded expectations before consensus reprices.
 * Dominated by reality divergence, expectation gap, and pre-consensus
 * earliness; discounted by crowding and how much is already embedded.
 */
export function computeEEP(i: ScoringInputs, components: SRComponents): number {
  const expansion = weightedMean([
    [i.realityDivergence.divergenceScore, 1.6],
    [i.realityDivergence.repricingPotential, 1.2],
    [i.expectationGap.gapScore, 1.5],
    [i.expectationGap.surprisePotential, 1.0],
    [i.preConsensusScore, 1.3],
    [components.causalPositioning, 0.8],
  ]);
  // The less is already embedded, the more room for expansion.
  const headroom = clamp(1 - i.company.embeddedExpectation, 0, 1);
  const crowdingDiscount = clamp(1 - components.crowdingRisk * 0.5, 0.5, 1);
  const eep = expansion * (0.6 + 0.4 * headroom) * crowdingDiscount;
  return round(unit(eep), 4);
}

export function classifySetupStage(components: SRComponents, preConsensus: number, embedded: number): SetupStage {
  const recognition = components.relativeStrength; // how much the move is recognized
  if (embedded > 0.85 && recognition > 0.7) return 'late';
  if (recognition > 0.72) return 'extended';
  if (components.revisions > 0.6 && recognition > 0.55) return 'confirmed';
  if (preConsensus > 0.55 || components.realityDivergence > 0.6) return 'emerging';
  return 'early';
}

export function classifyTier(
  eep: number,
  sr: number,
  regime: RegimeState,
  skeptic: SkepticVerdict,
  components: SRComponents,
  acceptanceOverride?: number,
): CandidateTier {
  const accept = acceptanceOverride ?? regime.policy.acceptanceThreshold;
  const evidenceWeak = components.thesisSupport < 0.35;

  if (skeptic.skepticWins && skeptic.aggregateSeverity > 0.6) return 'rejected';
  if (evidenceWeak && sr < 0.4) return 'rejected';

  // Watchlist-only regimes cap everything to tier4 unless exceptional.
  if (regime.operatingMode === 'watchlist_only') {
    return sr > 0.85 && eep > 0.8 ? 'tier3' : 'tier4';
  }
  if (regime.operatingMode === 'defensive') {
    if (components.fragilityRisk > 0.55) return 'tier4';
  }

  if (sr >= accept + 0.04 && eep >= 0.6 && !skeptic.skepticWins) return 'tier1';
  if (sr >= accept && eep >= 0.48) return 'tier2';
  if (sr >= accept - 0.14) return 'tier3';
  return 'tier4';
}

export function portfolioRoleFor(tier: CandidateTier, components: SRComponents, eep: number): PortfolioRole {
  if (tier === 'rejected' || tier === 'tier4') return 'watchlist';
  if (tier === 'tier1' && components.realityDivergence > 0.65) return 'emerging_leader';
  if (eep > 0.7 && components.crowdingRisk < 0.5) return 'asymmetric_option';
  if (components.balanceSheetResilience > 0.7 && components.thesisSupport > 0.6) return 'core_growth';
  return 'watchlist';
}
