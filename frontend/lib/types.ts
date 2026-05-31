// Omega Prime X — Shared TypeScript types (mirrors backend shapes, all fields optional/loose)

export interface HealthStatus {
  status?: string;
  lastRunAt?: string;
  dataBackend?: string;
}

export type OperatingMode = 'offensive' | 'selective' | 'defensive' | 'watchlist_only';

export interface RegimePolicy {
  favoredSignals?: string[];
  penalizedSignals?: string[];
  acceptanceThreshold?: number;
  alertThreshold?: number;
  convictionThreshold?: number;
  portfolioAggressiveness?: number;
  signalWeights?: Record<string, number>;
}

export interface RegimeState {
  id?: string;
  label?: string;
  operatingMode?: OperatingMode;
  explanation?: string;
  confidence?: number;
  scores?: Record<string, number>;
  policy?: RegimePolicy;
  at?: string;
}

export type ThesisStatus =
  | 'emerging'
  | 'strengthening'
  | 'accelerating'
  | 'crowded'
  | 'weakening'
  | 'broken'
  | 'archived';

export interface ThesisHistoryEntry {
  at?: string;
  status?: ThesisStatus;
  confidence?: number;
  conviction?: number;
  note?: string;
}

export interface Evidence {
  statement?: string;
  confidence?: number;
}

export interface Disconfirming {
  statement?: string;
}

export interface Thesis {
  id?: string;
  identity?: string;
  category?: string;
  description?: string;
  status?: ThesisStatus;
  conviction?: number;
  confidence?: number;
  crowding?: number;
  confidenceVelocity?: number;
  convictionVelocity?: number;
  risks?: string[];
  evidence?: Evidence[];
  disconfirming?: Disconfirming[];
  invalidation?: string[];
  linkedCompanies?: string[];
  leadIndicators?: string[];
  laggingIndicators?: string[];
  supportingSignals?: string[];
  regimeSensitivity?: Record<string, number>;
  timeHorizonDays?: number;
  history?: ThesisHistoryEntry[];
}

export type SetupStage = 'early' | 'emerging' | 'confirmed' | 'extended' | 'late';
export type CandidateTier = 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'rejected';

export interface SkepticObjection {
  angle?: string;
  statement?: string;
  severity?: number;
  refuted?: boolean;
}

export interface SkepticVerdict {
  objections?: SkepticObjection[];
  aggregateSeverity?: number;
  skepticWins?: boolean;
}

export interface Candidate {
  id?: string;
  ticker?: string;
  company?: string;
  theme?: string;
  thesisIds?: string[];
  eep?: number;
  srScore?: number;
  regimeFit?: number;
  evidenceQuality?: number;
  setupStage?: SetupStage;
  tier?: CandidateTier;
  whyNow?: string;
  whyNotObvious?: string;
  supportingThesis?: string;
  contrarianRisks?: string[];
  catalysts?: string[];
  invalidationTriggers?: string[];
  crowdingRisk?: number;
  conviction?: number;
  confidence?: number;
  portfolioRole?: string;
  timeHorizonDays?: number;
  catalystWindowDays?: number;
  components?: Record<string, number>;
  skepticVerdict?: SkepticVerdict;
}

export type NarrativeClassification =
  | 'fad'
  | 'early_emerging'
  | 'durable_ecosystem_forming'
  | 'saturated'
  | 'crowded_euphoric';

export interface NarrativePullSources {
  capital?: number;
  developers?: number;
  founders?: number;
  customers?: number;
  partners?: number;
  media?: number;
  researchers?: number;
}

export interface Narrative {
  name?: string;
  thesisIds?: string[];
  velocity?: number;
  gravity?: number;
  classification?: NarrativeClassification;
  pullSources?: NarrativePullSources;
}

export type InevitabilityStage = 'emerging' | 'accelerating' | 'becoming_inevitable' | 'crowded';

export interface Inevitability {
  name?: string;
  description?: string;
  stage?: InevitabilityStage;
  drivers?: Record<string, number>;
  bottlenecks?: string[];
  firstOrderBeneficiaries?: string[];
  secondOrderBeneficiaries?: string[];
  thirdOrderBeneficiaries?: string[];
  hiddenConstraints?: string[];
  confidence?: number;
}

export interface ExpectationGap {
  ticker?: string;
  embeddedExpectation?: number;
  observedReality?: number;
  emergingReality?: number;
  gapScore?: number;
  surprisePotential?: number;
  confidence?: number;
}

export interface RealityDivergence {
  ticker?: string;
  consensusReality?: number;
  observedReality?: number;
  emergingReality?: number;
  divergenceScore?: number;
  surprisePotential?: number;
  repricingPotential?: number;
  confidence?: number;
}

