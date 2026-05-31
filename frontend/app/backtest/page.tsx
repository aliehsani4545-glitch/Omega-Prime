'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useCallback } from 'react';
import { useApi } from '../../lib/hooks';
import { api } from '../../lib/api';
import { Loading } from '../../components/Loading';
import { StatCard } from '../../components/StatCard';
import { Bar } from '../../components/Bar';
import type { OptimizationResult, OptimizerApplyResult } from '../../lib/types';

export default function BacktestPage() {
  const { data: backtest, loading, error, refetch: refetchBacktest } = useApi(() => api.backtest());
  const { data: applied, loading: appliedLoading, refetch: refetchApplied } = useApi(() => api.optimizerApplied());

  const [runResult, setRunResult] = useState<OptimizationResult | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const [applyResult, setApplyResult] = useState<OptimizerApplyResult | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    setRunLoading(true);
    setRunError(null);
    setRunResult(null);
    try {
      const result = await api.optimizerRun();
      setRunResult(result);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunLoading(false);
    }
  }, []);

  const handleApply = useCallback(async () => {
    setApplyLoading(true);
    setApplyError(null);
    setApplyResult(null);
    try {
      const result = await api.optimizerApply();
      setApplyResult(result);
      refetchBacktest();
      refetchApplied();
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplyLoading(false);
    }
  }, [refetchBacktest, refetchApplied]);

  const handleReset = useCallback(async () => {
    setResetLoading(true);
    setResetError(null);
    try {
      await api.optimizerReset();
      refetchBacktest();
      refetchApplied();
    } catch (e) {
      setResetError(e instanceof Error ? e.message : String(e));
    } finally {
      setResetLoading(false);
    }
  }, [refetchBacktest, refetchApplied]);

  if (loading) return <Loading />;
  if (error) return <Loading error={error} />;

  const bt = backtest;
  const perPeriod = bt?.perPeriod || [];

  return (
    <div>
      <div className="page-title">Backtest &amp; Optimizer</div>
      <div className="page-subtitle">
        Out-of-sample validation of the SR scoring system. The optimizer trains on in-sample periods
        and reports out-of-sample validation metrics — it only auto-applies when out-of-sample
        performance improves. This is decision support on a synthetic world, not market advice.
      </div>

      {/* Summary stat cards */}
      <div className="stat-cards">
        <StatCard
          label="Mean Spread"
          value={bt?.meanSpread !== undefined ? (bt.meanSpread * 100).toFixed(2) + '%' : '—'}
          sub="Top-K avg return minus bottom-K"
          accent="var(--clr-accent)"
        />
        <StatCard
          label="Mean Hit Rate"
          value={bt?.meanHitRate !== undefined ? (bt.meanHitRate * 100).toFixed(1) + '%' : '—'}
          sub="Fraction of top-K picks that outperformed"
          accent="var(--clr-bullish)"
        />
        <StatCard
          label="Mean Rank IC"
          value={bt?.meanRankIC !== undefined ? bt.meanRankIC.toFixed(2) : '—'}
          sub="Spearman rank correlation: SR score vs forward return"
          accent="var(--clr-teal)"
        />
        {bt?.horizon && (
          <StatCard label="Horizon" value={bt.horizon} />
        )}
        {bt?.topK !== undefined && (
          <StatCard label="Top K" value={String(bt.topK)} />
        )}
      </div>

      {/* Applied weights indicator */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-title">Applied Weights</div>
        {appliedLoading ? (
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Checking…</span>
        ) : applied ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span
              style={{
                background: 'rgba(63,185,80,0.15)',
                color: 'var(--clr-bullish)',
                padding: '3px 10px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              LEARNED WEIGHTS LIVE
            </span>
            {applied.trainedAt && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Trained: {new Date(applied.trainedAt).toLocaleString()}
              </span>
            )}
            {applied.objective !== undefined && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Objective: <span className="mono">{applied.objective.toFixed(4)}</span>
              </span>
            )}
            <button
              className="btn-rerun"
              onClick={handleReset}
              disabled={resetLoading}
              style={{ marginLeft: 'auto' }}
            >
              {resetLoading ? 'Resetting…' : 'Reset to Defaults'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                background: 'rgba(110,118,129,0.15)',
                color: 'var(--text-secondary)',
                padding: '3px 10px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              DEFAULT WEIGHTS
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              No learned weights applied — using system defaults
            </span>
          </div>
        )}
        {resetError && (
          <div className="loading-error" style={{ marginTop: 10 }}>
            <span className="loading-error-icon">!</span>
            <span>{resetError}</span>
          </div>
        )}
        {applied?.multipliers && Object.keys(applied.multipliers).length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Active Multipliers
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(applied.multipliers).map(([k, v]) => (
                <span key={k} className="signal-chip" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                  {k}: {v.toFixed(3)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Per-period table */}
      {perPeriod.length > 0 && (
        <>
          <div className="section-title">Per-Period Results</div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th style={{ minWidth: 160 }}>Spread</th>
                  <th style={{ minWidth: 140 }}>Hit Rate</th>
                  <th style={{ minWidth: 160 }}>Rank IC</th>
                  <th>Top Ret</th>
                  <th>Bot Ret</th>
                </tr>
              </thead>
              <tbody>
                {perPeriod.map((row) => (
                  <tr key={row.period}>
                    <td className="mono" style={{ fontWeight: 600, fontSize: 12 }}>{row.period}</td>
                    <td>
                      <Bar value={row.spread} max={0.2} diverging showValue />
                    </td>
                    <td>
                      <Bar value={row.hitRate} max={1} color="var(--clr-bullish)" showValue />
                    </td>
                    <td>
                      <Bar value={row.rankIC} max={1} diverging showValue />
                    </td>
                    <td>
                      <span
                        className="mono"
                        style={{ color: row.topReturn >= 0 ? 'var(--clr-bullish)' : 'var(--clr-bearish)', fontSize: 12 }}
                      >
                        {(row.topReturn * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td>
                      <span
                        className="mono"
                        style={{ color: row.bottomReturn >= 0 ? 'var(--clr-bullish)' : 'var(--clr-bearish)', fontSize: 12 }}
                      >
                        {(row.bottomReturn * 100).toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Optimizer panel */}
      <div className="panel" style={{ marginTop: 24 }}>
        <div className="panel-title">Optimizer</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
          Trains on in-sample periods to find weight multipliers that maximise out-of-sample spread.
          Review the baseline vs. optimized comparison before applying.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <button
            className="btn-query"
            onClick={handleRun}
            disabled={runLoading}
          >
            {runLoading ? 'Running…' : 'Run Optimizer'}
          </button>
          <button
            className="btn-query"
            onClick={handleApply}
            disabled={applyLoading}
            style={{ background: 'var(--clr-teal)' }}
          >
            {applyLoading ? 'Applying…' : 'Apply (operator-gated)'}
          </button>
        </div>

        {runError && (
          <div className="loading-error" style={{ marginBottom: 12 }}>
            <span className="loading-error-icon">!</span>
            <span>{runError}</span>
          </div>
        )}
        {applyError && (
          <div className="loading-error" style={{ marginBottom: 12 }}>
            <span className="loading-error-icon">!</span>
            <span>{applyError}</span>
          </div>
        )}

        {/* Apply result */}
        {applyResult && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 4,
              background: applyResult.applied
                ? 'rgba(63,185,80,0.08)'
                : 'rgba(210,153,34,0.08)',
              border: `1px solid ${applyResult.applied ? 'rgba(63,185,80,0.25)' : 'rgba(210,153,34,0.25)'}`,
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 12,
                  color: applyResult.applied ? 'var(--clr-bullish)' : 'var(--clr-amber)',
                  textTransform: 'uppercase',
                }}
              >
                {applyResult.applied ? 'Applied' : 'Not Applied'}
              </span>
              {applyResult.lastRunAt && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(applyResult.lastRunAt).toLocaleString()}
                </span>
              )}
            </div>
            {applyResult.reason && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {applyResult.reason}
              </div>
            )}
            {applyResult.applied && (
              <div style={{ fontSize: 12, color: 'var(--clr-teal)', marginTop: 8 }}>
                The next pipeline run will use the learned weights across the entire cockpit.
              </div>
            )}
          </div>
        )}

        {/* Run result: baseline vs optimized */}
        {runResult && (
          <div>
            {runResult.iterations !== undefined && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                Completed {runResult.iterations} iteration(s)
                {runResult.trainPeriods && runResult.trainPeriods.length > 0 && (
                  <span> · Train periods: {runResult.trainPeriods.join(', ')}</span>
                )}
                {runResult.valPeriods && runResult.valPeriods.length > 0 && (
                  <span> · Val periods: {runResult.valPeriods.join(', ')}</span>
                )}
              </div>
            )}

            <div className="table-scroll" style={{ marginBottom: 16 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Baseline</th>
                    <th>Optimized</th>
                    <th>Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      {
                        key: 'valSpread',
                        label: 'Val Spread',
                        fmt: (v: number) => (v * 100).toFixed(2) + '%',
                        isMain: true,
                      },
                      {
                        key: 'valHitRate',
                        label: 'Val Hit Rate',
                        fmt: (v: number) => (v * 100).toFixed(1) + '%',
                        isMain: false,
                      },
                      {
                        key: 'valRankIC',
                        label: 'Val Rank IC',
                        fmt: (v: number) => v.toFixed(3),
                        isMain: false,
                      },
                      {
                        key: 'trainSpread',
                        label: 'Train Spread',
                        fmt: (v: number) => (v * 100).toFixed(2) + '%',
                        isMain: false,
                      },
                      {
                        key: 'trainHitRate',
                        label: 'Train Hit Rate',
                        fmt: (v: number) => (v * 100).toFixed(1) + '%',
                        isMain: false,
                      },
                    ] as { key: keyof typeof runResult.baseline; label: string; fmt: (v: number) => string; isMain: boolean }[]
                  ).map(({ key, label, fmt, isMain }) => {
                    const bVal = runResult.baseline?.[key] as number | undefined;
                    const oVal = runResult.optimized?.[key] as number | undefined;
                    const delta = bVal !== undefined && oVal !== undefined ? oVal - bVal : undefined;
                    const improvement =
                      key === 'valSpread' ? runResult.improvementValSpread : delta;
                    return (
                      <tr key={key}>
                        <td style={{ fontWeight: isMain ? 600 : 400, fontSize: 12 }}>{label}</td>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {bVal !== undefined ? fmt(bVal) : '—'}
                        </td>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {oVal !== undefined ? fmt(oVal) : '—'}
                        </td>
                        <td>
                          {delta !== undefined ? (
                            <span
                              className="mono"
                              style={{
                                fontSize: 12,
                                fontWeight: isMain ? 700 : 400,
                                color:
                                  (improvement ?? delta) >= 0
                                    ? 'var(--clr-bullish)'
                                    : 'var(--clr-bearish)',
                              }}
                            >
                              {delta >= 0 ? '+' : ''}
                              {fmt(delta)}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {runResult.improvementValSpread !== undefined && (
              <div style={{ marginBottom: 14 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Validation spread improvement:{' '}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color:
                      runResult.improvementValSpread >= 0
                        ? 'var(--clr-bullish)'
                        : 'var(--clr-bearish)',
                  }}
                >
                  {runResult.improvementValSpread >= 0 ? '+' : ''}
                  {(runResult.improvementValSpread * 100).toFixed(2)}%
                </span>
              </div>
            )}

            {(runResult.changedComponents || []).length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: 8,
                  }}
                >
                  Changed Components
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(runResult.changedComponents || []).map((c, i) => (
                    <span
                      key={i}
                      className="signal-chip"
                      style={{ fontFamily: 'monospace', fontSize: 11 }}
                    >
                      {c.component}: {c.from.toFixed(3)} → {c.to.toFixed(3)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(runResult.notes || []).length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: 8,
                  }}
                >
                  Notes
                </div>
                {(runResult.notes || []).map((note, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                      padding: '4px 0',
                      borderBottom: i < (runResult.notes?.length ?? 0) - 1
                        ? '1px solid var(--border-subtle)'
                        : 'none',
                    }}
                  >
                    {note}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Picks table */}
      {(bt?.picks || []).length > 0 && (
        <>
          <div className="section-title">Individual Picks</div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Ticker</th>
                  <th>SR Score</th>
                  <th>EEP</th>
                  <th>Forward Return</th>
                  <th>Hit</th>
                </tr>
              </thead>
              <tbody>
                {(bt?.picks || []).map((pick, i) => (
                  <tr key={i}>
                    <td className="mono" style={{ fontSize: 12 }}>{pick.period}</td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{pick.ticker}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{pick.srScore.toFixed(3)}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{pick.eep.toFixed(3)}</td>
                    <td>
                      <span
                        className="mono"
                        style={{
                          fontSize: 12,
                          color: pick.forwardReturn >= 0 ? 'var(--clr-bullish)' : 'var(--clr-bearish)',
                        }}
                      >
                        {(pick.forwardReturn * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td>
                      {pick.hit ? (
                        <span style={{ color: 'var(--clr-bullish)', fontWeight: 600, fontSize: 12 }}>HIT</span>
                      ) : (
                        <span style={{ color: 'var(--clr-bearish)', fontSize: 12 }}>MISS</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
