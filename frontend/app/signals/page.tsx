'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useMemo } from 'react';
import { useApi } from '../../lib/hooks';
import { api } from '../../lib/api';
import { Loading } from '../../components/Loading';
import { Pill } from '../../components/Pill';
import { Bar } from '../../components/Bar';

export default function SignalsPage() {
  const { data: signals, loading, error } = useApi(() => api.signals());
  const [familyFilter, setFamilyFilter] = useState('');
  const [tickerFilter, setTickerFilter] = useState('');
  const [dirFilter, setDirFilter] = useState('');
  const [showInflection, setShowInflection] = useState(false);

  const families = useMemo(() => {
    if (!signals) return [];
    return [...new Set(signals.map((s) => s.family).filter(Boolean))] as string[];
  }, [signals]);

  const familyCounts = useMemo(() => {
    const map: Record<string, number> = {};
    (signals || []).forEach((s) => {
      if (s.family) map[s.family] = (map[s.family] || 0) + 1;
    });
    return map;
  }, [signals]);

  const filtered = useMemo(() => {
    return (signals || []).filter((s) => {
      if (familyFilter && s.family !== familyFilter) return false;
      if (tickerFilter && !(s.ticker || '').toLowerCase().includes(tickerFilter.toLowerCase())) return false;
      if (dirFilter && s.direction !== dirFilter) return false;
      if (showInflection && !s.isInflection) return false;
      return true;
    });
  }, [signals, familyFilter, tickerFilter, dirFilter, showInflection]);

  if (loading) return <Loading />;
  if (error) return <Loading error={error} />;

  return (
    <div>
      <div className="page-title">Signal Lab</div>
      <div className="page-subtitle">
        {(signals || []).length} signals — value &amp; velocity bars show diverging scale (−1 to +1)
      </div>

      <div className="section-title">Family Summary</div>
      <div className="signal-family-summary">
        {families.map((fam) => (
          <div
            key={fam}
            className="family-chip"
            style={{ cursor: 'pointer', borderColor: familyFilter === fam ? 'var(--clr-accent)' : '' }}
            onClick={() => setFamilyFilter(familyFilter === fam ? '' : fam)}
          >
            <div className="family-name">{fam}</div>
            <div className="family-count">{familyCounts[fam] || 0} signals</div>
          </div>
        ))}
      </div>

      <div className="filter-row">
        <label>
          Family:
          <select value={familyFilter} onChange={(e) => setFamilyFilter(e.target.value)}>
            <option value="">All ({(signals || []).length})</option>
            {families.map((f) => (
              <option key={f} value={f}>{f} ({familyCounts[f] || 0})</option>
            ))}
          </select>
        </label>
        <label>
          Ticker:
          <input
            type="text"
            value={tickerFilter}
            onChange={(e) => setTickerFilter(e.target.value)}
            placeholder="filter…"
            style={{ width: 90 }}
          />
        </label>
        <label>
          Direction:
          <select value={dirFilter} onChange={(e) => setDirFilter(e.target.value)}>
            <option value="">All</option>
            <option value="bullish">Bullish</option>
            <option value="bearish">Bearish</option>
            <option value="neutral">Neutral</option>
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <input
            type="checkbox"
            checked={showInflection}
            onChange={(e) => setShowInflection(e.target.checked)}
          />
          Inflections only
        </label>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Family</th>
              <th>Name</th>
              <th>Ticker</th>
              <th style={{ minWidth: 160 }}>Value</th>
              <th style={{ minWidth: 160 }}>Velocity</th>
              <th>Direction</th>
              <th>Inflection</th>
              <th>Confidence</th>
              <th>Observed</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.id || i}>
                <td>
                  <span className="tag">{s.family}</span>
                </td>
                <td style={{ fontSize: 12 }}>{s.name}</td>
                <td className="mono" style={{ color: 'var(--clr-accent)' }}>{s.ticker || ''}</td>
                <td>
                  <Bar
                    value={s.value || 0}
                    max={1}
                    diverging
                    height={8}
                    showValue
                  />
                </td>
                <td>
                  <Bar
                    value={s.velocity || 0}
                    max={1}
                    diverging
                    height={8}
                    showValue
                  />
                </td>
                <td>
                  {s.direction && (
                    <Pill label={s.direction} variant={s.direction} />
                  )}
                </td>
                <td>
                  {s.isInflection ? (
                    <span style={{ color: 'var(--clr-amber)', fontWeight: 700, fontSize: 12 }}>⚡ YES</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                  )}
                </td>
                <td className="mono">{s.confidence !== undefined ? (s.confidence * 100).toFixed(0) + '%' : '—'}</td>
                <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {s.observedAt ? new Date(s.observedAt).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <div className="table-empty">No signals match the current filters.</div>
      )}
    </div>
  );
}