export interface InformationAdvantage {
  origin?: string;
  description?: string;
  freshnessDays?: number;
  preConsensusProbability?: number;
  decayDays?: number;
  affectedTickers?: string[];
  affectedIndustries?: string[];
}

export type SignalDirection = 'bullish' | 'bearish' | 'neutral';

export interface SignalObservation {
  id?: string;
  family?: string;
  name?: string;
  ticker?: string;
  value?: number;
  velocity?: number;
  direction?: SignalDirection;
  isInflection?: boolean;
  confidence?: number;
  observedAt?: string;
}

export interface SkepticEntry {
  id?: string;
  targetId?: string;
  angle?: string;
  statement?: string;
  severity?: number;
  refuted?: boolean;
}

export interface CausalNode {
  id?: string;
  type?: string;
  label?: string;
  ticker?: string;
}

export interface CausalEdge {
  id?: string;
  from?: string;
  to?: string;
  relation?: string;
  weight?: number;
  confidence?: number;
}

export interface CausalGraph {
  nodes?: CausalNode[];
  edges?: CausalEdge[];
}

export interface CausalBeneficiary {
  node?: CausalNode;
  order?: number;
  transmittedWeight?: number;
  viaRelations?: string[];
}

export interface CausalQueryResult {
  from?: string;
  beneficiaries?: CausalBeneficiary[];
  bottlenecks?: CausalBeneficiary[];
}

export type AlertSeverity = 'info' | 'watch' | 'elevated' | 'urgent';

export interface Alert {
  id?: string;
  at?: string;
  severity?: AlertSeverity;
  title?: string;
  body?: string;
  tickers?: string[];
  thesisIds?: string[];
  srScore?: number;
  acknowledged?: boolean;
}

export interface WeightRecommendation {
  component?: string;
  currentWeight?: number;
  recommendedWeight?: number;
  rationale?: string;
}

export interface AgentAssessment {
  agent?: string;
  hitRate?: number;
  noiseRate?: number;
  netValue?: number;
  recommendation?: string;
}

export interface ThresholdRecommendation {
  name?: string;
  current?: number;
  recommended?: number;
  rationale?: string;
}

export interface LearningReview {
  generatedAt?: string;
  sampleSize?: number;
  hitRate?: number;
  falsePositiveRate?: number;
  weightRecommendations?: WeightRecommendation[];
  agentAssessments?: AgentAssessment[];
  thresholdRecommendations?: ThresholdRecommendation[];
  proposedNewAgents?: string[];
  notes?: string[];
}

export interface AuditEntry {
  id?: string;
  at?: string;
  actor?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  note?: string;
}

export interface PipelineRunResult {
  ok?: boolean;
  lastRunAt?: string;
  candidates?: Candidate[];
}

// ---- Backtest ----

export interface BacktestPerPeriod {
  period: string;
  topReturn: number;
  bottomReturn: number;
  spread: number;
  hitRate: number;
  rankIC: number;
}

export interface BacktestPick {
  period: string;
  ticker: string;
  srScore: number;
  eep: number;
  forwardReturn: number;
  hit: boolean;
}

export interface BacktestResult {
  generatedAt?: string;
  horizon?: string;
  topK?: number;
  periodsEvaluated?: number[];
  perPeriod?: BacktestPerPeriod[];
  meanSpread?: number;
  meanHitRate?: number;
  meanRankIC?: number;
  picks?: BacktestPick[];
}

// ---- Optimizer ----

export interface OptimizerMetrics {
  trainSpread?: number;
  valSpread?: number;
  trainHitRate?: number;
  valHitRate?: number;
  valRankIC?: number;
}

export interface OptimizerLearnedWeights {
  multipliers?: Record<string, number>;
  trainedAt?: string;
  objective?: number;
}

export interface OptimizerChangedComponent {
  component: string;
  from: number;
  to: number;
}

export interface OptimizationResult {
  learned?: OptimizerLearnedWeights;
  baseline?: OptimizerMetrics;
  optimized?: OptimizerMetrics;
  improvementValSpread?: number;
  iterations?: number;
  trainPeriods?: number[];
  valPeriods?: number[];
  changedComponents?: OptimizerChangedComponent[];
  notes?: string[];
}

export interface OptimizerApplyResult {
  applied?: boolean;
  reason?: string;
  result?: OptimizationResult;
  lastRunAt?: string;
}

export interface OptimizerResetResult {
  ok?: boolean;
  lastRunAt?: string;
}

// ---- Debates ----

export interface DebateRound {
  side: 'bull' | 'skeptic';
  claim: string;
  strength: number;
}

export interface DebateVerdict {
  ticker?: string;
  rounds?: DebateRound[];
  bullForce?: number;
  skepticForce?: number;
  winner?: 'bull' | 'skeptic' | 'contested';
  convictionDelta?: number;
  rationale?: string;
}
