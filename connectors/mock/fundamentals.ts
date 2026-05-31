import type { FundamentalsConnector, CompanyFacts } from '../types';
import type { SignalObservation, ISODate } from '../../domain/types';
import { UNIVERSE } from '../universe';
import { rngFor, prov, signal } from './common';
import { clamp } from '../../domain/util';

/**
 * Mock fundamentals connector. Emits estimate-revision momentum, capex /
 * earnings-language drift, and valuation-vs-embedded signals — the
 * change-of-state observations that drive pre-consensus detection.
 */
export class MockFundamentalsConnector implements FundamentalsConnector {
  id = 'mock.fundamentals';

  async getCompanies(): Promise<CompanyFacts[]> {
    return UNIVERSE;
  }

  async getFundamentalSignals(asOf: ISODate): Promise<SignalObservation[]> {
    const out: SignalObservation[] = [];
    for (const c of UNIVERSE) out.push(...this.signalsForCompany(c, asOf));
    return out;
  }

  private signalsForCompany(c: CompanyFacts, asOf: ISODate): SignalObservation[] {
    const rnd = rngFor('fund:' + c.ticker);
    const gap = c.emergingReality - c.embeddedExpectation; // the core edge

    // Estimate revisions improve before consensus fully updates.
    const revState = clamp((c.observedReality - 0.5) * 2 + (rnd() - 0.5) * 0.2, -1, 1);
    const revVel = clamp(gap * 2.4 + (rnd() - 0.5) * 0.2, -1, 1);

    // Earnings language / capex commentary drift.
    const langVel = clamp(gap * 2 + (rnd() - 0.5) * 0.25, -1, 1);

    // Valuation vs embedded expectations: positive value = attractive
    // (reality running ahead of price). High embedded → less attractive.
    const valEdge = clamp((c.emergingReality - c.embeddedExpectation) * 2.2, -1, 1);

    return [
      signal({
        family: 'estimate_revision',
        name: `${c.ticker} forward estimate revisions`,
        ticker: c.ticker,
        value: revState,
        velocity: revVel,
        confidence: 0.72,
        provenance: [prov('fundamentals', this.id, `${c.ticker}:revisions`, 5, 0.78, asOf)],
        asOf,
      }),
      signal({
        family: 'earnings_language_drift',
        name: `${c.ticker} management tone / capex commentary`,
        ticker: c.ticker,
        value: clamp(langVel, -1, 1),
        velocity: langVel,
        confidence: 0.55,
        provenance: [prov('earnings_transcript', this.id, `${c.ticker}:transcript`, 14, 0.6, asOf)],
        asOf,
      }),
      signal({
        family: 'valuation_vs_embedded',
        name: `${c.ticker} valuation vs embedded expectations`,
        ticker: c.ticker,
        value: valEdge,
        velocity: clamp(gap * 1.5, -1, 1),
        confidence: 0.6,
        provenance: [prov('fundamentals', this.id, `${c.ticker}:valuation`, 2, 0.65, asOf)],
        asOf,
      }),
      signal({
        family: 'balance_sheet',
        name: `${c.ticker} balance-sheet resilience`,
        ticker: c.ticker,
        value: clamp(c.balanceSheet * 2 - 1, -1, 1),
        velocity: 0,
        confidence: 0.8,
        provenance: [prov('fundamentals', this.id, `${c.ticker}:balance_sheet`, 30, 0.85, asOf)],
        asOf,
      }),
    ];
  }
}
