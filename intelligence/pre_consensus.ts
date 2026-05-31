/**
 * Pre-Consensus Detection Engine
 * ------------------------------
 * Detects change-of-state, not absolute strength: earnings language turning
 * more confident, revisions inflecting up, capex commentary improving, supply
 * constraints appearing, relative strength improving before broad recognition.
 *
 * Rewards early inflections (high |velocity|, low embedded recognition).
 */
import type { SignalObservation } from '../domain/types';
import { clamp, mean } from '../domain/util';

export interface PreConsensusScore {
  ticker: string;
  score: number; // 0..1
  inflectingFamilies: string[];
  earliness: number; // 0..1 how early in the recognition curve
}

const CHANGE_FAMILIES = new Set([
  'estimate_revision',
  'earnings_language_drift',
  'supply_constraint',
  'product_adoption',
  'developer_momentum',
  'hiring_trend',
  'relative_strength',
  'institutional_flow',
]);

export function computePreConsensus(
  signalsByTicker: Map<string, SignalObservation[]>,
  embeddedByTicker: (ticker: string) => number,
): PreConsensusScore[] {
  const out: PreConsensusScore[] = [];
  for (const [ticker, signals] of signalsByTicker) {
    const changes = signals.filter((s) => CHANGE_FAMILIES.has(s.family) && s.velocity > 0);
    if (changes.length === 0) {
      out.push({ ticker, score: 0, inflectingFamilies: [], earliness: 0 });
      continue;
    }
    const inflecting = changes.filter((s) => s.isInflection);
    const velStrength = mean(changes.map((s) => s.velocity));
    const breadth = clamp(inflecting.length / 4, 0, 1); // multiple corroborating inflections
    // Earliness: strong change-of-state but low embedded recognition = earliest.
    const embedded = embeddedByTicker(ticker);
    const earliness = clamp(velStrength * (1 - embedded) * 1.6, 0, 1);

    const score = clamp(0.5 * velStrength + 0.3 * breadth + 0.2 * earliness, 0, 1);
    out.push({
      ticker,
      score,
      inflectingFamilies: Array.from(new Set(inflecting.map((s) => s.family))),
      earliness,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}
