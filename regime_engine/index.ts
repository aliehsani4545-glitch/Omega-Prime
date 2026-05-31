/**
 * Market Regime Brain
 * -------------------
 * The operating system of the platform. Every downstream decision passes
 * through it. It classifies the regime from macro/microstructure inputs,
 * selects an operating mode, and rewrites signal weights and thresholds.
 *
 * Implemented as interpretable, additive feature scoring (not a black box)
 * so every regime call is explainable and auditable.
 */
import type { RegimeInputs, RegimeLabel, RegimeState, RegimePolicy, OperatingMode } from '../domain/types';
import { id, clamp, unit, nowISO, internalProvenance, round } from '../domain/util';

type FeatureScores = Partial<Record<RegimeLabel, number>>;

/** Each regime gets an interpretable additive score over the inputs. */
function rawScores(i: RegimeInputs): FeatureScores {
  const calm = clamp(1 - (i.vix - 12) / 25, 0, 1); // 1 when vol low
  const stress = clamp((i.vix - 16) / 25, 0, 1);
  const easing = clamp((i.liquidityProxy + 1) / 2, 0, 1);
  const tightening = clamp((-i.liquidityProxy + 1) / 2, 0, 1);
  const techLead = clamp((i.nasdaqVsSpx + 1) / 2, 0, 1);
  const narrowBreadth = clamp(1 - i.breadth, 0, 1);
  const goodBreadth = clamp(i.breadth, 0, 1);
  const revUp = clamp((i.earningsRevisionBreadth + 1) / 2, 0, 1);
  const revDown = clamp((-i.earningsRevisionBreadth + 1) / 2, 0, 1);
  const ratesRising = clamp((i.rateTrend + 1) / 2, 0, 1);
  const inverted = i.yield10y < i.yield2y ? 1 : 0;
  const creditStress = clamp(i.creditSpreadProxy, 0, 1);
  const backwardation = clamp((i.vixTermStructure - 0.95) / 0.4, 0, 1);
  const rotation = clamp(i.sectorRotationVelocity, 0, 1);

  return {
    ai_innovation_mania: 0.4 * techLead + 0.3 * calm + 0.2 * i.semisVsSoftware + 0.2 * narrowBreadth,
    liquidity_expansion: 0.5 * easing + 0.3 * calm + 0.2 * revUp,
    healthy_bull: 0.4 * goodBreadth + 0.3 * calm + 0.3 * revUp,
    selective_growth_leadership: 0.35 * narrowBreadth + 0.3 * techLead + 0.25 * revUp + 0.2 * rotation,
    stock_picker_market: 0.4 * rotation + 0.3 * narrowBreadth + 0.2 * calm,
    inflation_fear: 0.5 * ratesRising + 0.3 * clamp(i.realYield / 3, 0, 1) + 0.2 * revDown,
    rates_shock: 0.5 * ratesRising + 0.3 * stress + 0.3 * clamp(i.yield10y / 6, 0, 1),
    growth_scare: 0.4 * revDown + 0.3 * stress + 0.3 * (1 - techLead),
    credit_stress: 0.6 * creditStress + 0.3 * stress,
    deleveraging: 0.4 * creditStress + 0.3 * tightening + 0.3 * stress,
    volatility_shock: 0.6 * stress + 0.4 * backwardation,
    late_cycle_euphoria: 0.35 * techLead + 0.3 * calm + 0.2 * narrowBreadth + 0.15 * clamp(ratesRising, 0, 1),
    false_breakout: 0.4 * rotation + 0.3 * narrowBreadth + 0.3 * clamp(-i.newHighsLows + 0.5, 0, 1),
    early_recovery: 0.4 * revUp + 0.3 * goodBreadth + 0.3 * clamp((-i.rateTrend + 1) / 2, 0, 1),
    re_risking: 0.4 * easing + 0.3 * revUp + 0.3 * clamp((i.newHighsLows + 1) / 2, 0, 1),
    transition_phase: 0.5 * rotation + 0.3 * clamp(1 - Math.abs(i.earningsRevisionBreadth), 0, 1) + 0.2 * inverted,
  };
}

