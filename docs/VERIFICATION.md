# Backtest + Optimizer Verification

Independent, adversarial audit of the backtesting and weight-optimization
subsystem. Goal: try to prove the loop is methodologically broken (lookahead
bias, data leakage, non-determinism, overfitting passed off as improvement),
then encode each disproof attempt as a test that FAILS if the flaw existed.

- Audited at: 2026-05-31
- Test file: `tests/backtest.test.ts` (13 tests)
- Run: `npx vitest run tests/backtest.test.ts` → **13 passed (13)**
- Full suite: `npx vitest run` → **40 passed (40)** (no regressions)
- No source files were modified.

## Scope audited

- `connectors/history.ts` — deterministic per-company reality trajectories;
  `factsAtPeriod`, `forwardReturn`, `buildHistory`.
- `backtesting/engine.ts` — `scoreAtPeriod`, `evaluatePeriod`, `runBacktest`,
  Spearman `rankIC`.
- `backtesting/optimizer.ts` — `optimizeWeights` coordinate ascent, 60/40
  time-ordered train/val split, out-of-sample reporting.
- `scoring/index.ts`, `intelligence/expectation_gap.ts`,
  `intelligence/reality_divergence.ts` — the per-period scoring path.

## Checks and results

| # | Claim under test | Verdict |
|---|------------------|---------|
| 1 | No lookahead: scores at t are independent of the eval horizon and of future labels | PASS |
| 2 | Determinism: `runBacktest` / `optimizeWeights` reproduce identical results | PASS |
| 3 | Train/val disjoint AND val strictly later in time; partition is exact | PASS |
| 4 | Optimizer baseline = empty overrides on the reported val periods | PASS |
| 5 | `improvementValSpread` is the true OOS delta (not the in-sample one) | PASS |
| 6 | rankIC (Spearman) ∈ [-1,1]; hitRate ∈ [0,1] | PASS |
| 7 | `forwardReturn` reads t+horizon price; undefined out of range | PASS |

### 1. No lookahead in scoring
`scoreAtPeriod(period, regime, overrides, T)` takes **no horizon argument**.
Its inputs are `factsAtPeriod(t)` and `scalarsAtPeriod` (which reads only `t`
and `t-1`). Forward returns are attached *after* scoring inside
`evaluatePeriod` and used solely as evaluation labels. The test scores period
`t` once, then runs `evaluatePeriod` at horizons 1/2/5 and asserts the SR
scores baked into the picks are identical to the horizon-free scores. It also
asserts `scoreAtPeriod` is referentially pure across repeated calls.

### 2. Determinism
`buildHistory` is seeded (`mulberry32(hashString('hist:'+ticker))`) and cached;
the scoring path is pure. The only clock-dependent fields (`generatedAt`,
`trainedAt` via `new Date().toISOString()`) are excluded from every compared
metric. Two `runBacktest` calls match on `meanSpread`/`meanHitRate`/`meanRankIC`
and byte-for-byte on `perPeriod`/`picks`/`periodsEvaluated`. Two
`optimizeWeights` calls match on `learned.multipliers`, `improvementValSpread`,
`changedComponents`, `optimized`, `baseline`, and `iterations`.

### 3. Train/val split integrity
`splitPeriods` builds `all = [0 .. T-horizon-1]`, `cut = floor(0.6*len)`,
`train = all.slice(0,cut)`, `val = all.slice(cut)`. The test asserts: empty
intersection; `min(val) > max(train)` (out-of-sample is strictly later in
time, the correct orientation for a walk-forward); and that train ∪ val equals
exactly the evaluable period set (no dropped, gapped, or duplicated periods).
Observed: train `[0..6]`, val `[7..12]` for the default `T=16, horizon=3`.

### 4. Baseline uses no overrides
The optimizer's `baseline` is computed with `baseOverrides = {}`. The test
independently re-runs `runBacktest(regime, { periods: result.valPeriods })`
(empty overrides) and matches `meanSpread/meanHitRate/meanRankIC` against
`result.baseline.val*` to 6 decimals.

