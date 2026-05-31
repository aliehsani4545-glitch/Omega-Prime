/**
 * Static thesis definitions. Theses are primary objects; companies link to
 * them. Confidence/conviction/status are computed dynamically from signals by
 * the thesis engine — these defs carry the qualitative skeleton.
 */
import type { ThesisCategory, RegimeLabel } from '../domain/types';

export interface ThesisDef {
  key: string;
  identity: string;
  category: ThesisCategory;
  description: string;
  companies: string[];
  evidence: string[];
  disconfirming: string[];
  risks: string[];
  invalidation: string[];
  leadIndicators: string[];
  laggingIndicators: string[];
  supportingSignals: string[];
  regimeSensitivity: Partial<Record<RegimeLabel, number>>;
  timeHorizonDays: number;
}

export const THESIS_DEFS: ThesisDef[] = [
  {
    key: 'ai_compute',
    identity: 'AI Compute Buildout',
    category: 'ai_compute',
    description: 'Frontier model training and inference demand drives a multi-year accelerator and custom-silicon super-cycle.',
    companies: ['NVDA', 'AMD', 'AVGO', 'TSM', 'MRVL'],
    evidence: ['Hyperscaler capex guidance inflecting higher', 'Accelerator backlog extending', 'Custom XPU programs proliferating'],
    disconfirming: ['Any pause in hyperscaler capex', 'Inference efficiency reducing unit demand'],
    risks: ['Capex digestion', 'Export controls', 'Concentration of demand among few buyers'],
    invalidation: ['Two consecutive quarters of hyperscaler capex cuts', 'Accelerator gross margins collapse'],
    leadIndicators: ['hyperscaler_capex', 'supply_constraint'],
    laggingIndicators: ['estimate_revision', 'relative_strength'],
    supportingSignals: ['earnings_language_drift', 'institutional_flow', 'developer_momentum'],
    regimeSensitivity: { ai_innovation_mania: 0.9, selective_growth_leadership: 0.6, rates_shock: -0.6, growth_scare: -0.7 },
    timeHorizonDays: 540,
  },
  {
    key: 'memory_supercycle',
    identity: 'HBM / Memory Supercycle',
    category: 'memory_storage',
    description: 'HBM scarcity and AI-driven demand inflect DRAM/NAND pricing into a supply-constrained super-cycle under-recognized by consensus.',
    companies: ['MU', 'WDC', 'STX'],
    evidence: ['HBM3E sold out into next year', 'DRAM pricing inflecting up', 'AI data pipelines lifting storage demand'],
    disconfirming: ['Memory capacity additions outpacing demand', 'PC/handset weakness offsetting AI demand'],
    risks: ['Commodity cyclicality', 'Capacity over-build', 'Pricing reversal'],
    invalidation: ['DRAM spot pricing rolling over for two quarters', 'HBM supply glut'],
    leadIndicators: ['supply_constraint', 'earnings_language_drift'],
    laggingIndicators: ['estimate_revision'],
    supportingSignals: ['institutional_flow', 'relative_strength'],
    regimeSensitivity: { ai_innovation_mania: 0.7, selective_growth_leadership: 0.7, stock_picker_market: 0.6, growth_scare: -0.6 },
    timeHorizonDays: 450,
  },
  {
    key: 'optical_networking',
    identity: 'AI Optical Interconnect',
    category: 'networking_optical',
    description: 'Scale-out AI fabrics require exponentially more optical interconnect (800G/1.6T), benefitting transceiver and connectivity suppliers as second-order winners.',
    companies: ['COHR', 'LITE', 'ANET', 'CRDO', 'MRVL', 'AVGO'],
    evidence: ['800G transceiver demand exceeding supply', 'AEC adoption inside racks', 'Networking attach rate rising per GPU'],
    disconfirming: ['Co-packaged optics displacing pluggables faster than expected', 'Networking attach normalizing'],
    risks: ['Technology transition risk', 'Customer concentration', 'Pricing competition'],
    invalidation: ['Transceiver pricing collapse', 'Hyperscaler in-sourcing of optics'],
    leadIndicators: ['supply_constraint', 'product_adoption'],
    laggingIndicators: ['estimate_revision', 'relative_strength'],
    supportingSignals: ['developer_momentum', 'institutional_flow'],
    regimeSensitivity: { ai_innovation_mania: 0.7, selective_growth_leadership: 0.7, rates_shock: -0.5 },
    timeHorizonDays: 480,
  },
  {
    key: 'power_grid',
    identity: 'Datacenter Power & Grid Bottleneck',
    category: 'power_grid_cooling',
    description: 'AI datacenter power demand collides with grid constraints; transformer, switchgear, and generation suppliers own the bottleneck — a third-order inevitability.',
    companies: ['ETN', 'GEV', 'POWL', 'CEG', 'VRT'],
    evidence: ['Transformer lead times multi-year', 'Datacenter PPAs accelerating', 'Grid interconnect queues extending'],
    disconfirming: ['Efficiency gains flattening power demand', 'Grid capacity additions accelerating'],
    risks: ['Project delays', 'Cyclicality of electrical equipment', 'Regulatory bottlenecks'],
    invalidation: ['Backlog growth stalling', 'Power demand forecasts cut materially'],
    leadIndicators: ['supply_constraint', 'earnings_language_drift'],
    laggingIndicators: ['estimate_revision'],
    supportingSignals: ['institutional_flow', 'relative_strength', 'hiring_trend'],
    regimeSensitivity: { ai_innovation_mania: 0.6, selective_growth_leadership: 0.7, healthy_bull: 0.6, growth_scare: -0.4 },
    timeHorizonDays: 600,
  },
  {
    key: 'liquid_cooling',
    identity: 'Liquid Cooling Inflection',
    category: 'power_grid_cooling',
    description: 'Rising rack power density forces a transition from air to liquid cooling, an under-appreciated attach-rate inflection.',
    companies: ['VRT', 'NVT'],
    evidence: ['Liquid cooling moving from optional to required at high density', 'Thermal backlog rising'],
    disconfirming: ['Air cooling improvements extending headroom', 'Adoption slower than hyped'],
    risks: ['Adoption timing', 'Competition', 'Margin pressure'],
    invalidation: ['Liquid cooling attach rate stalling'],
    leadIndicators: ['product_adoption', 'supply_constraint'],
    laggingIndicators: ['estimate_revision'],
    supportingSignals: ['institutional_flow', 'relative_strength'],
    regimeSensitivity: { ai_innovation_mania: 0.6, selective_growth_leadership: 0.6 },
    timeHorizonDays: 420,
  },
  {
    key: 'custom_silicon',
    identity: 'Custom AI Silicon (XPU)',
    category: 'semiconductors',
    description: 'Hyperscalers diversify away from merchant GPUs into custom accelerators, benefitting silicon design and connectivity enablers.',
    companies: ['AVGO', 'MRVL', 'CRDO'],
    evidence: ['Multiple hyperscaler XPU programs ramping', 'Design wins expanding', 'SerDes/connectivity attach rising'],
    disconfirming: ['Merchant GPU dominance persisting', 'XPU programs slipping'],
    risks: ['Program concentration', 'Long design cycles', 'Execution risk'],
    invalidation: ['Major XPU program cancellations'],
    leadIndicators: ['product_adoption', 'earnings_language_drift'],
    laggingIndicators: ['estimate_revision', 'relative_strength'],
    supportingSignals: ['institutional_flow'],
    regimeSensitivity: { ai_innovation_mania: 0.7, selective_growth_leadership: 0.7 },
    timeHorizonDays: 540,
  },
  {
    key: 'security_platform',
    identity: 'Security & Decision Platforms',
    category: 'security',
    description: 'Consolidation onto AI-native security and decision platforms; durable but partly crowded.',
    companies: ['PLTR', 'CRWD'],
    evidence: ['Platform consolidation', 'AI-native expansion', 'Net retention strength'],
    disconfirming: ['Valuation outrunning fundamentals', 'Growth deceleration'],
    risks: ['Crowding', 'Valuation', 'Competition'],
    invalidation: ['Net retention falling below 110%'],
    leadIndicators: ['product_adoption', 'developer_momentum'],
    laggingIndicators: ['estimate_revision'],
    supportingSignals: ['institutional_flow', 'relative_strength'],
    regimeSensitivity: { ai_innovation_mania: 0.5, selective_growth_leadership: 0.5, rates_shock: -0.7, growth_scare: -0.6 },
    timeHorizonDays: 480,
  },
];
