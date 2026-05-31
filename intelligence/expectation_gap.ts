/**
 * Expectation Gap Engine
 * ----------------------
 * Estimates what the market currently believes (embedded) vs observed reality
 * vs emerging reality, and surfaces where future outcomes are NOT yet priced.
 */
import type { ExpectationGap, SignalObservation } from '../domain/types';
import type { CompanyFacts } from '../connectors/types';
import { id, unit, clamp, nowISO, internalProvenance, mean } from '../domain/util';

export function computeExpectationGap(
  c: CompanyFacts,
  signals: SignalObservation[],
  thesisIds: string[],
): ExpectationGap {
  const tickerSignals = signals.filter((s) => s.ticker === c.ticker);
  // Emerging reality is reinforced by leading-edge signal velocity.
  const leadingVel = mean(
    tickerSignals
      .filter((s) => ['supply_constraint', 'developer_momentum', 'earnings_language_drift', 'hiring_trend'].includes(s.family))
      .map((s) => s.velocity),
  );
  const emerging = clamp(c.emergingReality + leadingVel * 0.15, 0, 1);
  const gap = emerging - c.embeddedExpectation; // positive = under-priced reality

  const gapScore = unit(gap * 1.4 + 0.5); // center 0.5
  const surprise = unit((emerging - c.consensusReality) * 1.6 + 0.4);

  // Confidence grows with corroborating leading signals and balance-sheet quality.
  const confidence = unit(0.4 + mean(tickerSignals.map((s) => s.confidence)) * 0.4 + (c.balanceSheet - 0.5) * 0.2);

  return {
    id: id('eg'),
    ticker: c.ticker,
    thesisIds,
    embeddedExpectation: c.embeddedExpectation,
    observedReality: c.observedReality,
    emergingReality: emerging,
    gapScore,
    surprisePotential: surprise,
    confidence,
    provenance: [internalProvenance('expectation gap = emerging - embedded reinforced by leading signals')],
    createdAt: nowISO(),
  };
}