function softmax(scores: FeatureScores): FeatureScores {
  const entries = Object.entries(scores) as [RegimeLabel, number][];
  const temp = 0.08;
  const exps = entries.map(([k, v]) => [k, Math.exp(v / temp)] as [RegimeLabel, number]);
  const sum = exps.reduce((a, [, v]) => a + v, 0);
  const out: FeatureScores = {};
  for (const [k, v] of exps) out[k] = round(v / sum, 4);
  return out;
}

const DEFENSIVE_REGIMES = new Set<RegimeLabel>([
  'rates_shock',
  'growth_scare',
  'credit_stress',
  'deleveraging',
  'volatility_shock',
  'false_breakout',
]);
const WATCHLIST_REGIMES = new Set<RegimeLabel>(['late_cycle_euphoria', 'transition_phase', 'inflation_fear']);
const OFFENSIVE_REGIMES = new Set<RegimeLabel>([
  'ai_innovation_mania',
  'liquidity_expansion',
  'healthy_bull',
  'early_recovery',
  're_risking',
]);

function operatingModeFor(label: RegimeLabel, confidence: number): OperatingMode {
  if (DEFENSIVE_REGIMES.has(label)) return 'defensive';
  if (WATCHLIST_REGIMES.has(label)) return 'watchlist_only';
  if (OFFENSIVE_REGIMES.has(label)) return confidence > 0.45 ? 'offensive' : 'selective';
  return 'selective';
}

/**
 * Regime policy — how the regime rewrites downstream behaviour. Weights
 * multiply the SR-score components; thresholds gate alerts/acceptance.
 */
function derivePolicy(label: RegimeLabel, mode: OperatingMode, i: RegimeInputs): RegimePolicy {
  const base: Record<string, number> = {
    realityDivergence: 1,
    expectationGap: 1,
    regimeFit: 1,
    thesisSupport: 1,
    causalPositioning: 1,
    narrativeStrength: 1,
    narrativeGravity: 1,
    revisions: 1,
    relativeStrength: 1,
    catalystQuality: 1,
    flowSponsorship: 1,
    valuationVsEmbedded: 1,
    balanceSheetResilience: 1,
    liquidity: 1,
    crowdingRisk: 1,
    fragilityRisk: 1,
  };
  const favored: string[] = [];
  const penalized: string[] = [];

  const boost = (k: string, f: number, label2: string) => {
    base[k] = round((base[k] ?? 1) * f, 3);
    if (f > 1.05) favored.push(label2);
    if (f < 0.95) penalized.push(label2);
  };

  switch (label) {
    case 'ai_innovation_mania':
    case 'late_cycle_euphoria':
      boost('narrativeGravity', 1.25, 'narrative_gravity');
      boost('realityDivergence', 1.2, 'reality_divergence');
      boost('crowdingRisk', 1.4, 'crowding_penalty');
      boost('fragilityRisk', 1.3, 'fragility_penalty');
      boost('valuationVsEmbedded', 1.15, 'valuation_vs_embedded');
      boost('narrativeStrength', 0.9, 'narrative_velocity');
      break;
    case 'selective_growth_leadership':
    case 'stock_picker_market':
      boost('relativeStrength', 1.25, 'relative_strength');
      boost('revisions', 1.2, 'estimate_revision');
      boost('expectationGap', 1.2, 'expectation_gap');
      boost('thesisSupport', 1.1, 'thesis_support');
      boost('narrativeStrength', 0.85, 'narrative_velocity');
      break;
    case 'liquidity_expansion':
    case 're_risking':
    case 'early_recovery':
      boost('catalystQuality', 1.2, 'catalyst_quality');
      boost('flowSponsorship', 1.2, 'institutional_flow');
      boost('expectationGap', 1.15, 'expectation_gap');
      break;
    case 'inflation_fear':
    case 'rates_shock':
      boost('balanceSheetResilience', 1.35, 'balance_sheet');
      boost('valuationVsEmbedded', 1.3, 'valuation_vs_embedded');
      boost('fragilityRisk', 1.4, 'fragility_penalty');
      boost('narrativeGravity', 0.8, 'narrative_gravity');
      break;
    case 'growth_scare':
    case 'credit_stress':
    case 'deleveraging':
    case 'volatility_shock':
    case 'false_breakout':
      boost('balanceSheetResilience', 1.4, 'balance_sheet');
      boost('liquidity', 1.3, 'liquidity');
      boost('fragilityRisk', 1.6, 'fragility_penalty');
      boost('crowdingRisk', 1.5, 'crowding_penalty');
      boost('narrativeStrength', 0.7, 'narrative_velocity');
      boost('narrativeGravity', 0.7, 'narrative_gravity');
      break;
    default:
      boost('thesisSupport', 1.1, 'thesis_support');
      boost('expectationGap', 1.1, 'expectation_gap');
  }

  // Mode tunes thresholds and aggressiveness.
  const thresholds: Record<OperatingMode, { conv: number; alert: number; accept: number; aggr: number }> = {
    offensive: { conv: 0.45, alert: 0.6, accept: 0.55, aggr: 0.85 },
    selective: { conv: 0.55, alert: 0.68, accept: 0.62, aggr: 0.55 },
    defensive: { conv: 0.7, alert: 0.78, accept: 0.72, aggr: 0.2 },
    watchlist_only: { conv: 0.75, alert: 0.82, accept: 0.99, aggr: 0.1 },
  };
  const t = thresholds[mode];
  // Event-risk concentration tightens thresholds further.
  const evt = clamp(i.eventRiskConcentration * 0.1, 0, 0.1);

  return {
    signalWeights: base,
    favoredSignals: Array.from(new Set(favored)),
    penalizedSignals: Array.from(new Set(penalized)),
    convictionThreshold: round(clamp(t.conv + evt), 3),
    alertThreshold: round(clamp(t.alert + evt), 3),
    acceptanceThreshold: round(clamp(t.accept + evt), 3),
    portfolioAggressiveness: round(clamp(t.aggr - evt), 3),
  };
}

