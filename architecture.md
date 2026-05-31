# Omega Prime X — Architecture

## 1. Philosophy → structure

First principles drive the design: **Evidence > Opinion, Causality >
Correlation, Expectation Gaps > Absolute Quality, Regime Awareness > Universal
Models, Disconfirmation > Confirmation, Provenance > Confidence Theater,
Watchlist > Forced Recommendation.**

Every conclusion is (a) regime-conditioned, (b) attacked by a skeptic, (c)
traceable to provenance, and (d) audited.

## 2. Stack & rationale

- **TypeScript / Node 22** — one language across backend, engines, and frontend;
  strong typing for the many typed domain objects; fast to build and run.
- **Fastify** backend — minimal, fast, schema-friendly HTTP layer.
- **Next.js (App Router) + React** — operator-grade cockpit.
- **PostgreSQL + pgvector** (optional) — durable persistence + future evidence
  embeddings. **In-memory seeded store is the default** so the platform runs
  with zero external dependencies.
- **Redis** — provisioned for future queues/cache; not required for v1 boot.
- **Run via `tsx`** — TypeScript executes directly; `tsc --noEmit` is the
  typecheck gate; `vitest` for tests. This avoids ESM/emit friction while
  keeping full type safety.
- **Monorepo, no vanity microservices.** Engines are plain modules at the repo
  root, composed by a single backend process.

## 3. Repository layout

```
omega-prime-x/
├─ domain/            # shared types, zod schemas, pure utilities (the contracts)
├─ connectors/        # provider adapter interfaces + deterministic mock data + seed universe
├─ regime_engine/     # Market Regime Brain (classifier + policy rewriter)
├─ thesis_engine/     # Thesis Evolution Engine (build + evolve + history)
├─ intelligence/      # expectation gap, reality divergence, inevitability,
│                     #   information advantage, narrative velocity/gravity, pre-consensus
├─ causal_graph/      # causal graph + multi-order queries + seed + evidence decay
├─ backtesting/       # leakage-free backtest engine + adaptive weight optimizer
├─ scoring/           # adaptive SR score + EEP + tiering + setup stage + weights
├─ skeptic/           # contrarian attack layer
├─ learning/          # learning feedback loop + recommendations
├─ memory/            # research memory + provenance/audit (canonical in-process state)
├─ agents/            # agent framework + ~20 specialist agents
├─ orchestration/     # Research Director (full pipeline) + parallel agent runner
├─ reports/           # markdown research brief / dossier generators
├─ database/          # Postgres schema + repository adapters (memory|postgres)
├─ backend/           # Fastify server + routes + app state
├─ frontend/          # Next.js research cockpit (8 panels)
├─ dashboard/         # reserved for alternative dashboard surfaces
├─ tests/             # vitest suite (regime, scoring, causal, intelligence, e2e)
├─ scripts/           # seed.ts, run-pipeline.ts
├─ docker/            # Dockerfiles
└─ docs/              # API.md, UPGRADE_PATHS.md
```

## 4. The intelligence cycle (data flow)

The **Research Director** (`orchestration/research_director.ts`) runs one
cycle and populates **Research Memory**, which the API serves:

```
              ┌─────────────────────────── Research Director ───────────────────────────┐
  connectors  │  1. RegimeInputs ── Regime Brain ──► RegimeState (label, mode, POLICY)   │
  (mock/live) │  2. Signals (market + fundamentals + alt-data)                           │
              │  3. Theses: build from defs+universe, evolve from signals                │
              │  4. Specialist agents run in PARALLEL ► reconcile (contradictions/escal.) │
              │  5. Causal graph built ► transmitted-weight beneficiary scoring          │
              │  6. Intelligence layers: expectation gap, reality divergence, narrative, │
              │     inevitability, information advantage, pre-consensus                  │
              │  7. Scoring: components ► SR (regime+profile weights) ► EEP              │
              │  8. Skeptic attacks every candidate ► penalties / reject                 │
              │  9. Tiering + portfolio role ► Candidates                                │
              │ 10. Alerts (Tier-1 above regime alert threshold)                         │
              │ 11. Learning records + seeded labeled history                            │
              └──────────────────────────────────────────────────────────────────────────┘
                                            │
                            ResearchMemory (audited, provenanced)
                                            │
                         Fastify API  ◄──────┴──────►  Repository (memory|postgres)
                                            │
                                   Next.js Research Cockpit
```

