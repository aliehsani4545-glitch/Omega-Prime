import type { AlternativeDataConnector, CompanyFacts } from '../types';
import type { SignalObservation, ISODate } from '../../domain/types';
import { UNIVERSE } from '../universe';
import { rngFor, prov, signal } from './common';
import { clamp } from '../../domain/util';

/**
 * Mock alternative-data connector — the Information Advantage substrate.
 * Developer momentum, hiring acceleration, supply constraints, and patent
 * activity tend to reflect reality before mainstream financial coverage.
 */
export class MockAltDataConnector implements AlternativeDataConnector {
  id = 'mock.altdata';

  async getAltSignals(asOf: ISODate): Promise<SignalObservation[]> {
    const out: SignalObservation[] = [];
    for (const c of UNIVERSE) out.push(...this.signalsForCompany(c, asOf));
    return out;
  }

  private signalsForCompany(c: CompanyFacts, asOf: ISODate): SignalObservation[] {
    const rnd = rngFor('alt:' + c.ticker);
    const gap = c.emergingReality - c.consensusReality;

    return [
      signal({
        family: 'developer_momentum',
        name: `${c.ticker} developer / ecosystem momentum`,
        ticker: c.ticker,
        value: clamp(c.developerGravity * 2 - 1, -1, 1),
        velocity: clamp(gap * 2 + (rnd() - 0.5) * 0.3, -1, 1),
        confidence: 0.5,
        provenance: [prov('open_source', this.id, `${c.ticker}:oss`, 2, 0.55, asOf)],
        asOf,
      }),
      signal({
        family: 'hiring_trend',
        name: `${c.ticker} hiring acceleration`,
        ticker: c.ticker,
        value: clamp((c.emergingReality - 0.5) * 2, -1, 1),
        velocity: clamp(gap * 1.8 + (rnd() - 0.5) * 0.25, -1, 1),
        confidence: 0.48,
        provenance: [prov('hiring', this.id, `${c.ticker}:jobs`, 7, 0.5, asOf)],
        asOf,
      }),
      signal({
        family: 'supply_constraint',
        name: `${c.ticker} supply / lead-time constraint`,
        ticker: c.ticker,
        // bottleneck owners (power/cooling/optical/memory) show tightening supply
        value: clamp((c.emergingReality - c.embeddedExpectation) * 2.5, -1, 1),
        velocity: clamp(gap * 2.2, -1, 1),
        confidence: 0.52,
        provenance: [prov('supplier_commentary', this.id, `${c.ticker}:supply`, 10, 0.58, asOf)],
        asOf,
      }),
      signal({
        family: 'product_adoption',
        name: `${c.ticker} product adoption curve`,
        ticker: c.ticker,
        value: clamp(c.productAdoption * 2 - 1, -1, 1),
        velocity: clamp(gap * 1.6 + (rnd() - 0.5) * 0.2, -1, 1),
        confidence: 0.5,
        provenance: [prov('product_launch', this.id, `${c.ticker}:adoption`, 5, 0.55, asOf)],
        asOf,
      }),
    ];
  }
}
