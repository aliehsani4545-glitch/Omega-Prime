# Omega Prime X — Upgrade Paths

v1 is fully runnable on synthetic, deterministic data. Each subsystem has a
clean seam to production. This document is the contract for those seams.

## 1. Live data connectors
**Where:** `connectors/`. **Interfaces:** `MarketDataConnector`,
`FundamentalsConnector`, `AlternativeDataConnector` (`connectors/types.ts`).

- Implement a class per provider (e.g. `connectors/live/polygon-market.ts`)
  satisfying the interface, emitting the same `SignalObservation` /
  `RegimeInputs` shapes with real `Provenance`.
- Switch in `connectors/index.ts::buildConnectors()` based on env keys
  (`MARKET_DATA_API_KEY`, `NEWS_API_KEY`, …); fall back to mocks when absent.
- Nothing downstream changes — engines consume the normalized contracts.

Suggested sources: market data & options, financial statements, earnings
transcripts (NLP), news, ETF flows, GitHub/open-source, hiring boards, patents,
regulatory filings, industry reports.

## 2. Persistence (Postgres)
**Where:** `database/`. Set `DATA_BACKEND=postgres` and `DATABASE_URL`.
`PostgresRepository` runs `schema.sql` on init and stores each run snapshot.

- **Upgrade:** fan out the JSONB snapshot into the relational tables
  (`theses`, `candidates`, `signals`, …) for queryable history & analytics.
- **pgvector:** the schema provisions the `vector` extension; add
  `evidence_embeddings` and wire an embedding connector for similarity search.

## 3. LLM-backed agent reasoning
**Where:** `agents/`. `BaseAgent` already defines the contract (typed output,
confidence, provenance, contradictions, retry, escalation).

- Add `agents/llm/llm-agent.ts` calling the Anthropic API; gate on
  `OMEGA_AGENT_MODE=llm` and `ANTHROPIC_API_KEY`.
- Keep heuristic agents as deterministic fallbacks and for tests.
- The Research Director's parallel runner already supports mixed rosters.

## 4. Backtesting & realized outcomes
**Where:** `learning/`. `LearningRecord` carries creation context; outcomes are
currently seeded.

- Add a job that, after a horizon, labels records (`hit`/`miss`/…) from realized
  returns and feeds `generateLearningReport`.
- Persist approved weight/threshold changes as operator-versioned scoring
  profiles (the scoring engine already accepts overrides).

## 5. Real-time / scheduling
- Use Redis (already provisioned) + a queue to run cycles on a schedule and to
  fan out agent work; emit alerts to webhooks/email.

## 6. Causal graph population
**Where:** `causal_graph/`. The graph is hand-seeded for the AI-infra chain.

- Add an evidence-extraction connector that proposes nodes/edges with provenance
  and confidence; apply edge decay as evidence ages (already modeled on
  `CausalEdge.decay`).

## 7. Frontend auth & multi-user
- Add auth middleware in `backend/` and per-operator scoring profiles; the API
  is intentionally unauthenticated for local single-operator v1.
