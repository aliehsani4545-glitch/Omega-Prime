import type { InevitabilitySeed } from '../intelligence/inevitability';

/** Inevitabilities map to causal orders in the seed graph. */
export const INEVITABILITY_SEEDS: InevitabilitySeed[] = [
  {
    key: 'ai_compute_buildout',
    name: 'AI Compute Buildout',
    description: 'Accelerated compute becoming the default substrate for software — strategic necessity for every hyperscaler.',
    firstOrder: ['NVDA', 'AMD', 'AVGO', 'TSM'],
    secondOrder: ['MU', 'COHR', 'ANET', 'MRVL'],
    thirdOrder: ['VRT', 'ETN', 'GEV'],
    bottlenecks: ['MU', 'COHR', 'ETN'],
    hiddenConstraints: ['HBM/CoWoS packaging capacity', 'Skilled electrical labor', 'Grid interconnect queues'],
    linkedThesisIds: ['thesis_ai_compute', 'thesis_custom_silicon'],
  },
  {
    key: 'datacenter_power',
    name: 'Datacenter Power & Grid Buildout',
    description: 'Power, not chips, becomes the binding constraint on AI scale — multi-year grid and generation buildout.',
    firstOrder: ['ETN', 'GEV', 'CEG'],
    secondOrder: ['VRT', 'NVT', 'POWL'],
    thirdOrder: [],
    bottlenecks: ['ETN', 'GEV'],
    hiddenConstraints: ['Transformer lead times', 'Interconnect queues', 'Permitting'],
    linkedThesisIds: ['thesis_power_grid', 'thesis_liquid_cooling'],
  },
  {
    key: 'optical_fabric',
    name: 'AI Optical Fabric',
    description: 'Optical interconnect scales super-linearly with cluster size — a durable second-order inevitability.',
    firstOrder: ['COHR', 'LITE', 'CRDO'],
    secondOrder: ['ANET', 'MRVL', 'AVGO'],
    thirdOrder: [],
    bottlenecks: ['COHR', 'LITE'],
    hiddenConstraints: ['Laser/EML supply', 'Advanced packaging'],
    linkedThesisIds: ['thesis_optical_networking'],
  },
];
