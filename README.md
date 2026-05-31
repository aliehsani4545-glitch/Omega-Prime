# Omega Prime X — Autonomous Market Intelligence Organism

> Identify situations where **future reality is likely to exceed current market
> expectations — before broad consensus recognizes the change.**

Omega Prime X is an institutional-grade research platform that optimizes for
**Expectation Expansion Potential (EEP)** and **Reality Divergence**, not
popularity or hype. It thinks in *theses*, *causal chains*, and *market
regimes* — and attacks its own conclusions before surfacing them.

It is a real, runnable software system: a TypeScript monorepo with a Fastify
intelligence backend, a Next.js research cockpit, an agent framework, a causal
graph engine, an adaptive scoring engine, a skeptic layer, a learning loop, and
full provenance/audit. **It runs locally with zero external dependencies** (a
deterministic, seeded in-memory datastore), and upgrades cleanly to Postgres +
live data connectors.

---

## North Star: EEP

> **EEP** = the probability that future business reality (demand, pricing power,
> strategic importance, adoption, market position) will exceed what is currently
> embedded in market expectations, *before* consensus reprices.

The platform continuously compares **Embedded Expectations** vs **Observed
Reality** vs **Emerging Reality** and hunts for the widening gap. The strongest
company is not automatically the best opportunity — the largest *expectation
gap* with credible, pre-consensus evidence is.

---

## Quick start (local, no Docker required)

Prereqs: **Node.js ≥ 20**.

```bash
# 1) install
npm install
cd frontend && npm install && cd ..

# 2) run one intelligence cycle (smoke test)
npm run seed

# 3) start the backend API  (http://localhost:8080)
npm run dev

# 4) in a second terminal, start the cockpit (http://localhost:3000)
cd frontend && npm run dev
```

Windows 11: run `./setup.ps1` (PowerShell) or `setup.bat` (cmd), then the two
`npm run dev` commands above.

### Full stack with Docker

```bash
docker compose up --build
# cockpit:  http://localhost:3000
# api:      http://localhost:8080
```

Set `DATA_BACKEND=postgres` in `.env` to persist runs to Postgres (pgvector
image is provisioned). Default is `memory` — the stack runs even if Postgres is
down.

---

## What you can do in the cockpit

| Panel | What it shows |
|---|---|
| **Regime Dashboard** | Active market regime, confidence, operating mode (Offensive / Selective / Defensive / Watchlist-Only), favored & penalized signals, thresholds |
| **Thesis Monitor** | Evolving theses with conviction/confidence/crowding, velocities, evidence, disconfirming evidence, invalidation, full history |
| **Candidate Explorer** | Tiered candidates (Tier 1–4 + rejected) with EEP, SR score, setup stage, why-now, why-not-obvious, skeptic verdict |
| **Causal Graph Explorer** | "If hyperscaler capex accelerates, who benefits 1st / 2nd / 3rd, and which bottlenecks bind first?" |
| **Signal Lab** | Normalized signal observations, change-of-state velocities, inflection flags |
| **Learning Review** | Hit/false-positive rates, weight & threshold recommendations, per-agent value, proposed new agents |
| **Evidence Explorer** | Expectation-gap analysis, reality divergence, information-advantage feed, narrative velocity/gravity |
| **Alert Center** | Tier-1 emerging-leadership alerts, acknowledgements |

---

## Core systems (all implemented as real code)

1. **Market Regime Brain** (`regime_engine/`) — classifies the regime and
   rewrites signal weights, thresholds, and operating mode for everything
   downstream. *The OS of the platform.*
2. **Thesis Evolution Engine** (`thesis_engine/`) — theses as primary objects;
   status/conviction evolve from signals; full history preserved.
3. **Expectation Gap & Reality Divergence Engines** (`intelligence/`) — the
   highest-priority layers; embedded vs observed vs emerging reality.
4. **Technological Inevitability & Information Advantage Engines**
   (`intelligence/`) — inevitabilities + listed beneficiaries by causal order;
   where reality appears first.
5. **Narrative Velocity & Gravity** (`intelligence/`) — fad vs durable
   ecosystem vs crowded euphoria.
6. **Causal Graph Intelligence** (`causal_graph/`) — multi-order beneficiary &
   bottleneck queries.
7. **Pre-Consensus Detection** (`intelligence/`) — rewards early inflections.
8. **Adaptive Scoring Engine** (`scoring/`) — EEP (north star) + SR
   (operational) with regime/profile-driven weights.
9. **Contrarian Attack Layer** (`skeptic/`) — every candidate is attacked; the
   skeptic can downgrade or reject.
10. **Agent framework + Research Director** (`agents/`, `orchestration/`) — a
    director orchestrates ~20 elite specialist agents (parallel fan-out +
    reconciliation), designed to scale to hundreds.
11. **Learning Feedback Layer** (`learning/`, `backtesting/`) — a realistic
    self-improving loop: a leakage-free backtest + an adaptive weight optimizer
    that trains in-sample and proves out-of-sample improvement before applying
    (operator-gated). *Improves the system every time reality disagrees.*
12. **Research Memory + Provenance/Audit** (`memory/`) — every object is
    timestamped, sourced, and audited for replay & explainability.

> **v1.1** added a closed temporal + learning loop (history → backtest →
> optimizer → applied weights), agent Bull-vs-Skeptic debate, and causal edge
> decay. See [`CHANGELOG.md`](./CHANGELOG.md) and
> [`docs/VERIFICATION.md`](./docs/VERIFICATION.md) (independent audit).

See [`architecture.md`](./architecture.md) for the full design and
[`docs/API.md`](./docs/API.md) for the HTTP API.

---

## "Find stocks like NVIDIA / MU" — interpreted correctly

This does **not** mean clone past winners or chase similar charts. It means find
public equities entering potentially explosive upside phases via *expectation
expansion, reality divergence, supply-demand inflection, revision momentum,
bottleneck ownership, and improving evidence before consensus updates*. The seed
universe deliberately ranks under-the-radar bottleneck owners (power, optical,
memory) **above** the most-embedded mega-caps. **Search for archetypes, not
clones.**

---

## Project scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the backend API (hot reload) |
| `npm run seed` | Run one cycle, print a summary |
| `npm run pipeline` | Run a cycle, write `reports/latest.md` |
| `npm run optimize` | Run the backtest + adaptive weight optimizer (closed learning loop) |
| `npm test` | Run the vitest suite |
| `npm run typecheck` | `tsc --noEmit` over the whole monorepo |

---

## Status & honesty

- v1 ships **deterministic mock connectors + a seeded synthetic universe** so
  the whole platform is reproducible and runnable offline. All numbers are
  clearly synthetic.
- Live data connectors, full relational persistence, and LLM-backed agent
  reasoning are **interfaced and scaffolded** with explicit upgrade paths — see
  [`docs/UPGRADE_PATHS.md`](./docs/UPGRADE_PATHS.md).
- The learning loop is a *realistic* recommendation engine over labeled
  outcomes, **not** fake reinforcement learning.

This is decision-support research tooling, **not** investment advice.
