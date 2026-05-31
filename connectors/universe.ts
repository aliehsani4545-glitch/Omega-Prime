/**
 * The seed universe — a synthetic but internally-consistent set of public
 * companies across AI-infrastructure value chains. These dials are the
 * "ground truth reality" that the mock connectors observe and that the
 * intelligence engines reason over. All clearly synthetic; replace with
 * live connectors for production (see docs/UPGRADE_PATHS.md).
 */
import type { CompanyFacts } from './types';
import { mulberry32, hashString, clamp } from '../domain/util';

interface Anchor {
  ticker: string;
  name: string;
  theme: string;
  thesisKeys: string[];
  marketCapB: number;
  embedded: number; // how much is already priced
  emerging: number; // leading-edge reality
  crowding: number;
  quality: number; // overall fundamental quality
}

/**
 * Hand-authored anchors capture the *interesting* differentiators: the gap
 * between what's embedded and what's emerging, plus crowding. The remaining
 * dials are derived deterministically per-ticker so the universe is rich yet
 * reproducible.
 */
const ANCHORS: Anchor[] = [
  // --- The obvious consensus leaders (high embedded → low expectation gap) ---
  { ticker: 'NVDA', name: 'NVIDIA Corp', theme: 'ai_compute', thesisKeys: ['ai_compute', 'custom_silicon'], marketCapB: 3200, embedded: 0.92, emerging: 0.95, crowding: 0.9, quality: 0.95 },
  { ticker: 'AMD', name: 'Advanced Micro Devices', theme: 'ai_compute', thesisKeys: ['ai_compute', 'inference_edge'], marketCapB: 280, embedded: 0.7, emerging: 0.78, crowding: 0.72, quality: 0.8 },

  // --- Memory supercycle (under-embedded inflection — the MU archetype) ---
  { ticker: 'MU', name: 'Micron Technology', theme: 'memory_storage', thesisKeys: ['memory_supercycle', 'storage_cycle'], marketCapB: 130, embedded: 0.55, emerging: 0.86, crowding: 0.5, quality: 0.74 },
  { ticker: 'WDC', name: 'Western Digital', theme: 'memory_storage', thesisKeys: ['storage_cycle'], marketCapB: 22, embedded: 0.4, emerging: 0.68, crowding: 0.3, quality: 0.6 },
  { ticker: 'STX', name: 'Seagate Technology', theme: 'memory_storage', thesisKeys: ['storage_cycle'], marketCapB: 24, embedded: 0.42, emerging: 0.7, crowding: 0.33, quality: 0.62 },

  // --- Optical / networking (second-order AI beneficiaries) ---
  { ticker: 'COHR', name: 'Coherent Corp', theme: 'networking_optical', thesisKeys: ['optical_networking'], marketCapB: 14, embedded: 0.45, emerging: 0.8, crowding: 0.4, quality: 0.66 },
  { ticker: 'LITE', name: 'Lumentum Holdings', theme: 'networking_optical', thesisKeys: ['optical_networking'], marketCapB: 6, embedded: 0.38, emerging: 0.72, crowding: 0.3, quality: 0.58 },
  { ticker: 'ANET', name: 'Arista Networks', theme: 'networking_optical', thesisKeys: ['optical_networking', 'ai_infrastructure'], marketCapB: 110, embedded: 0.78, emerging: 0.82, crowding: 0.75, quality: 0.86 },
  { ticker: 'CRDO', name: 'Credo Technology', theme: 'networking_optical', thesisKeys: ['optical_networking', 'custom_silicon'], marketCapB: 8, embedded: 0.5, emerging: 0.84, crowding: 0.55, quality: 0.6 },

  // --- Power / grid / cooling (third-order bottleneck owners) ---
  { ticker: 'VRT', name: 'Vertiv Holdings', theme: 'power_grid_cooling', thesisKeys: ['liquid_cooling', 'power_grid'], marketCapB: 42, embedded: 0.62, emerging: 0.85, crowding: 0.6, quality: 0.72 },
  { ticker: 'ETN', name: 'Eaton Corp', theme: 'power_grid_cooling', thesisKeys: ['power_grid'], marketCapB: 130, embedded: 0.66, emerging: 0.8, crowding: 0.6, quality: 0.84 },
  { ticker: 'GEV', name: 'GE Vernova', theme: 'power_grid_cooling', thesisKeys: ['power_grid', 'energy'], marketCapB: 95, embedded: 0.58, emerging: 0.82, crowding: 0.55, quality: 0.7 },
  { ticker: 'POWL', name: 'Powell Industries', theme: 'power_grid_cooling', thesisKeys: ['power_grid'], marketCapB: 3, embedded: 0.35, emerging: 0.74, crowding: 0.25, quality: 0.55 },
  { ticker: 'NVT', name: 'nVent Electric', theme: 'power_grid_cooling', thesisKeys: ['liquid_cooling', 'power_grid'], marketCapB: 12, embedded: 0.4, emerging: 0.71, crowding: 0.3, quality: 0.62 },

  // --- Semicap & custom silicon ---
  { ticker: 'AVGO', name: 'Broadcom', theme: 'semiconductors', thesisKeys: ['custom_silicon', 'optical_networking'], marketCapB: 780, embedded: 0.82, emerging: 0.88, crowding: 0.78, quality: 0.9 },
  { ticker: 'MRVL', name: 'Marvell Technology', theme: 'semiconductors', thesisKeys: ['custom_silicon', 'optical_networking'], marketCapB: 70, embedded: 0.6, emerging: 0.8, crowding: 0.62, quality: 0.7 },
  { ticker: 'TSM', name: 'Taiwan Semiconductor', theme: 'semiconductors', thesisKeys: ['ai_compute', 'custom_silicon'], marketCapB: 900, embedded: 0.75, emerging: 0.83, crowding: 0.7, quality: 0.92 },
  { ticker: 'KLAC', name: 'KLA Corp', theme: 'semiconductors', thesisKeys: ['semiconductors'], marketCapB: 95, embedded: 0.6, emerging: 0.7, crowding: 0.55, quality: 0.85 },
  { ticker: 'ACLS', name: 'Axcelis Technologies', theme: 'semiconductors', thesisKeys: ['semiconductors'], marketCapB: 4, embedded: 0.3, emerging: 0.5, crowding: 0.3, quality: 0.55 },

  // --- Software / platform (regime-sensitive) ---
  { ticker: 'PLTR', name: 'Palantir Technologies', theme: 'software_platform', thesisKeys: ['security_platform', 'ai_infrastructure'], marketCapB: 130, embedded: 0.85, emerging: 0.8, crowding: 0.88, quality: 0.7 },
  { ticker: 'SNOW', name: 'Snowflake', theme: 'software_platform', thesisKeys: ['ai_infrastructure'], marketCapB: 55, embedded: 0.55, emerging: 0.6, crowding: 0.5, quality: 0.66 },
  { ticker: 'CRWD', name: 'CrowdStrike', theme: 'security', thesisKeys: ['security_platform'], marketCapB: 80, embedded: 0.72, emerging: 0.74, crowding: 0.68, quality: 0.8 },

  // --- Industrial automation / energy (diversifiers) ---
  { ticker: 'ROK', name: 'Rockwell Automation', theme: 'industrial_automation', thesisKeys: ['industrial_automation'], marketCapB: 30, embedded: 0.5, emerging: 0.55, crowding: 0.4, quality: 0.72 },
  { ticker: 'CEG', name: 'Constellation Energy', theme: 'energy', thesisKeys: ['energy', 'power_grid'], marketCapB: 70, embedded: 0.6, emerging: 0.8, crowding: 0.62, quality: 0.74 },
];

