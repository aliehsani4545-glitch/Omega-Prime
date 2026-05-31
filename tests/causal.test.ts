import { describe, it, expect } from 'vitest';
import { buildCausalGraph } from '../causal_graph/seed';

describe('Causal Graph Intelligence', () => {
  const g = buildCausalGraph();

  it('returns multi-order beneficiaries from hyperscaler capex', () => {
    const res = g.query('driver:hyperscaler_capex', 4, 0.02);
    expect(res.length).toBeGreaterThan(5);
    // NVDA should be an early (low-order), high-transmission beneficiary.
    const nvda = res.find((r) => r.node.ticker === 'NVDA');
    expect(nvda).toBeDefined();
    expect(nvda!.order).toBeLessThanOrEqual(2);
  });

  it('orders beneficiaries by transmitted weight (first-order strongest)', () => {
    const res = g.query('driver:hyperscaler_capex', 4, 0.02);
    for (let i = 1; i < res.length; i++) {
      expect(res[i - 1]!.transmittedWeight).toBeGreaterThanOrEqual(res[i]!.transmittedWeight);
    }
  });

  it('surfaces bottlenecks before consensus (power/optical/HBM)', () => {
    const bottlenecks = g.bottlenecks('driver:hyperscaler_capex', 5);
    expect(bottlenecks.length).toBeGreaterThan(0);
    expect(bottlenecks.every((b) => b.node.type === 'bottleneck')).toBe(true);
  });

  it('enumerates explicit causal paths between two nodes', () => {
    const paths = g.paths('driver:hyperscaler_capex', 'co:MU', 5);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths[0]!.transmittedWeight).toBeGreaterThan(0);
  });

  it('rejects edges referencing missing nodes', () => {
    expect(() =>
      g.addEdge({ id: 'x', from: 'nope', to: 'co:MU', relation: 'x', weight: 1, decay: 0, evidence: [], confidence: 1, provenance: [], updatedAt: new Date().toISOString() }),
    ).toThrow();
  });
});
