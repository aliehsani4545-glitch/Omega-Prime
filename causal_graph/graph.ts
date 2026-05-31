/**
 * Causal Graph Intelligence Layer
 * -------------------------------
 * Thinks in causal chains. Never stops at first-order effects. Supports
 * queries like "if hyperscaler capex accelerates, which listed companies
 * benefit first / second / third, and which bottlenecks become critical
 * before consensus notices?"
 */
import type { CausalNode, CausalEdge, CausalPath } from '../domain/types';
import { clamp } from '../domain/util';

export interface BeneficiaryResult {
  node: CausalNode;
  order: number; // hops from source
  transmittedWeight: number; // product of (weight * effectiveConfidence) along best path
  viaRelations: string[];
}

export class CausalGraph {
  private nodes = new Map<string, CausalNode>();
  private outgoing = new Map<string, CausalEdge[]>();

  addNode(node: CausalNode): void {
    this.nodes.set(node.id, node);
    if (!this.outgoing.has(node.id)) this.outgoing.set(node.id, []);
  }

  addEdge(edge: CausalEdge): void {
    if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) {
      throw new Error(`causal edge references missing node: ${edge.from} -> ${edge.to}`);
    }
    const list = this.outgoing.get(edge.from) ?? [];
    list.push(edge);
    this.outgoing.set(edge.from, list);
  }

  getNode(id: string): CausalNode | undefined {
    return this.nodes.get(id);
  }

  allNodes(): CausalNode[] {
    return Array.from(this.nodes.values());
  }

  allEdges(): CausalEdge[] {
    return Array.from(this.outgoing.values()).flat();
  }

  /** Effective transmission of an edge after evidence decay. */
  private edgeTransmission(e: CausalEdge): number {
    return clamp(e.weight) * clamp(e.confidence) * (1 - clamp(e.decay) * 0.4);
  }

  /**
   * Multi-order beneficiary search (best-path transmitted weight via a
   * Dijkstra-style max-product relaxation, bounded by maxOrder).
   */
  query(from: string, maxOrder = 4, minWeight = 0.05): BeneficiaryResult[] {
    if (!this.nodes.has(from)) return [];
    const best = new Map<string, { weight: number; order: number; relations: string[] }>();
    best.set(from, { weight: 1, order: 0, relations: [] });

    // Relax up to maxOrder hops (Bellman-Ford style for max-product).
    for (let hop = 0; hop < maxOrder; hop++) {
      let changed = false;
      for (const [nodeId, cur] of Array.from(best.entries())) {
        if (cur.order > hop) continue;
        for (const edge of this.outgoing.get(nodeId) ?? []) {
          const t = this.edgeTransmission(edge);
          const w = cur.weight * t;
          if (w < minWeight) continue;
          const existing = best.get(edge.to);
          if (!existing || w > existing.weight) {
            best.set(edge.to, { weight: w, order: cur.order + 1, relations: [...cur.relations, edge.relation] });
            changed = true;
          }
        }
      }
      if (!changed) break;
    }

    const results: BeneficiaryResult[] = [];
    for (const [nodeId, b] of best) {
      if (nodeId === from) continue;
      const node = this.nodes.get(nodeId);
      if (!node) continue;
      results.push({ node, order: b.order, transmittedWeight: b.weight, viaRelations: b.relations });
    }
    return results.sort((a, b) => b.transmittedWeight - a.transmittedWeight);
  }

  /** Bottlenecks reachable from a source that gate downstream transmission. */
  bottlenecks(from: string, maxOrder = 4): BeneficiaryResult[] {
    return this.query(from, maxOrder, 0.02).filter((r) => r.node.type === 'bottleneck');
  }

  /** Enumerate explicit causal paths (for the graph explorer / evidence). */
  paths(from: string, to: string, maxOrder = 5): CausalPath[] {
    const found: CausalPath[] = [];
    const visit = (cur: string, pathNodes: CausalNode[], pathEdges: CausalEdge[], weight: number, hops: number) => {
      if (hops > maxOrder) return;
      if (cur === to && pathEdges.length > 0) {
        found.push({ nodes: pathNodes, edges: pathEdges, order: hops, transmittedWeight: weight });
        return;
      }
      for (const edge of this.outgoing.get(cur) ?? []) {
        if (pathNodes.some((n) => n.id === edge.to)) continue; // no cycles
        const next = this.nodes.get(edge.to);
        if (!next) continue;
        visit(edge.to, [...pathNodes, next], [...pathEdges, edge], weight * this.edgeTransmission(edge), hops + 1);
      }
    };
    const start = this.nodes.get(from);
    if (!start) return [];
    visit(from, [start], [], 1, 0);
    return found.sort((a, b) => b.transmittedWeight - a.transmittedWeight);
  }
}
