'use client';
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { RegimeState, OperatingMode } from '../lib/types';
import { Pill } from './Pill';

const MODE_LABELS: Record<OperatingMode, string> = {
  offensive: 'OFFENSIVE',
  selective: 'SELECTIVE',
  defensive: 'DEFENSIVE',
  watchlist_only: 'WATCHLIST',
};

export function TopBar() {
  const [regime, setRegime] = useState<RegimeState | null>(null);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  useEffect(() => {
    api.regime().then(setRegime).catch(() => null);
  }, []);

  const handleRerun = async () => {
    setRunning(true);
    try {
      const result = await api.pipelineRun();
      setLastRun(result.lastRunAt || new Date().toISOString());
      const fresh = await api.regime();
      setRegime(fresh);
    } catch {
      // silent — user can retry
    } finally {
      setRunning(false);
    }
  };

  const mode = regime?.operatingMode;
  const confidence = regime?.confidence;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-regime-label">{regime?.label || '—'}</span>
        {mode && <Pill label={MODE_LABELS[mode] || mode} variant={mode} />}
        {confidence !== undefined && (
          <span className="topbar-meta mono">
            Conf: {(confidence * 100).toFixed(0)}%
          </span>
        )}
        {regime?.policy?.portfolioAggressiveness !== undefined && (
          <span className="topbar-meta mono">
            Agg: {(regime.policy.portfolioAggressiveness * 100).toFixed(0)}%
          </span>
        )}
        {lastRun && (
          <span className="topbar-meta">
            Last run: {new Date(lastRun).toLocaleTimeString()}
          </span>
        )}
      </div>
      <div className="topbar-right">
        <button className="btn-rerun" onClick={handleRerun} disabled={running}>
          {running ? 'Running…' : '▶ Re-run Pipeline'}
        </button>
      </div>
    </header>
  );
}
