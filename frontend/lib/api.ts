// Omega Prime X — Typed API client
import type {
  HealthStatus,
  RegimeState,
  Thesis,
  Candidate,
  Narrative,
  Inevitability,
  ExpectationGap,
  RealityDivergence,
  InformationAdvantage,
  SignalObservation,
  SkepticEntry,
  CausalGraph,
  CausalQueryResult,
  Alert,
  LearningReview,
  AuditEntry,
  PipelineRunResult,
  BacktestResult,
  OptimizationResult,
  OptimizerApplyResult,
  OptimizerResetResult,
  OptimizerLearnedWeights,
  DebateVerdict,
} from './types';

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const res = await fetch(`${base}${path}`, options);
  if (!res.ok) {
    throw new Error(`API ${path} returned ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => apiFetch<HealthStatus>('/health'),

  regime: () => apiFetch<RegimeState>('/api/regime'),
  regimeHistory: () => apiFetch<RegimeState[]>('/api/regime/history'),

  theses: () => apiFetch<Thesis[]>('/api/theses'),

  candidates: (params?: {
    tier?: string;
    theme?: string;
    setupStage?: string;
    minEEP?: number;
    minSR?: number;
    limit?: number;
  }) => {
    const qs = params
      ? '?' +
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return apiFetch<Candidate[]>(`/api/candidates${qs}`);
  },

  candidate: (ticker: string) => apiFetch<Candidate>(`/api/candidates/${ticker}`),

  narratives: () => apiFetch<Narrative[]>('/api/narratives'),
  inevitabilities: () => apiFetch<Inevitability[]>('/api/inevitabilities'),
  expectationGaps: () => apiFetch<ExpectationGap[]>('/api/expectation-gaps'),
  realityDivergence: () => apiFetch<RealityDivergence[]>('/api/reality-divergence'),
  informationAdvantage: () => apiFetch<InformationAdvantage[]>('/api/information-advantage'),

  signals: (params?: { family?: string; ticker?: string }) => {
    const qs = params
      ? '?' +
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return apiFetch<SignalObservation[]>(`/api/signals${qs}`);
  },

  skeptic: () => apiFetch<SkepticEntry[]>('/api/skeptic'),

  causalGraph: () => apiFetch<CausalGraph>('/api/causal/graph'),
  causalQuery: (body: { from: string; maxOrder: number; minWeight: number }) =>
    apiFetch<CausalQueryResult>('/api/causal/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  alerts: () => apiFetch<Alert[]>('/api/alerts'),
  acknowledgeAlert: (id: string) =>
    apiFetch<Alert>(`/api/alerts/${id}/ack`, { method: 'POST' }),

  learning: () => apiFetch<LearningReview>('/api/learning'),
  audit: () => apiFetch<AuditEntry[]>('/api/audit'),

  pipelineRun: (body?: {
    profile?: {
      weightOverrides?: Record<string, number>;
      acceptanceThreshold?: number;
      watchlistMode?: boolean;
    };
    regimeOverride?: string;
  }) =>
    apiFetch<PipelineRunResult>('/api/pipeline/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    }),

  // ---- Backtest ----
  backtest: (params?: { horizon?: string; topK?: number }) => {
    const qs = params
      ? '?' +
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return apiFetch<BacktestResult>(`/api/backtest${qs}`);
  },

  // ---- Optimizer ----
  optimizerRun: () =>
    apiFetch<OptimizationResult>('/api/optimizer/run', { method: 'POST' }),

  optimizerApply: () =>
    apiFetch<OptimizerApplyResult>('/api/optimizer/apply', { method: 'POST' }),

  optimizerReset: () =>
    apiFetch<OptimizerResetResult>('/api/optimizer/reset', { method: 'POST' }),

  optimizerApplied: () =>
    apiFetch<OptimizerLearnedWeights | null>('/api/optimizer/applied'),

  // ---- Debates ----
  debates: () => apiFetch<DebateVerdict[]>('/api/debates'),
};
