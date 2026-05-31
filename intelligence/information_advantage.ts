/**
 * Information Advantage Engine
 * ----------------------------
 * Tracks where reality appears first (developer ecosystems, hiring, supplier
 * commentary, patents...) and estimates pre-consensus probability + decay,
 * surfacing change before mainstream financial coverage.
 */
import type { InformationAdvantageSignal, SignalObservation } from '../domain/types';
import { id, unit, clamp, nowISO, internalProvenance } from '../domain/util';

const ADVANTAGE_FAMILIES = new Set([
  'developer_momentum',
  'hiring_trend',
  'supply_constraint',
  'product_adoption',
  'earnings_language_drift',
]);

/** Sources that lead consensus get higher pre-consensus credit. */
const LEAD_BONUS: Record<string, number> = {
  open_source: 0.25,
  developer_ecosystem: 0.25,
  patents: 0.2,
  hiring: 0.18,
  supplier_commentary: 0.15,
  customer_commentary: 0.12,
  product_launch: 0.1,
  earnings_transcript: 0.05,
};

export function computeInformationAdvantage(
  signals: SignalObservation[],
  thesisByTicker: (ticker: string) => string[],
  industryByTicker: (ticker: string) => string,
): InformationAdvantageSignal[] {
  const out: InformationAdvantageSignal[] = [];
  for (const s of signals) {
    if (!ADVANTAGE_FAMILIES.has(s.family)) continue;
    if (!s.isInflection || s.velocity <= 0) continue;

    const p = s.provenance[0];
    const origin = p?.source ?? 'internal_model';
    const freshness = p?.freshnessDays ?? 7;
    const leadBonus = LEAD_BONUS[origin] ?? 0;

    // Pre-consensus probability: fresh + leading-source + strong velocity,
    // discounted by how stale the underlying observation is.
    const pre = unit(0.3 + s.velocity * 0.4 + leadBonus - clamp(freshness / 60, 0, 0.2));
    // Faster-decaying signals persist less; supply constraints persist longer.
    const decay = s.family === 'supply_constraint' ? 45 : s.family === 'developer_momentum' ? 30 : 18;

    out.push({
      id: id('ia'),
      origin,
      description: `${s.name}: ${s.direction} inflection (velocity ${s.velocity.toFixed(2)}) via ${origin}`,
      freshnessDays: freshness,
      preConsensusProbability: pre,
      decayDays: decay,
      affectedThesisIds: s.ticker ? thesisByTicker(s.ticker) : [],
      affectedTickers: s.ticker ? [s.ticker] : [],
      affectedIndustries: s.ticker ? [industryByTicker(s.ticker)] : [],
      confidence: unit(s.confidence * 0.7 + pre * 0.3),
      provenance: s.provenance.length ? s.provenance : [internalProvenance('information advantage')],
      createdAt: nowISO(),
    });
  }
  // Strongest pre-consensus first.
  return out.sort((a, b) => b.preConsensusProbability - a.preConsensusProbability);
}