function deriveCompany(a: Anchor): CompanyFacts {
  const rnd = mulberry32(hashString(a.ticker));
  const jitter = (base: number, spread = 0.08) => clamp(base + (rnd() - 0.5) * 2 * spread, 0, 1);

  // Observed reality sits between consensus and emerging; consensus tracks
  // embedded with a lag. The interesting cases are where emerging >> embedded.
  const consensus = clamp(a.embedded - 0.05 + (rnd() - 0.5) * 0.06, 0, 1);
  const observed = clamp((consensus + a.emerging) / 2 + (rnd() - 0.5) * 0.05, 0, 1);

  return {
    ticker: a.ticker,
    name: a.name,
    theme: a.theme,
    thesisKeys: a.thesisKeys,
    marketCapB: a.marketCapB,
    embeddedExpectation: a.embedded,
    consensusReality: consensus,
    observedReality: observed,
    emergingReality: a.emerging,
    crowding: a.crowding,
    valuation: jitter(0.4 + a.embedded * 0.5), // priced-in maps to richer valuation
    balanceSheet: jitter(0.45 + a.quality * 0.4),
    liquidity: clamp(0.4 + Math.log10(a.marketCapB + 1) / 4, 0, 1),
    developerGravity: jitter(a.theme.startsWith('software') || a.theme === 'security' ? 0.7 : 0.45),
    productAdoption: jitter((a.emerging + a.quality) / 2),
    catalystQuality: jitter((a.emerging - a.embedded + 1) / 2), // bigger gap → better catalyst potential
    fragility: jitter(0.6 - a.quality * 0.4 + a.crowding * 0.2),
  };
}

export const UNIVERSE: CompanyFacts[] = ANCHORS.map(deriveCompany);

export const companyByTicker = (ticker: string): CompanyFacts | undefined =>
  UNIVERSE.find((c) => c.ticker === ticker);
