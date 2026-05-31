/**
 * Contrarian Attack Layer (Skeptic Agent)
 * ---------------------------------------
 * Every thesis and candidate is attacked. Disconfirmation > Confirmation.
 * If the skeptic wins, confidence/conviction are reduced and the candidate is
 * downgraded or rejected.
 */
import type { SkepticObjection, SkepticVerdict, SkepticAngle, SRComponents } from '../domain/types';
import type { CompanyFacts } from '../connectors/types';
import { id, unit, clamp, nowISO, internalProvenance, weightedMean } from '../domain/util';

export interface AttackContext {
  company: CompanyFacts;
  components: SRComponents;
  setupStage: string;
  regimeMismatch: number; // 0..1 (1 = strong mismatch with regime)
  narrativeCrowdedEuphoric: boolean;
}

function objection(targetId: string, angle: SkepticAngle, statement: string, severity: number, confidence: number): SkepticObjection {
  return {
    id: id('skep'),
    targetType: 'candidate',
    targetId,
    angle,
    statement,
    severity: unit(severity),
    confidence: unit(confidence),
    refuted: false,
    provenance: [internalProvenance('skeptic heuristic attack')],
    createdAt: nowISO(),
  };
}

export function attackCandidate(targetId: string, ctx: AttackContext): SkepticVerdict {
  const c = ctx.company;
  const objections: SkepticObjection[] = [];

  if (c.valuation > 0.78 && ctx.components.valuationVsEmbedded < 0.45) {
    objections.push(objection(targetId, 'overvaluation', `Valuation rich (${c.valuation.toFixed(2)}) with little reality running ahead of price.`, (c.valuation - 0.6) * 1.6, 0.7));
  }
  if (c.crowding > 0.78) {
    objections.push(objection(targetId, 'crowding', `Positioning crowded (${c.crowding.toFixed(2)}); marginal buyer may be exhausted.`, (c.crowding - 0.6) * 1.6, 0.72));
  }
  if (ctx.narrativeCrowdedEuphoric) {
    objections.push(objection(targetId, 'narrative_saturation', 'Narrative is crowded/euphoric — late-cycle recognition risk.', 0.6, 0.65));
  }
  if (c.balanceSheet < 0.45) {
    objections.push(objection(targetId, 'debt_risk', `Balance-sheet resilience weak (${c.balanceSheet.toFixed(2)}).`, (0.6 - c.balanceSheet) * 1.5, 0.68));
  }
  if (c.fragility > 0.6) {
    objections.push(objection(targetId, 'positioning_vulnerability', `Fragility elevated (${c.fragility.toFixed(2)}); drawdown sensitivity high.`, (c.fragility - 0.45) * 1.5, 0.6));
  }
  if (c.embeddedExpectation > 0.8 && c.emergingReality - c.embeddedExpectation < 0.05) {
    objections.push(objection(targetId, 'hype_without_leverage', 'Expectations already lofty; limited incremental surprise embedded.', 0.55, 0.66));
  }
  if (ctx.setupStage === 'extended' || ctx.setupStage === 'late') {
    objections.push(objection(targetId, 'technical_exhaustion', `Setup ${ctx.setupStage}; chasing risk elevated.`, ctx.setupStage === 'late' ? 0.7 : 0.5, 0.6));
  }
  if (ctx.regimeMismatch > 0.5) {
    objections.push(objection(targetId, 'regime_mismatch', `Thesis fits the current regime poorly (mismatch ${ctx.regimeMismatch.toFixed(2)}).`, ctx.regimeMismatch, 0.7));
  }

  // Confidence-weighted severity, amplified by the breadth of objections.
  // A single strong objection is not enough; coordinated objections condemn.
  const breadthFactor = Math.min(1, 0.6 + objections.length * 0.12);
  const aggregate =
    objections.length === 0
      ? 0
      : unit(weightedMean(objections.map((o) => [o.severity, o.confidence] as [number, number])) * breadthFactor);
  const skepticWins = aggregate > 0.55;

  return {
    targetId,
    objections,
    aggregateSeverity: aggregate,
    skepticWins,
    confidencePenalty: unit(aggregate * 0.5),
    convictionPenalty: unit(aggregate * 0.6),
  };
}