The regime's **policy** (signal-weight multipliers + conviction/alert/acceptance
thresholds + aggressiveness) is the single mechanism through which regime
awareness rewrites downstream behaviour. Operators can override via a scoring
profile (`POST /api/pipeline/run`).

## 5. Scoring model

- **Components** (`SRComponents`): 14 positive + 2 penalty (crowding, fragility)
  sub-scores in [0,1].
- **SR score** = contrast-adjusted, regime/profile-weighted mean of positive
  components, multiplicatively discounted by penalties. Operational ranking.
- **EEP** (north star) = expansion potential dominated by reality divergence,
  expectation gap, and pre-consensus earliness, scaled by *headroom*
  (1 − embedded) and discounted by crowding.
- **Tiering** is regime-aware: watchlist-only/defensive regimes cap or block
  tiers; the skeptic can reject.

## 6. Agent architecture

`BaseAgent` enforces the output contract: typed output, confidence model,
evidence/provenance, contradiction detection, retry, and escalation. The
Research Director runs the roster in parallel and reconciles before scoring —
mirroring Claude-Code multi-agent orchestration (parallel fan-out → reconcile).
The roster (~20 agents) is built dynamically and is designed to scale to
hundreds; LLM-backed reasoning is an upgrade path (`OMEGA_AGENT_MODE`).

## 7. Provenance, audit, replay

Every significant object carries `provenance[]`, `confidence`, and timestamps.
`ResearchMemory` records an `AuditEvent` for each significant action. Each
pipeline run persists an immutable snapshot (`runs` table) enabling event
replay and source traceability.

## 8. Determinism

Mock connectors derive all signals from the seed universe via a seeded PRNG
(`mulberry32` keyed by ticker), so every run is reproducible and the tests are
stable. Replacing connectors with live adapters is the only change needed to go
from synthetic to real data.

## 8b. Closed temporal + learning loop (v1.1)

The platform learns from outcomes, not just signals:

```
 connectors/history.ts ── multi-period reality trajectories (truth→consensus→price)
        │   factsAtPeriod(t): project facts using only info available at t
        ▼
 backtesting/engine.ts ── score at t with existing engines → rank → evaluate
        │                  forward returns (t+1..t+h, labels only) → spread/hitRate/rankIC
        ▼
 backtesting/optimizer.ts ── coordinate-ascent on TRAIN periods → validate on
        │                     OUT-OF-SAMPLE periods → LearnedWeights (operator-gated)
        ▼
 /api/optimizer/apply ── AppState.appliedWeights → research_director merges as
                          scoring overrides on every subsequent live run
```

Anti-overfitting & anti-leakage are explicit: scoring at *t* never sees future
periods; forward returns are evaluation-only; train/val are temporally disjoint
(val strictly later); the optimizer auto-applies **only** when out-of-sample
improves. The synthetic world embodies the gap-closure hypothesis, so this
validates the *machinery*, not markets (see `docs/VERIFICATION.md`,
`CHANGELOG.md`). Two further reconciliation layers were added: **agent debate**
(Bull vs Skeptic → conviction delta, disconfirmation weighted higher) and
**causal edge decay** (edges lose confidence without corroborating signals).

## 9. Self-critique (what is deliberately scaffolded)

- **Mock data**: realistic shape, synthetic values. Upgrade = implement the
  connector interfaces.
- **Persistence**: snapshots are stored as JSONB; full relational fan-out of
  every object is an upgrade path.
- **Learning**: recommendation engine over labeled outcomes (advisory, operator
  approves) — not autonomous weight mutation.
- **Causal graph**: hand-seeded for the AI-infrastructure chain; designed to be
  populated from evidence extraction.
- **LLM agents**: heuristic by default; the contract supports LLM reasoning.
