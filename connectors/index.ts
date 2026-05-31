/**
 * Connector registry. Returns live connectors when credentials are present,
 * otherwise deterministic mock connectors. v1 ships mocks only; live adapters
 * implement the same interfaces (docs/UPGRADE_PATHS.md).
 */
import type { ConnectorRegistry } from './types';
import { MockMarketDataConnector } from './mock/market';
import { MockFundamentalsConnector } from './mock/fundamentals';
import { MockAltDataConnector } from './mock/altdata';

export * from './types';
export { UNIVERSE, companyByTicker } from './universe';

export function buildConnectors(): ConnectorRegistry {
  // Upgrade path: branch on process.env.MARKET_DATA_API_KEY etc. and swap in
  // live connector classes implementing the same interfaces.
  return {
    marketData: new MockMarketDataConnector(),
    fundamentals: new MockFundamentalsConnector(),
    altData: new MockAltDataConnector(),
  };
}
