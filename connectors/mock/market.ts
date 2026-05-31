import type { MarketDataConnector, CompanyFacts } from '../types';
import type { RegimeInputs, SignalObservation, ISODate } from '../../domain/types';
import { UNIVERSE } from '../universe';
import { rngFor, prov, signal } from './common';
import { clamp } from '../../domain/util';

/**
 * Mock market-data connector. Emits a plausible late-stage "AI innovation
 * with rotation" macro environment plus per-ticker market-structure signals.
 */
export class MockMarketDataConnector implements MarketDataConnector {
  id = 'mock.market';

  async getRegimeInputs(_asOf: ISODate): Promise<RegimeInputs> {
    // A regime that classifies near "selective growth leadership / AI mania
    // transitioning" — calm-ish vol, positive rates pressure, narrow breadth.
    return {
      vix: 16.5,
      vixTermStructure: 0.93, // contango → calm
      yield2y: 4.35,
      yield10y: 4.25,
      rateTrend: 0.25,
      realYield: 1.9,
      creditSpreadProxy: 0.32,
      dollarTrend: 0.15,
      breadth: 0.46, // narrow
      newHighsLows: 0.22,
      nasdaqVsSpx: 0.4, // tech leadership
      spxVsRussell: 0.35, // large over small
      semisVsSoftware: 0.45, // semis leading
      cyclicalsLeadership: -0.1,
      sectorRotationVelocity: 0.55,
      liquidityProxy: 0.2,
      earningsRevisionBreadth: 0.28,
      eventRiskConcentration: 0.4,
    };
  }

  async getMarketSignals(asOf: ISODate): Promise<SignalObservation[]> {
    const out: SignalObservation[] = [];
    for (const c of UNIVERSE) {
      out.push(...this.signalsForCompany(c, asOf));
    }
    return out;
  }

  private signalsForCompany(c: CompanyFacts, asOf: ISODate): SignalObservation[] {
    const rnd = rngFor('market:' + c.ticker);
    // RS *level* reflects what is already recognized (consensus); RS *velocity*
    // reflects emerging recognition running ahead of consensus.
    const rsState = clamp((c.consensusReality - 0.5) * 2 + (rnd() - 0.5) * 0.3, -1, 1);
    const rsVel = clamp((c.emergingReality - c.consensusReality) * 2.2 + (rnd() - 0.5) * 0.2, -1, 1);

    // Institutional flow / sponsorship — accumulation precedes broad coverage.
    const flowState = clamp((c.observedReality - 0.5) * 1.8 + (rnd() - 0.5) * 0.4, -1, 1);
    const flowVel = clamp((c.emergingReality - c.observedReality) * 2 + (rnd() - 0.5) * 0.25, -1, 1);

    return [
      signal({
        family: 'relative_strength',
        name: `${c.ticker} relative strength vs sector`,
        ticker: c.ticker,
        value: rsState,
        velocity: rsVel,
        confidence: 0.7,
        provenance: [prov('market_data', this.id, c.ticker, 1, 0.85, asOf)],
        asOf,
      }),
      signal({
        family: 'institutional_flow',
        name: `${c.ticker} institutional sponsorship`,
        ticker: c.ticker,
        value: flowState,
        velocity: flowVel,
        confidence: 0.6,
        provenance: [prov('etf_flows', this.id, c.ticker, 3, 0.7, asOf)],
        asOf,
      }),
      signal({
        family: 'liquidity',
        name: `${c.ticker} tradability`,
        ticker: c.ticker,
        value: clamp(c.liquidity * 2 - 1, -1, 1),
        velocity: 0,
        confidence: 0.9,
        provenance: [prov('market_data', this.id, c.ticker, 1, 0.95, asOf)],
        asOf,
      }),
    ];
  }
}
