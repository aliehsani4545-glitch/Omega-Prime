/**
 * Seed causal graph for the AI-infrastructure value chain. Encodes the
 * first→fourth-order transmission used by the "who benefits" queries.
 */
import { CausalGraph } from './graph';
import type { CausalNode, CausalEdge, EvidenceItem } from '../domain/types';
import { id, nowISO, internalProvenance } from '../domain/util';

function node(nid: string, type: CausalNode['type'], label: string, ticker?: string): CausalNode {
  return { id: nid, type, label, ticker };
}

function ev(statement: string, weight = 0.7): EvidenceItem {
  return {
    id: id('cev'),
    statement,
    supports: true,
    weight,
    confidence: weight,
    provenance: [internalProvenance('causal-graph seed evidence')],
    observedAt: nowISO(),
  };
}

function edge(from: string, to: string, relation: string, weight: number, decay: number, evidence: string): CausalEdge {
  return {
    id: id('cedge'),
    from,
    to,
    relation,
    weight,
    decay,
    evidence: [ev(evidence, weight)],
    confidence: weight,
    provenance: [internalProvenance('causal-graph seed edge')],
    updatedAt: nowISO(),
  };
}

export function buildCausalGraph(): CausalGraph {
  const g = new CausalGraph();

  // --- Root drivers ---
  const nodes: CausalNode[] = [
    node('driver:hyperscaler_capex', 'capital_flow', 'Hyperscaler AI Capex Acceleration'),
    node('tech:frontier_models', 'technology', 'Frontier Model Training & Inference Demand'),

    // First order — compute
    node('co:NVDA', 'public_company', 'NVIDIA', 'NVDA'),
    node('co:AMD', 'public_company', 'AMD', 'AMD'),
    node('co:AVGO', 'public_company', 'Broadcom', 'AVGO'),
    node('co:MRVL', 'public_company', 'Marvell', 'MRVL'),
    node('co:TSM', 'public_company', 'TSMC', 'TSM'),

    // Second order — memory / optical
    node('infra:hbm', 'infrastructure', 'High-Bandwidth Memory (HBM)'),
    node('co:MU', 'public_company', 'Micron', 'MU'),
    node('co:WDC', 'public_company', 'Western Digital', 'WDC'),
    node('co:STX', 'public_company', 'Seagate', 'STX'),
    node('infra:optical', 'infrastructure', 'Optical Interconnect / 800G+'),
    node('co:COHR', 'public_company', 'Coherent', 'COHR'),
    node('co:LITE', 'public_company', 'Lumentum', 'LITE'),
    node('co:ANET', 'public_company', 'Arista', 'ANET'),
    node('co:CRDO', 'public_company', 'Credo', 'CRDO'),

    // Third order — power / cooling / grid
    node('infra:datacenter_power', 'energy_requirement', 'Data Center Power Demand'),
    node('infra:liquid_cooling', 'infrastructure', 'Liquid Cooling'),
    node('co:VRT', 'public_company', 'Vertiv', 'VRT'),
    node('co:NVT', 'public_company', 'nVent', 'NVT'),
    node('co:ETN', 'public_company', 'Eaton', 'ETN'),
    node('co:GEV', 'public_company', 'GE Vernova', 'GEV'),
    node('co:POWL', 'public_company', 'Powell', 'POWL'),
    node('co:CEG', 'public_company', 'Constellation Energy', 'CEG'),

    // Fourth order — bottlenecks
    node('bottleneck:hbm_capacity', 'bottleneck', 'HBM Packaging / CoWoS Capacity'),
    node('bottleneck:transformers', 'bottleneck', 'Grid Transformers & Switchgear'),
    node('bottleneck:optical_transceivers', 'bottleneck', 'Optical Transceiver Supply'),
    node('bottleneck:grid_interconnect', 'bottleneck', 'Grid Interconnect Queue'),
    node('constraint:skilled_labor', 'labor_constraint', 'Electrical / Datacenter Skilled Labor'),
  ];
  nodes.forEach((n) => g.addNode(n));

  const edges: CausalEdge[] = [
    edge('driver:hyperscaler_capex', 'tech:frontier_models', 'funds', 0.9, 0.1, 'Capex funds model training/inference buildout'),
    edge('tech:frontier_models', 'co:NVDA', 'drives_demand_for', 0.92, 0.15, 'Training demand drives accelerator demand'),
    edge('tech:frontier_models', 'co:AMD', 'drives_demand_for', 0.7, 0.2, 'Inference diversification to alternative accelerators'),
    edge('tech:frontier_models', 'co:AVGO', 'drives_demand_for', 0.78, 0.18, 'Custom AI silicon (XPU) demand'),
    edge('tech:frontier_models', 'co:MRVL', 'drives_demand_for', 0.7, 0.2, 'Custom silicon + interconnect demand'),
    edge('co:NVDA', 'co:TSM', 'is_manufactured_by', 0.85, 0.12, 'Leading-edge wafer + CoWoS'),
    edge('co:AVGO', 'co:TSM', 'is_manufactured_by', 0.6, 0.15, 'Custom silicon fabrication'),

    // compute -> memory / optical (second order)
    edge('co:NVDA', 'infra:hbm', 'requires', 0.88, 0.15, 'Accelerators require HBM stacks'),
    edge('infra:hbm', 'co:MU', 'benefits', 0.82, 0.2, 'HBM3E ramp benefits Micron'),
    edge('infra:hbm', 'bottleneck:hbm_capacity', 'is_gated_by', 0.8, 0.25, 'CoWoS/HBM packaging is constrained'),
    edge('bottleneck:hbm_capacity', 'co:TSM', 'is_owned_by', 0.6, 0.2, 'Advanced packaging capacity'),
    edge('co:NVDA', 'infra:optical', 'requires', 0.8, 0.18, 'Scale-out fabric requires optical interconnect'),
    edge('infra:optical', 'co:COHR', 'benefits', 0.78, 0.22, 'Transceiver/laser demand'),
    edge('infra:optical', 'co:LITE', 'benefits', 0.7, 0.25, 'Optical components demand'),
    edge('infra:optical', 'co:CRDO', 'benefits', 0.7, 0.25, 'AEC/SerDes connectivity demand'),
    edge('infra:optical', 'co:ANET', 'benefits', 0.72, 0.2, 'AI networking switch demand'),
    edge('infra:optical', 'bottleneck:optical_transceivers', 'is_gated_by', 0.65, 0.3, 'Transceiver supply tightness'),
    edge('infra:hbm', 'co:WDC', 'adjacent_benefit', 0.4, 0.3, 'Storage tier for AI data pipelines'),
    edge('infra:hbm', 'co:STX', 'adjacent_benefit', 0.42, 0.3, 'Nearline HDD for AI data lakes'),

    // compute -> power / cooling (third order)
    edge('co:NVDA', 'infra:datacenter_power', 'increases', 0.85, 0.15, 'Rack power density rising sharply'),
    edge('infra:datacenter_power', 'infra:liquid_cooling', 'necessitates', 0.8, 0.2, 'High density forces liquid cooling'),
    edge('infra:liquid_cooling', 'co:VRT', 'benefits', 0.8, 0.22, 'Thermal management leader'),
    edge('infra:liquid_cooling', 'co:NVT', 'benefits', 0.6, 0.28, 'Liquid cooling enclosures/connectors'),
    edge('infra:datacenter_power', 'co:ETN', 'benefits', 0.72, 0.2, 'Electrical distribution'),
    edge('infra:datacenter_power', 'co:GEV', 'benefits', 0.7, 0.22, 'Grid + generation equipment'),
    edge('infra:datacenter_power', 'co:POWL', 'benefits', 0.55, 0.3, 'Electrical infrastructure / switchgear'),
    edge('infra:datacenter_power', 'co:CEG', 'benefits', 0.66, 0.22, 'Nuclear baseload PPAs for datacenters'),
    edge('infra:datacenter_power', 'bottleneck:transformers', 'is_gated_by', 0.7, 0.3, 'Transformer lead times extending'),
    edge('infra:datacenter_power', 'bottleneck:grid_interconnect', 'is_gated_by', 0.68, 0.32, 'Interconnect queue multi-year'),
    edge('bottleneck:transformers', 'co:ETN', 'is_owned_by', 0.5, 0.25, 'Transformer/switchgear supply'),
    edge('bottleneck:grid_interconnect', 'constraint:skilled_labor', 'is_gated_by', 0.5, 0.3, 'Labor constrains buildout'),
    edge('infra:liquid_cooling', 'constraint:skilled_labor', 'is_gated_by', 0.4, 0.3, 'Install labor constraint'),
  ];
  edges.forEach((e) => g.addEdge(e));

  return g;
}