### 5. No fabricated out-of-sample improvement
`improvementValSpread = round(optimizedVal.spread - baselineVal.spread, 4)`.
The test reproduces that exact OOS delta (4 dp) and confirms the reported
number equals it — not the (larger, optimizer-targeted) in-sample train delta.
It also confirms the coordinate ascent direction is correct
(`optimized.trainSpread >= baseline.trainSpread`). A second test re-applies the
`learned.multipliers` as overrides and reproduces `optimized.valSpread`
(tolerance ~2 dp to absorb the optimizer's 3 dp multiplier rounding). Observed
default run: baseline val spread `0.0432`, optimized `0.0435`, improvement
`+0.0003` — a small, honest, genuinely out-of-sample gain.

### 6. rankIC sanity
`spearman` ranks both series and returns the centered correlation, guarding
zero-variance with `dx===0 || dy===0 ? 0`. Tests assert every per-period
`rankIC` and the mean are in `[-1,1]`, `hitRate` in `[0,1]`, and that
`evaluatePeriod`'s rankIC is finite with `|rankIC| <= 1`.

### 7. forwardReturn truly looks forward
`forwardReturn(ticker, t, h)` returns `fut.priceIndex/now.priceIndex - 1` where
`fut = periods[t+h]`, and `undefined` when `now` or `fut` is out of range.
Tests assert: defined+finite in range; the value changes with horizon (reads a
different future price); `undefined` at `t=T-1, h=1` and for an absurd horizon;
deterministic on repeat; and `> -1` (a simple return floor).

## Residual concerns and limitations

These are limitations of *what the backtest can validate*, not bugs found:

1. **Synthetic world embeds the hypothesis.** `connectors/history.ts` is
   constructed so that where true reality has run ahead of embedded
   expectation, the gap tends to close → positive forward return (with noise).
   The backtest therefore validates the **machinery** (does the scoring rank
   future winners in a world where the thesis holds?), **not** that real
   markets behave this way. The header comment in `history.ts` and
   `docs/UPGRADE_PATHS.md` state this honestly. Any claim of real-market edge
   would require swapping in live price/fundamental history behind the same
   `factsAtPeriod` / `forwardReturn` interfaces.

2. **Single, short walk-forward split (60/40, one fold).** With `T=16` and
   `horizon=3` there are 13 evaluable periods, so val is only 6 periods. The
   reported `+0.0003` OOS improvement is real but well within noise; it should
   not be read as statistically significant. No multi-fold / rolling
   cross-validation is performed. This is a power limitation, not leakage.

3. **Cached history keyed only on period count.** `buildHistory` caches on
   `__cache[0].periods.length === T`. Within a process all engines share one
   trajectory set (good for determinism); but a caller that changed the
   *content* of the world while keeping the same `T` would get a stale cache.
   Not reachable through the audited public API; noted for future maintainers.

4. **Optimizer rounds learned multipliers to 3 dp** after selecting on full
   precision, so the persisted `learned.multipliers` reproduce
   `optimized.valSpread` only to ~3 dp. Benign, documented in test #5.

5. **Mild in-sample selection pressure is inherent.** Coordinate ascent
   maximizes the train spread, so train improvement is by construction >= 0;
   the honesty of the loop rests entirely on reporting the *val* delta, which
   it does correctly (check #5). The optimizer also already prints an explicit
   "did NOT improve … likely overfit" branch when OOS does not improve.

## Verdict

The closed learning loop is **methodologically sound with respect to lookahead
and leakage**. Scoring at period t uses only information available at t;
forward returns are strictly evaluation labels; the train/val split is disjoint
and correctly time-ordered (out-of-sample is later); the baseline is the
honest empty-override case; and the reported improvement is the true
out-of-sample delta, not the in-sample one. Results are fully deterministic.

The single material caveat is epistemic, not mechanical: the backtest runs on a
synthetic world deliberately built to embody the gap-closure hypothesis, so a
positive backtest confirms the pipeline ranks future winners *given that
hypothesis*, not that the hypothesis holds in live markets. The code and docs
disclose this. Treat the small OOS gain as proof-of-machinery, not edge.
