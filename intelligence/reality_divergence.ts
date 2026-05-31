/**
 * Reality Divergence Engine — the highest-priority intelligence layer.
 * Continuously estimates Consensus / Observed / Emerging reality and scores
 * the divergence, surprise, and repricing potential.
 */
import type { RealityDivergence, SignalObservation } from '../domain/types';
import type { CompanyFacts } from '../connectors/types';
import { id, unit, clamp, nowISO, internalProvenance, mean } from '../domain/util';

export function computeRealityDivergence(
  c: CompanyFacts,
  signals: SignalObservation[],
  thesisIds: string[],
): RealityDivergence {
  const ts = signals.filter((s) => s.ticker === c.ticker);
  const inflectionBoost = mean(ts.filter((s) => s.isInflection).map((s) => Math.abs(s.velocity)));
  const emerging = clamp(c.emergingReality + inflectionBoost * 0.12, 0, 1);

  // Divergence: how far emerging reality has run ahead of consensus.
  const divergence = unit((emerging - c.consensusReality) * 1.8 + 0.4);
  const surprise = unit((emerging - c.observedReality) * 1.7 + 0.45);
  // Repricing potential weighted by catalyst quality and how priced-in it is.
  const repricing = unit(((emerging - c.embeddedExpectation) * 1.5 + 0.4) * (0.6 + c.catalystQuality * 0.4));

  const confidence = unit(0.35 + mean(ts.map((s) => s.confidence)) * 0.45 + inflectionBoost * 0.2);

  return {
    id: id('rd'),
    ticker: c.ticker,
    thesisIds,
    consensusReality: c.consensusReality,
    observedReality: c.observedReality,
    emergingReality: emerging,
    divergenceScore: divergence,
    surprisePotential: surprise,
    repricingPotential: repricing,
    confidence,
    provenance: [internalProvenance('reality divergence = emerging vs consensus, repricing weighted by catalyst')],
    createdAt: nowISO(),
  };
}
