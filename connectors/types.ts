/**
 * Provider adapter contracts. v1 ships deterministic mock implementations.
 * Live connectors implement the same interfaces — see docs/UPGRADE_PATHS.md.
 */
import type { RegimeInputs, SignalObservation, ISODate } from '../domain/types';

/** Static-ish descriptor of a tradable public company in the universe. */
export interface CompanyFacts {
  ticker: string;
  name: string;
  theme: string;
  thesisKeys: string[];
  marketCapB: number;
  /** 0..1 dials describing the (synthetic) ground-truth reality. */
  embeddedExpectation: number; // how much future is already priced in
  consensusReality: number; // what consensus believes today
  observedReality: number; // current measurable fundamentals
  emergingReality: number; // leading-edge, not-yet-priced reality
  crowding: number; // 0 uncrowded .. 1 euphoric
  valuation: number; // 0 cheap .. 1 expensive
  balanceSheet: number; // 0 fragile .. 1 fortress
  liquidity: number; // 0 illiquid .. 1 deep
  developerGravity: number;
  productAdoption: number;
  catalystQuality: number;
  fragility: number; // 0 robust .. 1 fragile
}

export interface MarketDataConnector {
  id: string;
  getRegimeInputs(asOf: ISODate): Promise<RegimeInputs>;
  /** Per-ticker market-structure signals (relative strength, flow, etc.). */
  getMarketSignals(asOf: ISODate): Promise<SignalObservation[]>;
}

export interface FundamentalsConnector {
  id: string;
  getCompanies(): Promise<CompanyFacts[]>;
  /** Estimate revisions, capex commentary, language drift, etc. */
  getFundamentalSignals(asOf: ISODate): Promise<SignalObservation[]>;
}

export interface AlternativeDataConnector {
  id: string;
  /** Developer momentum, hiring, patents, supply-chain commentary. */
  getAltSignals(asOf: ISODate): Promise<SignalObservation[]>;
}

export interface ConnectorRegistry {
  marketData: MarketDataConnector;
  fundamentals: FundamentalsConnector;
  altData: AlternativeDataConnector;
}
