/**
 * Omega Prime X — Core Domain Model
 * ----------------------------------
 * Theses are primary objects. Companies/equities are linked to theses.
 * Every significant object carries provenance, confidence, and timestamps.
 *
 * North Star: EEP (Expectation Expansion Potential) — the probability that
 * future business reality will exceed what is currently embedded in market
 * expectations, before broad consensus repricing.
 */

// ----------------------------------------------------------------------------
// Primitives & shared value objects
// ----------------------------------------------------------------------------

/** A value in [0,1]. */
export type Unit = number;

export type ISODate = string;

export type SourceCategory =
  | 'market_data'
  | 'fundamentals'
  | 'earnings_transcript'
  | 'news'
  | 'options'
  | 'etf_flows'
  | 'open_source'
  | 'developer_ecosystem'
  | 'hiring'
  | 'patents'
  | 'regulatory'
  | 'industry_report'
  | 'supplier_commentary'
  | 'customer_commentary'
  | 'product_launch'
  | 'internal_model'
  | 'operator';

/**
 * Provenance — where a datum came from and how much we trust it.
 * Provenance > Confidence Theater: every claim is traceable.
 */
export interface Provenance {
  source: SourceCategory;
  sourceId: string; // connector id or operator id
  reference?: string; // url, filing id, ticker, etc.
  observedAt: ISODate;
  freshnessDays: number; // age of the underlying reality at observation
  reliability: Unit; // trust in this source
  note?: string;
}

export interface Confidenced {
  confidence: Unit;
  provenance: Provenance[];
}

// ----------------------------------------------------------------------------
// Market Regime Brain
// ----------------------------------------------------------------------------

export type RegimeLabel =
  | 'ai_innovation_mania'
  | 'liquidity_expansion'
  | 'healthy_bull'
  | 'selective_growth_leadership'
  | 'stock_picker_market'
  | 'inflation_fear'
  | 'rates_shock'
  | 'growth_scare'
  | 'credit_stress'
  | 'deleveraging'
  | 'volatility_shock'
  | 'late_cycle_euphoria'
  | 'false_breakout'
  | 'early_recovery'
  | 're_risking'
  | 'transition_phase';

export type OperatingMode = 'offensive' | 'selective' | 'defensive' | 'watchlist_only';

/** Raw macro / market microstructure inputs to the regime brain. */
export interface RegimeInputs {
  vix: number;
  vixTermStructure: number; // front/back ratio; <1 contango (calm), >1 backwardation (stress)
  yield2y: number;
  yield10y: number;
  rateTrend: number; // -1..1 (falling..rising)
  realYield: number;
  creditSpreadProxy: number; // bps proxy (e.g. HYG/LQD inverse) higher = more stress
  dollarTrend: number; // -1..1
  breadth: number; // 0..1 fraction of names above 200dma
  newHighsLows: number; // -1..1 net
  nasdaqVsSpx: number; // relative strength -1..1
  spxVsRussell: number; // -1..1 (large vs small)
  semisVsSoftware: number; // -1..1 leadership tilt
  cyclicalsLeadership: number; // -1..1
  sectorRotationVelocity: number; // 0..1
  liquidityProxy: number; // -1..1 (tightening..easing)
  earningsRevisionBreadth: number; // -1..1
  eventRiskConcentration: number; // 0..1 (e.g. clustered macro prints / earnings)
}

/** How the active regime rewrites downstream behaviour. */
export interface RegimePolicy {
  /** Multiplicative weight overrides applied to SR-score components. */
  signalWeights: Record<string, number>;
  /** Signal families the regime favors / penalizes. */
  favoredSignals: string[];
  penalizedSignals: string[];
  convictionThreshold: Unit; // min conviction to act
  alertThreshold: Unit; // min SR to alert
  acceptanceThreshold: Unit; // min SR to accept into a tier
  portfolioAggressiveness: Unit; // 0 (defensive) .. 1 (offensive)
}