const HUMAN_LABELS: Record<RegimeLabel, string> = {
  ai_innovation_mania: 'AI Innovation Mania',
  liquidity_expansion: 'Liquidity Expansion',
  healthy_bull: 'Healthy Bull',
  selective_growth_leadership: 'Selective Growth Leadership',
  stock_picker_market: 'Stock Picker Market',
  inflation_fear: 'Inflation Fear',
  rates_shock: 'Rates Shock',
  growth_scare: 'Growth Scare',
  credit_stress: 'Credit Stress',
  deleveraging: 'Deleveraging',
  volatility_shock: 'Volatility Shock',
  late_cycle_euphoria: 'Late Cycle Euphoria',
  false_breakout: 'False Breakout Regime',
  early_recovery: 'Early Recovery',
  re_risking: 'Re-Risking',
  transition_phase: 'Transition Phase',
};

export function humanRegime(label: RegimeLabel): string {
  return HUMAN_LABELS[label];
}

function explain(label: RegimeLabel, i: RegimeInputs, mode: OperatingMode): string {
  const bits: string[] = [];
  bits.push(`VIX ${i.vix.toFixed(1)} (${i.vixTermStructure < 1 ? 'contango/calm' : 'backwardation/stress'})`);
  bits.push(`breadth ${(i.breadth * 100).toFixed(0)}% above 200dma`);
  bits.push(`earnings revisions ${i.earningsRevisionBreadth >= 0 ? 'positive' : 'negative'} (${i.earningsRevisionBreadth.toFixed(2)})`);
  bits.push(`Nasdaq/SPX RS ${i.nasdaqVsSpx.toFixed(2)}, semis/software ${i.semisVsSoftware.toFixed(2)}`);
  bits.push(`rates trend ${i.rateTrend.toFixed(2)}, credit ${i.creditSpreadProxy.toFixed(2)}`);
  return `Classified ${HUMAN_LABELS[label]} → operating mode ${mode.toUpperCase()}. Drivers: ${bits.join('; ')}.`;
}

export function classifyRegime(inputs: RegimeInputs): RegimeState {
  const normalized = softmax(rawScores(inputs));
  const sorted = (Object.entries(normalized) as [RegimeLabel, number][]).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (!top) throw new Error('regime classification produced no scores');
  const [label, confidence] = top;
  const mode = operatingModeFor(label, confidence);
  const policy = derivePolicy(label, mode, inputs);

  return {
    id: id('regime'),
    label,
    operatingMode: mode,
    explanation: explain(label, inputs, mode),
    scores: normalized,
    inputs,
    policy,
    confidence: unit(confidence),
    provenance: [internalProvenance('regime classifier (additive feature scoring)', 0.75)],
    createdAt: nowISO(),
  };
}
