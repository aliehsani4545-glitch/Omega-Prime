'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '../../lib/hooks';
import { api } from '../../lib/api';
import { Loading } from '../../components/Loading';
import { Pill } from '../../components/Pill';
import { Bar } from '../../components/Bar';
import type { Candidate, CandidateTier } from '../../lib/types';

const TIERS: CandidateTier[] = ['tier1', 'tier2', 'tier3', 'tier4', 'rejected'];
const TIER_LABELS: Record<CandidateTier, string> = {
  tier1: 'Tier 1 — Conviction',
  tier2: 'Tier 2 — Emerging',
  tier3: 'Tier 3 — Watchlist',
  tier4: 'Tier 4 — Monitor',
  rejected: 'Rejected',
};

function fmt2(n: number | undefined) {
  return n !== undefined ? n.toFixed(2) : '—';
}

export default function CandidatesPage() {
  const router = useRouter();
  const [tierFilter, setTierFilter] = useState('');
  const [themeFilter, setThemeFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [minEEP, setMinEEP] = useState('');
  const [minSR, setMinSR] = useState('');
  const [sortCol, setSortCol] = useState<'eep' | 'srScore' | 'regimeFit' | 'conviction'>('srScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data: candidates, loading, error } = useApi(() => api.candidates());

  const themes = useMemo(() => {
    if (!candidates) return [];
    return [...new Set(candidates.map((c) => c.theme).filter(Boolean))] as string[];
  }, [candidates]);

  const filtered = useMemo(() => {
    if (!candidates) return [];
    return candidates.filter((c) => {
      if (tierFilter && c.tier !== tierFilter) return false;
      if (themeFilter && c.theme !== themeFilter) return false;
      if (stageFilter && c.setupStage !== stageFilter) return false;
      if (minEEP && (c.eep || 0) < parseFloat(minEEP)) return false;
      if (minSR && (c.srScore || 0) < parseFloat(minSR)) return false;
      return true;
    });
  }, [candidates, tierFilter, themeFilter, stageFilter, minEEP, minSR]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = (a[sortCol] as number) || 0;
      const bv = (b[sortCol] as number) || 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [filtered, sortCol, sortDir]);

  const groupedByTier = useMemo(() => {
    const map: Partial<Record<CandidateTier, Candidate[]>> = {};
    TIERS.forEach((t) => { map[t] = []; });
    sorted.forEach((c) => {
      const tier = c.tier || 'tier4';
      if (!map[tier]) map[tier] = [];
      map[tier]!.push(c);
    });
    return map;
  }, [sorted]);

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('desc'); }
  };

  const sortIndicator = (col: string) =>
    sortCol === col ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '';

  if (loading) return <Loading />;
  if (error) return <Loading error={error} />;

  return (
    <div>
      <div className="page-title">Candidate Explorer</div>
      <div className="page-subtitle">
        {(candidates || []).length} candidates — grouped by tier
      </div>

      <div className="filter-row">
        <label>
          Tier:
          <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
            <option value="">All</option>
            {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>
          Theme:
          <select value={themeFilter} onChange={(e) => setThemeFilter(e.target.value)}>
            <option value="">All</option>
            {themes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>
          Stage:
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option value="">All</option>
            {['early', 'emerging', 'confirmed', 'extended', 'late'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Min EEP:
          <input
            type="number"
            min="0" max="1" step="0.05"
            value={minEEP}
            onChange={(e) => setMinEEP(e.target.value)}
            style={{ width: 70 }}
            placeholder="0.0"
          />
        </label>
        <label>
          Min SR:
          <input
            type="number"
            min="0" max="1" step="0.05"
            value={minSR}
            onChange={(e) => setMinSR(e.target.value)}
            style={{ width: 70 }}
            placeholder="0.0"
          />
        </label>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
        Click column headers to sort. Click a row to view detail.
      </div>

      {TIERS.map((tier) => {
        const rows = groupedByTier[tier] || [];
        if (rows.length === 0) return null;

        return (
          <div key={tier} className="tier-group">
            <div className="tier-group-title">
              <Pill label={tier} variant={tier} />
              {' '}{TIER_LABELS[tier]} — {rows.length} candidates
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Company</th>
                    <th>Theme</th>
                    <th
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSort('eep')}
                    >EEP{sortIndicator('eep')}</th>
                    <th
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSort('srScore')}
                    >SR Score{sortIndicator('srScore')}</th>
                    <th
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSort('regimeFit')}
                    >Regime Fit{sortIndicator('regimeFit')}</th>
                    <th>Setup Stage</th>
                    <th
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSort('conviction')}
                    >Conviction{sortIndicator('conviction')}</th>
                    <th>Portfolio Role</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c, i) => (
                    <tr
                      key={c.ticker || i}
                      className="clickable"
                      onClick={() => router.push(`/candidates/${c.ticker}`)}
                    >
                      <td>
                        <span className="mono" style={{ fontWeight: 700, color: 'var(--clr-accent)' }}>
                          {c.ticker}
                        </span>
                      </td>
                      <td>{c.company}</td>
                      <td>
                        <span className="tag">{c.theme}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 100 }}>
                          <Bar value={c.eep || 0} showValue={false} height={6} />
                          <span className="mono">{fmt2(c.eep)}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 100 }}>
                          <Bar value={c.srScore || 0} showValue={false} height={6} />
                          <span className="mono">{fmt2(c.srScore)}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 90 }}>
                          <Bar value={c.regimeFit || 0} showValue={false} height={6} color="var(--clr-teal)" />
                          <span className="mono">{fmt2(c.regimeFit)}</span>
                        </div>
                      </td>
                      <td>
                        {c.setupStage && <Pill label={c.setupStage} variant="default" />}
                      </td>
                      <td>
                        <span className="mono">{fmt2(c.conviction)}</span>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {c.portfolioRole}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {sorted.length === 0 && (
        <div className="table-empty">No candidates match the current filters.</div>
      )}
    </div>
  );
}