export interface RegimeState extends Confidenced {
  id: string;
  label: RegimeLabel;
  operatingMode: OperatingMode;
  explanation: string;
  scores: Partial<Record<RegimeLabel, number>>; // classifier scores per regime
  inputs: RegimeInputs;
  policy: RegimePolicy;
  createdAt: ISODate;
}

// ----------------------------------------------------------------------------
// Signals (the observation substrate)
// ----------------------------------------------------------------------------

export type SignalDirection = 'bullish' | 'bearish' | 'neutral';

/** A normalized, time-stamped observation produced by a connector or agent. */
export interface SignalObservation extends Confidenced {
  id: string;
  family: string; // e.g. 'hyperscaler_capex', 'estimate_revision', 'relative_strength'
  name: string;
  ticker?: string;
  thesisId?: string;
  value: number; // normalized -1..1 (state) where useful
  velocity: number; // rate of change -1..1 (change-of-state for pre-consensus)
  direction: SignalDirection;
  isInflection: boolean; // pre-consensus change-of-state flag
  observedAt: ISODate;
}

// ----------------------------------------------------------------------------
// Theses (primary objects)
// ----------------------------------------------------------------------------

export type ThesisStatus =
  | 'emerging'
  | 'strengthening'
  | 'accelerating'
  | 'crowded'
  | 'weakening'
  | 'broken'
  | 'archived';

export type ThesisCategory =
  | 'ai_compute'
  | 'ai_infrastructure'
  | 'semiconductors'
  | 'memory_storage'
  | 'networking_optical'
  | 'power_grid_cooling'
  | 'software_platform'
  | 'energy'
  | 'industrial_automation'
  | 'healthcare_innovation'
  | 'security'
  | 'other';

export interface EvidenceItem extends Confidenced {
  id: string;
  statement: string;
  supports: boolean; // true=supporting, false=disconfirming
  weight: Unit;
  observedAt: ISODate;
}

export interface ThesisHistoryEntry {
  at: ISODate;
  status: ThesisStatus;
  confidence: Unit;
  conviction: Unit;
  note: string;
  trigger?: string;
}

export interface Thesis extends Confidenced {
  id: string;
  identity: string; // short canonical name
  category: ThesisCategory;
  description: string;

  evidence: EvidenceItem[];
  disconfirming: EvidenceItem[];
  risks: string[];

  conviction: Unit;
  confidenceVelocity: number; // -1..1
  convictionVelocity: number; // -1..1

  invalidation: string[]; // conditions that break the thesis
  regimeSensitivity: Partial<Record<RegimeLabel, number>>; // -1..1 fit per regime
  crowding: Unit; // 0 (uncrowded) .. 1 (euphoric)

  supportingSignals: string[]; // signal families
  leadIndicators: string[];
  laggingIndicators: string[];
  beneficiaryNetwork: string[]; // tickers / node ids

  timeHorizonDays: number;
  status: ThesisStatus;

  linkedCompanies: string[]; // tickers
  history: ThesisHistoryEntry[];

  createdAt: ISODate;
  updatedAt: ISODate;
}

// ----------------------------------------------------------------------------
// Expectation Gap & Reality Divergence engines
// ----------------------------------------------------------------------------

export interface ExpectationGap extends Confidenced {
  id: string;
  ticker: string;
  thesisIds: string[];
  embeddedExpectation: number; // what price/valuation implies (normalized)
  observedReality: number; // what fundamentals/flows show now
  emergingReality: number; // leading-edge signals
  gapScore: Unit; // size of the (emerging - embedded) gap, normalized
  surprisePotential: Unit;
  createdAt: ISODate;
}

export interface RealityDivergence extends Confidenced {
  id: string;
  ticker: string;
  thesisIds: string[];
  consensusReality: number;
  observedReality: number;
  emergingReality: number;
  divergenceScore: Unit; // highest-priority intelligence signal
  surprisePotential: Unit;
  repricingPotential: Unit;
  createdAt: ISODate;
}

// ----------------------------------------------------------------------------
// Technological Inevitability & Information Advantage
// ----------------------------------------------------------------------------

