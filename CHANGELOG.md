# Changelog

## v1.1 — Closed Temporal + Learning Loop

Theme: *discover non-consensus opportunities earlier, and improve the system
every time reality disagrees.* This release makes the platform learn from
outcomes instead of only recommending.

### Added
- **Temporal data layer** (`connectors/history.ts`) — deterministic multi-period
  reality trajectories per company. Price (embedded) chases consensus, which
  lags true reality; gaps close over subsequent periods (with noise). Engines
  now measure *true* change-of-state from real deltas. `factsAtPeriod(t)` lets
  every existing engine run unchanged at any historical period.
- **Backtest engine** (`backtesting/engine.ts`) — leakage-free replay. Scores at
  period *t* using only info available at *t*; evaluates forward returns over a
  horizon. Reports per-period **spread** (top-K minus bottom-K by SR),
  **hit-rate**, and **rank-IC** (Spearman correlation of SR vs forward return).
- **Adaptive weight optimizer** (`backtesting/optimizer.ts`) — gradient-free
  coordinate ascent over SR component weights. Trains on in-sample periods,
  reports **out-of-sample** validation improvement, and auto-applies only when
  out-of-sample improves (operator-gated). No ML dependencies.
- **Agent debate / reconciliation** (`agents/debate.ts`) — structured Bull vs
  Skeptic resolution into a bounded conviction delta; disconfirmation carries
  asymmetric weight. Wired into the Research Director for leading candidates.
- **Causal edge decay/refresh** (`causal_graph/decay.ts`) — edges refresh toward
  their structural weight when recent signals corroborate, and decay otherwise.
  Stale causal claims lose force.
- **API**: `GET /api/backtest`, `POST /api/optimizer/run|apply|reset`,
  `GET /api/optimizer/applied`, `GET /api/debates`.
- **Cockpit**: `/backtest` (Backtest & Optimizer) and `/debates` panels.
- **CLI**: `npm run optimize`.
- **Tests**: `tests/upgrade.test.ts` (temporal, debate, decay) and
  `tests/backtest.test.ts` (independent verification: no-lookahead, determinism,
  out-of-sample integrity). See `docs/VERIFICATION.md`.

### Honesty note
The synthetic world is **constructed to embody the platform's hypothesis**
(reality→consensus→price gap closure). The backtest therefore validates the
**machinery** — does the scoring rank future winners, and does the optimizer
improve ranking out-of-sample — **not** real markets. Out-of-sample gains are
reported as-is; when they don't materialize the optimizer keeps baseline weights
and says so. Replace `connectors/history.ts` with a real price/fundamentals
history connector (same interface) for genuine backtests.

### Baseline result (deterministic, default regime)
Baseline backtest mean hit-rate ≈ 78%, rank-IC ≈ 0.47; optimizer lifts
out-of-sample val hit-rate ≈ 0.77→0.83 and rank-IC ≈ 0.49→0.55 by up-weighting
expectation-gap / valuation and down-weighting momentum/revisions — i.e. it
rediscovers the non-consensus edge. (Numbers regenerate via `npm run optimize`.)

## v1.0 — Initial platform
Full institutional research platform: Market Regime Brain, Thesis Evolution,
Expectation Gap + Reality Divergence, Inevitability + Information Advantage,
Narrative engines, Causal Graph, Pre-Consensus, Adaptive Scoring (EEP + SR),
Skeptic, Agent framework + Research Director, Learning, Memory + Provenance,
Fastify API, Next.js cockpit, Postgres/in-memory persistence, Docker, tests.
