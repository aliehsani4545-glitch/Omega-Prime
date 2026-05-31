# Omega Prime X — HTTP API

Base URL: `http://localhost:8080` (configurable via `BACKEND_PORT`).
All responses are JSON unless noted. No auth in v1 (local tool).

## Health
- `GET /health` → `{ status, lastRunAt, dataBackend }`

## Regime
- `GET /api/regime` → current `RegimeState`
- `GET /api/regime/history` → `RegimeState[]`

## Theses
- `GET /api/theses` → `Thesis[]`
- `GET /api/theses/:id` → `Thesis` (404 if missing)

## Candidates
- `GET /api/candidates` → `Candidate[]`
  - query: `tier`, `thesisId`, `theme`, `setupStage`, `minEEP`, `minSR`, `limit`
- `GET /api/candidates/:ticker` → `Candidate` (404 if missing)

## Intelligence layers
- `GET /api/narratives` → `Narrative[]`
- `GET /api/inevitabilities` → `Inevitability[]`
- `GET /api/expectation-gaps` → `ExpectationGap[]`
- `GET /api/reality-divergence` → `RealityDivergence[]`
- `GET /api/information-advantage` → `InformationAdvantageSignal[]`
- `GET /api/signals` → `SignalObservation[]` (query: `family`, `ticker`)

## Skeptic & debates
- `GET /api/skeptic` → `SkepticObjection[]`
- `GET /api/debates` → `DebateVerdict[]` (Bull vs Skeptic reconciliation)

## Backtest & adaptive optimizer (closed learning loop)
- `GET /api/backtest?horizon=&topK=` → `BacktestResult` (spread, hit-rate, rank-IC per period)
- `POST /api/optimizer/run` → `OptimizationResult` (train in-sample, report out-of-sample; no side effects)
- `POST /api/optimizer/apply` → `{ applied, reason, result, lastRunAt }` (applies learned weights only if out-of-sample improves; re-runs the live pipeline)
- `POST /api/optimizer/reset` → reverts to baseline weights and re-runs
- `GET /api/optimizer/applied` → currently-applied `LearnedWeights | null`

## Causal graph
- `GET /api/causal/graph` → `{ nodes, edges }`
- `POST /api/causal/query` body `{ from, maxOrder?, minWeight? }`
  → `{ from, beneficiaries[], bottlenecks[] }`
  - example: `{ "from": "driver:hyperscaler_capex", "maxOrder": 4 }`

## Alerts
- `GET /api/alerts` → `Alert[]`
- `POST /api/alerts/:id/ack` → acknowledged `Alert`

## Learning & audit
- `GET /api/learning` → `LearningReport`
- `GET /api/learning/records` → `LearningRecord[]`
- `GET /api/audit` → last 500 `AuditEvent`

## Reports & snapshot
- `GET /api/report` → markdown research brief (`text/markdown`)
- `GET /api/snapshot` → full `MemorySnapshot`

## Pipeline control
- `POST /api/pipeline/run` body
  `{ profile?: { weightOverrides?, acceptanceThreshold?, convictionThreshold?, watchlistMode? }, regimeOverride? }`
  → re-runs the cycle and returns `{ ok, lastRunAt, candidates }`

### Example
```bash
curl -s localhost:8080/api/candidates?tier=tier1 | jq '.[].ticker'
curl -s -X POST localhost:8080/api/causal/query \
  -H 'content-type: application/json' \
  -d '{"from":"driver:hyperscaler_capex","maxOrder":4}' | jq '.beneficiaries[0]'
curl -s -X POST localhost:8080/api/pipeline/run \
  -H 'content-type: application/json' \
  -d '{"profile":{"watchlistMode":true}}'
```