export type InevitabilityStage = 'emerging' | 'accelerating' | 'becoming_inevitable' | 'crowded';

export interface Inevitability extends Confidenced {
  id: string;
  name: string;
  description: string;
  stage: InevitabilityStage;
  drivers: {
    adoptionAcceleration: Unit;
    capitalFormation: Unit;
    developerGravity: Unit;
    talentMigration: Unit;
    supplyConstraint: Unit;
    infrastructureDependence: Unit;
    ecosystemLockIn: Unit;
    strategicNecessity: Unit;
    networkEffects: Unit;
  };
  bottlenecks: string[]; // node ids that gate the inevitability
  firstOrderBeneficiaries: string[]; // tickers
  secondOrderBeneficiaries: string[];
  thirdOrderBeneficiaries: string[];
  hiddenConstraints: string[];
  linkedThesisIds: string[];
  createdAt: ISODate;
}

export interface InformationAdvantageSignal extends Confidenced {
  id: string;
  origin: SourceCategory;
  description: string;
  freshnessDays: number;
  preConsensusProbability: Unit; // odds this is not yet priced
  decayDays: number; // persistence estimate
  affectedThesisIds: string[];
  affectedTickers: string[];
  affectedIndustries: string[];
  createdAt: ISODate;
}

// ----------------------------------------------------------------------------
// Narrative engines
// ----------------------------------------------------------------------------

export type NarrativeClass =
  | 'fad'
  | 'early_emerging'
  | 'durable_ecosystem_forming'
  | 'saturated'
  | 'crowded_euphoric';

export interface Narrative extends Confidenced {
  id: string;
  name: string;
  thesisIds: string[];
  velocity: Unit; // spread speed
  gravity: Unit; // pull on capital/devs/founders/customers/partners/media
  classification: NarrativeClass;
  pullSources: {
    capital: Unit;
    developers: Unit;
    founders: Unit;
    customers: Unit;
    partners: Unit;
    media: Unit;
    researchers: Unit;
  };
  createdAt: ISODate;
}

// ----------------------------------------------------------------------------
// Causal Graph
// ----------------------------------------------------------------------------

export type CausalNodeType =
  | 'technology'
  | 'infrastructure'
  | 'supplier'
  | 'customer'
  | 'capital_flow'
  | 'physical_constraint'
  | 'labor_constraint'
  | 'energy_requirement'
  | 'ecosystem_dependency'
  | 'public_company'
  | 'bottleneck';

export interface CausalNode {
  id: string;
  type: CausalNodeType;
  label: string;
  ticker?: string;
  meta?: Record<string, unknown>;
}

export interface CausalEdge extends Confidenced {
  id: string;
  from: string; // node id
  to: string; // node id
  relation: string; // e.g. 'drives_demand_for', 'is_bottleneck_for', 'benefits_from'
  weight: Unit; // strength of causal transmission
  decay: Unit; // 0..1 how quickly confidence decays without fresh evidence
  evidence: EvidenceItem[];
  updatedAt: ISODate;
}

export interface CausalPath {
  nodes: CausalNode[];
  edges: CausalEdge[];
  order: number; // number of hops
  transmittedWeight: number; // product of edge weights along the path
}

// ----------------------------------------------------------------------------
// Skeptic / Contrarian Attack
// ----------------------------------------------------------------------------

export type SkepticAngle =
  | 'overvaluation'
  | 'crowding'
  | 'weak_cash_flow'
  | 'customer_concentration'
  | 'accounting_concern'
  | 'hype_without_leverage'
  | 'technical_exhaustion'
  | 'positioning_vulnerability'
  | 'dilution_risk'
  | 'debt_risk'
  | 'geopolitical_exposure'
  | 'cyclical_false_dawn'
  | 'narrative_saturation'
  | 'regime_mismatch';

export interface SkepticObjection extends Confidenced {
  id: string;
  targetType: 'thesis' | 'candidate';
  targetId: string;
  angle: SkepticAngle;
  statement: string;
  severity: Unit; // 0..1
  refuted: boolean;
  createdAt: ISODate;
}

