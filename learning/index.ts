/**
 * Learning Feedback Layer
 * -----------------------
 * A realistic (not fake-RL) self-improving loop. Tracks candidate/thesis
 * creation context and outcomes, then recommends weight/threshold changes,
 * flags low-value agents, and proposes new specialist agents.
 */
import type { LearningRecord, LearningReport, Candidate, RegimeState, WeightRecommendation, AgentValueAssessment } from '../domain/types';
import { id, nowISO, clamp, round, mean } from '../domain/util';
import { BASE_WEIGHTS } from '../scoring/weights';

export function createLearningRecord(candidate: Candidate, regime: RegimeState, agents: string[]): LearningRecord {
  return {
    id: id('learn'),
    createdAt: nowISO(),
    subjectType: 'candidate',
    subjectId: candidate.id,
    ticker: candidate.ticker,
    regimeAtCreation: regime.label,
    convictionAtCreation: candidate.conviction,
    confidenceAtCreation: candidate.confidence,
    citedDrivers: candidate.catalysts,
    citedRisks: candidate.contrarianRisks,
    contributingAgents: agents,
    outcome: 'pending',
  };
}

/**
 * A small synthetic history with realized outcomes so the learning review has
 * signal on a fresh install. Replace with real post-hoc labeling over time.
 */
export function seedLearningHistory(): LearningRecord[] {
  const mk = (ticker: string, regime: any, outcome: any, drivers: string[], agents: string[], ret: number): LearningRecord => ({
    id: id('learn'),
    createdAt: nowISO(),
    subjectType: 'candidate',
    subjectId: `hist_${ticker}`,
    ticker,
    regimeAtCreation: regime,
    convictionAtCreation: 0.6,
    confidenceAtCreation: 0.6,
    citedDrivers: drivers,
    citedRisks: [],
    contributingAgents: agents,
    outcome,
    realizedReturn: ret,
  });
  return [
    mk('MU', 'selective_growth_leadership', 'hit', ['supply_constraint', 'estimate_revision'], ['SemiconductorSupplyChainAgent', 'EstimateRevisionAgent'], 0.34),
    mk('VRT', 'selective_growth_leadership', 'hit', ['supply_constraint', 'hiring_trend'], ['PowerCoolingGridAgent'], 0.28),
    mk('COHR', 'ai_innovation_mania', 'hit', ['product_adoption', 'supply_constraint'], ['NetworkingOpticalAgent'], 0.22),
    mk('SNOW', 'rates_shock', 'miss', ['narrative_velocity'], ['NarrativeVelocityAgent'], -0.12),
    mk('PLTR', 'late_cycle_euphoria', 'crowded_late', ['narrative_gravity'], ['NarrativeGravityAgent'], -0.05),
    mk('ACLS', 'growth_scare', 'false_positive', ['relative_strength'], ['RelativeStrengthAgent'], -0.18),
  ];
}

const POSITIVE_OUTCOMES = new Set(['hit']);
const NEGATIVE_OUTCOMES = new Set(['miss', 'false_positive', 'crowded_late']);

export function generateLearningReport(records: LearningRecord[]): LearningReport {
  const labeled = records.filter((r) => r.outcome !== 'pending');
  const hits = labeled.filter((r) => POSITIVE_OUTCOMES.has(r.outcome)).length;
  const negatives = labeled.filter((r) => NEGATIVE_OUTCOMES.has(r.outcome)).length;
  const falsePositives = labeled.filter((r) => r.outcome === 'false_positive').length;
  const sampleSize = labeled.length;
  const hitRate = sampleSize ? hits / sampleSize : 0;

  // Driver value: which cited drivers correlate with positive outcomes.
  const driverScore = new Map<string, { pos: number; neg: number }>();
  for (const r of labeled) {
    const positive = POSITIVE_OUTCOMES.has(r.outcome);
    for (const d of r.citedDrivers) {
      const cur = driverScore.get(d) ?? { pos: 0, neg: 0 };
      if (positive) cur.pos += 1;
      else cur.neg += 1;
      driverScore.set(d, cur);
    }
  }

  // Translate driver value into component weight nudges.
  const driverToComponent: Record<string, keyof typeof BASE_WEIGHTS> = {
    supply_constraint: 'realityDivergence',
    estimate_revision: 'revisions',
    relative_strength: 'relativeStrength',
    product_adoption: 'causalPositioning',
    hiring_trend: 'expectationGap',
    narrative_velocity: 'narrativeStrength',
    narrative_gravity: 'narrativeGravity',
  };
  const weightRecommendations: WeightRecommendation[] = [];
  for (const [driver, sc] of driverScore) {
    const comp = driverToComponent[driver];
    if (!comp) continue;
    const net = (sc.pos - sc.neg) / Math.max(1, sc.pos + sc.neg);
    const current = BASE_WEIGHTS[comp];
    const recommended = round(clamp(current * (1 + net * 0.25), 0.3, 4), 3);
    if (Math.abs(recommended - current) >= 0.05) {
      weightRecommendations.push({
        component: comp,
        currentWeight: current,
        recommendedWeight: recommended,
        rationale: `Driver "${driver}" net outcome ${net.toFixed(2)} (${sc.pos} hits / ${sc.neg} misses).`,
      });
    }
  }

  // Agent value assessment.
  const agentStats = new Map<string, { pos: number; neg: number }>();
  for (const r of labeled) {
    const positive = POSITIVE_OUTCOMES.has(r.outcome);
    for (const a of r.contributingAgents) {
      const cur = agentStats.get(a) ?? { pos: 0, neg: 0 };
      if (positive) cur.pos += 1;
      else cur.neg += 1;
      agentStats.set(a, cur);
    }
  }
  const agentAssessments: AgentValueAssessment[] = Array.from(agentStats.entries()).map(([agent, s]) => {
    const total = s.pos + s.neg;
    const hitRateA = total ? s.pos / total : 0;
    const noiseRate = total ? s.neg / total : 0;
    const netValue = round(hitRateA - noiseRate, 3);
    let recommendation: AgentValueAssessment['recommendation'] = 'keep';
    if (netValue < -0.3) recommendation = 'retire';
    else if (netValue < 0) recommendation = 'deprioritize';
    else if (netValue < 0.4) recommendation = 'tune';
    return { agent, hitRate: hitRateA, noiseRate, netValue, recommendation };
  });

  const thresholdRecommendations = [
    {
      name: 'acceptanceThreshold',
      current: 0.62,
      recommended: falsePositives > hits ? 0.68 : 0.6,
      rationale: falsePositives > hits ? 'False positives exceed hits — tighten acceptance.' : 'Hit rate healthy — modest loosening acceptable.',
    },
  ];

  const proposedNewAgents: string[] = [];
  if (driverScore.has('supply_constraint')) proposedNewAgents.push('SupplyChainLeadTimeAgent (deepen bottleneck tracking)');
  if (hitRate < 0.5) proposedNewAgents.push('DisconfirmationSweepAgent (strengthen skeptic coverage)');

  return {
    generatedAt: nowISO(),
    sampleSize,
    hitRate: round(hitRate, 3),
    falsePositiveRate: sampleSize ? round(falsePositives / sampleSize, 3) : 0,
    weightRecommendations,
    agentAssessments,
    thresholdRecommendations,
    proposedNewAgents,
    notes: [
      `Sample of ${sampleSize} labeled records (${hits} hits, ${negatives} negatives).`,
      'Recommendations are advisory; operator approves before weights change (provenance > automation).',
    ],
  };
}
