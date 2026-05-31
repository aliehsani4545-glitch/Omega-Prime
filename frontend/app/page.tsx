'use client';
export const dynamic = 'force-dynamic';

import React from 'react';
import { useApi } from '../lib/hooks';
import { api } from '../lib/api';
import { Loading } from '../components/Loading';
import { Pill } from '../components/Pill';
import { StatCard } from '../components/StatCard';
import { Bar } from '../components/Bar';
import type { OperatingMode } from '../lib/types';

const MODE_LABELS: Record<OperatingMode, string> = {
  offensive: 'OFFENSIVE',
  selective: 'SELECTIVE',
  defensive: 'DEFENSIVE',
  watchlist_only: 'WATCHLIST ONLY',
};

export default function RegimePage() {
  const { data: regime, loading, error } = useApi(() => api.regime());

  if (loading || !regime) return <Loading error={error} />;

  const policy = regime.policy;
  const scores = regime.scores || {};
  const mode = regime.operatingMode;

  return (
    <div>
      <div className="page-title">Regime Dashboard</div>
      <div className="page-subtitle">Current market operating regime and policy parameters</div>

      <div className="regime-header">
        <span className="regime-title">{regime.label || '—'}</span>
        {mode && <Pill label={MODE_LABELS[mode] || mode} variant={mode} />}
      </div>

      {regime.explanation && (
        <div className="regime-explanation">{regime.explanation}</div>
      )}

      <div className="stat-cards">
        <StatCard
          label="Confidence"
          value={regime.confidence !== undefined ? `${(regime.confidence * 100).toFixed(1)}%` : '—'}
          accent="var(--clr-accent)"
        />
        <StatCard
          label="Operating Mode"
          value={mode ? MODE_LABELS[mode] || mode : '—'}
          accent={
            mode === 'offensive'
              ? 'var(--clr-bullish)'
              : mode === 'selective'
              ? 'var(--clr-amber)'
              : mode === 'defensive'
              ? 'var(--clr-bearish)'
              : 'var(--text-muted)'
          }
        />
        <StatCard
          label="Portfolio Aggressiveness"
          value={
            policy?.portfolioAggressiveness !== undefined
              ? `${(policy.portfolioAggressiveness * 100).toFixed(0)}%`
              : '—'
          }
        />
        <StatCard
          label="Acceptance Threshold"
          value={
            policy?.acceptanceThreshold !== undefined
              ? policy.acceptanceThreshold.toFixed(3)
              : '—'
          }
        />
        <StatCard
          label="Alert Threshold"
          value={
            policy?.alertThreshold !== undefined ? policy.alertThreshold.toFixed(3) : '—'
          }
        />
        <StatCard
          label="Conviction Threshold"
          value={
            policy?.convictionThreshold !== undefined
              ? policy.convictionThreshold.toFixed(3)
              : '—'
          }
        />
      </div>

      {Object.keys(scores).length > 0 && (
        <div className="panel">
          <div className="panel-title">Regime Scores</div>
          <div className="score-row">
            {Object.entries(scores)
              .sort(([, a], [, b]) => b - a)
              .map(([label, score]) => (
                <Bar
                  key={label}
                  label={label}
                  value={score}
                  max={1}
                  color="var(--clr-accent)"
                  showValue
                />
              ))}
          </div>
        </div>
      )}

      <div className="two-col">
        <div className="panel">
          <div className="panel-title">Favored Signals</div>
          <div className="signal-list">
            {(policy?.favoredSignals || []).length === 0 ? (
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>None</span>
            ) : (
              (policy?.favoredSignals || []).map((s) => (
                <span key={s} className="signal-chip" style={{ borderColor: 'rgba(63,185,80,0.3)', color: 'var(--clr-bullish)' }}>
                  {s}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">Penalized Signals</div>
          <div className="signal-list">
            {(policy?.penalizedSignals || []).length === 0 ? (
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>None</span>
            ) : (
              (policy?.penalizedSignals || []).map((s) => (
                <span key={s} className="signal-chip" style={{ borderColor: 'rgba(248,81,73,0.3)', color: 'var(--clr-bearish)' }}>
                  {s}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {policy?.signalWeights && Object.keys(policy.signalWeights).length > 0 && (
        <div className="panel">
          <div className="panel-title">Signal Weights</div>
          <div className="score-row">
            {Object.entries(policy.signalWeights)
              .sort(([, a], [, b]) => b - a)
              .map(([label, weight]) => (
                <Bar
                  key={label}
                  label={label}
                  value={weight}
                  max={1}
                  showValue
                />
              ))}
          </div>
        </div>
      )}

      <div className="panel" style={{ marginTop: 8 }}>
        <div className="panel-title">Regime Identity</div>
        {regime.id && (
          <div className="kv-row">
            <span className="kv-key">ID</span>
            <span className="kv-val mono">{regime.id}</span>
          </div>
        )}
        <div className="kv-row">
          <span className="kv-key">Watchlist Mode</span>
          <span className="kv-val">
            {mode === 'watchlist_only' ? (
              <span style={{ color: 'var(--clr-amber)' }}>Active — monitoring only, no new positions</span>
            ) : (
              <span style={{ color: 'var(--clr-bullish)' }}>Off — active deployment permitted</span>
            )}
          </span>
        </div>
        <div className="kv-row">
          <span className="kv-key">Offensive Mode</span>
          <span className="kv-val">
            {mode === 'offensive' ? (
              <span style={{ color: 'var(--clr-bullish)' }}>Active — maximum aggression</span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Inactive</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