export interface SkepticVerdict {
  targetId: string;
  objections: SkepticObjection[];
  aggregateSeverity: Unit;
  skepticWins: boolean; // if true -> downgrade/reject
  confidencePenalty: Unit;
  convictionPenalty: Unit;
}

// ----------------------------------------------------------------------------
// Scoring & Candidates
// ----------------------------------------------------------------------------

/** The component sub-scores that feed the SR (operational ranking) score. */
export interface SRComponents {
  realityDivergence: Unit;
  expectationGap: Unit;
  regimeFit: Unit;
  thesisSupport: Unit;
  causalPositioning: Unit;
  narrativeStrength: Unit;
  narrativeGravity: Unit;
  revisions: Unit;
  relativeStrength: Unit;
  catalystQuality: Unit;
  flowSponsorship: Unit;
  valuationVsEmbedded: Unit;
  balanceSheetResilience: Unit;
  liquidity: Unit;
  crowdingRisk: Unit; // penalty component (higher = worse)
  fragilityRisk: Unit; // penalty component (higher = worse)
}

export type SetupStage = 'early' | 'emerging' | 'confirmed' | 'extended' | 'late';
export type CandidateTier = 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'rejected';
export type PortfolioRole = 'emerging_leader' | 'core_growth' | 'asymmetric_option' | 'watchlist' | 'hedge_avoid';

export interface Candidate extends Confidenced {
  id: string;
  ticker: string;
  company: string;
  theme: string;
  thesisIds: string[];

  eep: Unit; // North Star
  srScore: Unit; // operational ranking score
  components: SRComponents;
  regimeFit: Unit;
  evidenceQuality: Unit;

  setupStage: SetupStage;
  tier: CandidateTier;

  whyNow: string;
  whyNotObvious: string;
  supportingThesis: string;
  contrarianRisks: string[];
  catalysts: string[];
  invalidationTriggers: string[];
  crowdingRisk: Unit;

  conviction: Unit;
  portfolioRole: PortfolioRole;
  timeHorizonDays: number;
  catalystWindowDays: number;

