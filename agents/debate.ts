/**
 * Agent debate / reconciliation (Bull vs Skeptic).
 * ------------------------------------------------
 * Beyond flagging contradictions, top candidates go through a structured debate
 * that reconciles the bull case (positive intelligence) against the skeptic's
 * objections into a single conviction delta. Disconfirmation is weighted: a
 * strong skeptic can overturn a strong bull.
 */
import type { SRComponents, SkepticVerdict, DebateVerdict, DebateArgument } from '../domain/types';
import { clamp, unit, weightedMean, round } from '../domain/util';

export interface DebateInput {
  ticker: string;
  components: SRComponents;
  skeptic: SkepticVerdict;
  expectationGap: number;
  realityDivergence: number;
  preConsensus: number;
}

export function runDebate(input: DebateInput): DebateVerdict {
  const c = input.components;
  const rounds: DebateArgument[] = [];

  // --- Bull case: assembled from the strongest positive intelligence. ---
  const bullClaims: Array<[string, number]> = [
    [`Reality is diverging from consensus (${(input.realityDivergence * 100).toFixed(0)}/100).`, input.realityDivergence],
    [`Expectations under-price emerging reality (gap ${(input.expectationGap * 100).toFixed(0)}/100).`, input.expectationGap],
    [`Pre-consensus inflection underway (${(input.preConsensus * 100).toFixed(0)}/100).`, input.preConsensus],
    [`Owns causal/bottleneck position (${(c.causalPositioning * 100).toFixed(0)}/100).`, c.causalPositioning],
    [`Valuation leaves room vs embedded (${(c.valuationVsEmbedded * 100).toFixed(0)}/100).`, c.valuationVsEmbedded],
  ];
  for (const [claim, strength] of bullClaims) {
    if (strength > 0.5) rounds.push({ side: 'bull', claim, strength: unit(strength) });
  }
  const bullForce = unit(
    weightedMean([
      [input.realityDivergence, 1.6],
      [input.expectationGap, 1.5],
      [input.preConsensus, 1.2],
      [c.causalPositioning, 0.9],
      [c.valuationVsEmbedded, 0.8],
    ]),
  );

  // --- Skeptic case: the objections, weighted by severity × confidence. ---
  for (const o of input.skeptic.objections) {
    rounds.push({ side: 'skeptic', claim: `[${o.angle}] ${o.statement}`, strength: unit(o.severity * o.confidence) });
  }
  // Skeptic carries an asymmetric weight (disconfirmation > confirmation).
  const skepticForce = unit(input.skeptic.aggregateSeverity * 1.15);

  let winner: DebateVerdict['winner'];
  if (bullForce > skepticForce + 0.1) winner = 'bull';
  else if (skepticForce > bullForce + 0.1) winner = 'skeptic';
  else winner = 'contested';

  // Conviction delta: net force, dampened. A winning skeptic pulls conviction down.
  const convictionDelta = round(clamp((bullForce - skepticForce) * 0.5, -1, 1), 3);

  const rationale =
    winner === 'bull'
      ? `Bull case prevails: intelligence (${(bullForce * 100).toFixed(0)}) outweighs disconfirmation (${(skepticForce * 100).toFixed(0)}).`
      : winner === 'skeptic'
        ? `Skeptic prevails: disconfirmation (${(skepticForce * 100).toFixed(0)}) overturns the bull case (${(bullForce * 100).toFixed(0)}); reduce conviction.`
        : `Contested: bull (${(bullForce * 100).toFixed(0)}) ≈ skeptic (${(skepticForce * 100).toFixed(0)}); hold for confirmation.`;

  return {
    ticker: input.ticker,
    rounds,
    bullForce,
    skepticForce,
    winner,
    convictionDelta,
    rationale,
  };
}