  skepticVerdict?: SkepticVerdict;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ----------------------------------------------------------------------------
// Agents
// ----------------------------------------------------------------------------

export type AgentStatus = 'ok' | 'low_confidence' | 'contradiction' | 'escalated' | 'error';

export interface AgentContext {
  regime: RegimeState;
  signals: SignalObservation[];
  theses: Thesis[];
  asOf: ISODate;
}

/** Typed output contract every specialist agent must satisfy. */
export interface AgentOutput<T = unknown> extends Confidenced {
  agent: string;
  status: AgentStatus;
  summary: string;
  signals: SignalObservation[];
  data: T;
  contradictions: string[];
  escalate: boolean;
  producedAt: ISODate;
}

// ----------------------------------------------------------------------------
// Memory, Audit, Learning, Alerts
// ----------------------------------------------------------------------------

export interface AuditEvent {
  id: string;
  at: ISODate;
  actor: string; // agent / engine / operator
  action: string;
  targetType: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
  note?: string;
}

export type AlertSeverity = 'info' | 'watch' | 'elevated' | 'urgent';

export interface Alert {
  id: string;
  at: ISODate;
  severity: AlertSeverity;
  title: string;
  body: string;
  tickers: string[];
  thesisIds: string[];
  srScore?: number;
  acknowledged: boolean;
}

export type LearningOutcome = 'pending' | 'hit' | 'miss' | 'false_positive' | 'missed_opportunity' | 'crowded_late';

export interface LearningRecord {
  id: string;
  createdAt: ISODate;
  subjectType: 'candidate' | 'thesis';
  subjectId: string;
  ticker?: string;
  regimeAtCreation: RegimeLabel;
  convictionAtCreation: Unit;
  confidenceAtCreation: Unit;
  citedDrivers: string[];
  citedRisks: string[];
  contributingAgents: string[];
  outcome: LearningOutcome;
  realizedReturn?: number; // optional, post-hoc
  note?: string;
}

export interface WeightRecommendation {
  component: keyof SRComponents | string;
  currentWeight: number;
  recommendedWeight: number;
  rationale: string;
}

export interface AgentValueAssessment {
  agent: string;
  hitRate: Unit;
  noiseRate: Unit;
  netValue: number; // -1..1
  recommendation: 'keep' | 'tune' | 'deprioritize' | 'retire';
}

export interface LearningReport {
  generatedAt: ISODate;
  sampleSize: number;
  hitRate: Unit;
  falsePositiveRate: Unit;
  weightRecommendations: WeightRecommendation[];
  agentAssessments: AgentValueAssessment[];
  thresholdRecommendations: { name: string; current: number; recommended: number; rationale: string }[];
  proposedNewAgents: string[];
  notes: string[];
}

// ----------------------------------------------------------------------------
// Temporal layer (history) — enables true change-of-state + backtesting
// ----------------------------------------------------------------------------

/** One period of (synthetic) ground-truth reality for a company. */
export interface RealityPeriod {
  period: number; // 0..T-1 (older → newer)
  trueReality: number; // 0..1 the actual business reality at t
  consensusReality: number; // 0..1 what consensus believes at t (lags truth)
  observedReality: number; // 0..1 measurable fundamentals at t
  embedded: number; // 0..1 price/valuation proxy at t (what is priced in)
  priceIndex: number; // normalized price level (for forward-return labels)
}

export interface CompanyHistory {
  ticker: string;
  periods: RealityPeriod[];
}

// ----------------------------------------------------------------------------
// Backtesting & adaptive weight optimization (the closed learning loop)
// ----------------------------------------------------------------------------

/** Result of evaluating a single ranked candidate against realized forward returns. */
export interface BacktestPick {
  period: number;
  ticker: string;
  srScore: number;
  eep: number;
  forwardReturn: number; // realized return over the horizon (label; eval-only)
  hit: boolean; // forwardReturn above the cross-sectional median
}

export interface BacktestPeriodResult {
  period: number;
  topReturn: number; // mean forward return of top-K by SR
  bottomReturn: number; // mean forward return of bottom-K by SR
  spread: number; // topReturn - bottomReturn (the strategy edge)
  hitRate: Unit; // fraction of top-K that were hits
  rankIC: number; // Spearman rank correlation(SR, forwardReturn) in [-1,1]
}

export interface BacktestResult {
  generatedAt: ISODate;
  horizon: number;
  topK: number;
  periodsEvaluated: number[];
  perPeriod: BacktestPeriodResult[];
  meanSpread: number;
  meanHitRate: Unit;
  meanRankIC: number;
  picks: BacktestPick[];
}

/** Component weight multipliers learned by the optimizer (operator-gated). */
export interface LearnedWeights {
  multipliers: Record<string, number>; // keyed by SRComponents key
  trainedAt: ISODate;
  objective: string;
}

export interface OptimizationResult {
  learned: LearnedWeights;
  baseline: { trainSpread: number; valSpread: number; trainHitRate: number; valHitRate: number; valRankIC: number };
  optimized: { trainSpread: number; valSpread: number; trainHitRate: number; valHitRate: number; valRankIC: number };
  improvementValSpread: number; // optimized.valSpread - baseline.valSpread (out-of-sample)
  iterations: number;
  trainPeriods: number[];
  valPeriods: number[];
  changedComponents: { component: string; from: number; to: number }[];
  notes: string[];
}

// ----------------------------------------------------------------------------
// Agent debate / reconciliation (Bull vs Skeptic → resolved conviction delta)
// ----------------------------------------------------------------------------

export interface DebateArgument {
  side: 'bull' | 'skeptic';
  claim: string;
  strength: Unit; // confidence-weighted force of the argument
}

export interface DebateVerdict {
  ticker: string;
  rounds: DebateArgument[];
  bullForce: Unit;
  skepticForce: Unit;
  winner: 'bull' | 'skeptic' | 'contested';
  convictionDelta: number; // -1..1 adjustment applied to conviction
  rationale: string;
}
