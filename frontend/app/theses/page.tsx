'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { useApi } from '../../lib/hooks';
import { api } from '../../lib/api';
import { Loading } from '../../components/Loading';
import { Pill } from '../../components/Pill';
import { Bar } from '../../components/Bar';
import type { Thesis, ThesisStatus } from '../../lib/types';

function fmt(n: number | undefined) {
  return n !== undefined ? (n * 100).toFixed(0) + '%' : '—';
}

function fmtVel(n: number | undefined) {
  if (n === undefined) return '—';
  const sign = n > 0 ? '+' : '';
  return sign + (n * 100).toFixed(1) + '%';
}

function velColor(n: number | undefined) {
  if (n === undefined) return 'var(--text-muted)';
  return n > 0 ? 'var(--clr-bullish)' : n < 0 ? 'var(--clr-bearish)' : 'var(--text-muted)';
}

function ThesisCard({ thesis }: { thesis: Thesis }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="thesis-card">
      <div className="thesis-card-header" onClick={() => setExpanded(!expanded)}>
        <span className="thesis-identity">{thesis.identity || thesis.id || 'Unnamed'}</span>
        {thesis.category && <span className="thesis-category">{thesis.category}</span>}
        {thesis.status && <Pill label={thesis.status} variant={thesis.status as ThesisStatus} />}
        <div className="thesis-bars">
          <span className="thesis-bar-item" style={{ fontFamily: 'monospace' }}>
            Conv: {fmt(thesis.conviction)}
          </span>
          <span className="thesis-bar-item" style={{ fontFamily: 'monospace' }}>
            Conf: {fmt(thesis.confidence)}
          </span>
          <span className="thesis-bar-item" style={{ fontFamily: 'monospace' }}>
            Crowd: {fmt(thesis.crowding)}
          </span>
          <span className="thesis-bar-item mono" style={{ color: velColor(thesis.confidenceVelocity) }}>
            ΔConf: {fmtVel(thesis.confidenceVelocity)}
          </span>
          <span className="thesis-bar-item mono" style={{ color: velColor(thesis.convictionVelocity) }}>
            ΔConv: {fmtVel(thesis.convictionVelocity)}
          </span>
        </div>
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 12 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {expanded && (
        <div className="thesis-detail">
          {thesis.description && <p className="thesis-desc">{thesis.description}</p>}

          <div className="two-col">
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Bar label="Conviction" value={thesis.conviction || 0} color="var(--clr-accent)" showValue />
                <Bar label="Confidence" value={thesis.confidence || 0} color="var(--clr-teal)" showValue />
                <Bar label="Crowding" value={thesis.crowding || 0} color="var(--clr-amber)" showValue />
              </div>
            </div>

            <div>
              {thesis.timeHorizonDays !== undefined && (
                <div className="kv-row">
                  <span className="kv-key">Time Horizon</span>
                  <span className="kv-val mono">{thesis.timeHorizonDays}d</span>
                </div>
              )}
              {thesis.linkedCompanies && thesis.linkedCompanies.length > 0 && (
                <div className="kv-row">
                  <span className="kv-key">Linked Companies</span>
                  <span className="kv-val">
                    <div className="tag-list">
                      {thesis.linkedCompanies.map((c) => <span key={c} className="tag">{c}</span>)}
                    </div>
                  </span>
                </div>
              )}
            </div>
          </div>

          {(thesis.evidence || []).length > 0 && (
            <>
              <div className="section-title">Evidence</div>
              <ul className="evidence-list">
                {(thesis.evidence || []).map((e, i) => (
                  <li key={i} className="evidence-item">
                    <span className="evidence-bullet">+</span>
                    <span style={{ flex: 1 }}>{e.statement}</span>
                    {e.confidence !== undefined && (
                      <span className="mono" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                        {(e.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {(thesis.disconfirming || []).length > 0 && (
            <>
              <div className="section-title">Disconfirming Evidence</div>
              <ul className="evidence-list">
                {(thesis.disconfirming || []).map((d, i) => (
                  <li key={i} className="evidence-item">
                    <span className="disconf-bullet">-</span>
                    <span>{d.statement}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {(thesis.risks || []).length > 0 && (
            <>
              <div className="section-title">Risks</div>
              <div className="tag-list">
                {(thesis.risks || []).map((r, i) => (
                  <span key={i} className="tag" style={{ borderColor: 'rgba(248,81,73,0.3)', color: 'var(--clr-bearish)' }}>
                    {r}
                  </span>
                ))}
              </div>
            </>
          )}

          {(thesis.invalidation || []).length > 0 && (
            <>
              <div className="section-title">Invalidation Triggers</div>
              <div className="tag-list">
                {(thesis.invalidation || []).map((r, i) => (
                  <span key={i} className="tag" style={{ borderColor: 'rgba(219,109,40,0.3)', color: 'var(--clr-orange)' }}>
                    {r}
                  </span>
                ))}
              </div>
            </>
          )}

          {(thesis.history || []).length > 0 && (
            <>
              <div className="section-title">History</div>
              <div className="history-timeline">
                {(thesis.history || []).slice().reverse().map((h, i) => (
                  <div key={i} className="history-entry">
                    <span className="history-at">{h.at ? new Date(h.at).toLocaleDateString() : '—'}</span>
                    {h.status && <Pill label={h.status} variant={h.status} />}
                    {h.conviction !== undefined && (
                      <span className="mono">Conv: {(h.conviction * 100).toFixed(0)}%</span>
                    )}
                    {h.confidence !== undefined && (
                      <span className="mono">Conf: {(h.confidence * 100).toFixed(0)}%</span>
                    )}
                    {h.note && <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{h.note}</span>}
                  </div>
                ))}
              </div>
            </>
          )}

          {thesis.supportingSignals && thesis.supportingSignals.length > 0 && (
            <>
              <div className="section-title">Supporting Signals</div>
              <div className="tag-list">
                {thesis.supportingSignals.map((s, i) => (
                  <span key={i} className="tag">{s}</span>
                ))}
              </div>
            </>
          )}

          {thesis.regimeSensitivity && Object.keys(thesis.regimeSensitivity).length > 0 && (
            <>
              <div className="section-title">Regime Sensitivity</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(thesis.regimeSensitivity).map(([k, v]) => (
                  <Bar key={k} label={k} value={v} diverging showValue />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ThesesPage() {
  const { data: theses, loading, error } = useApi(() => api.theses());
  const [statusFilter, setStatusFilter] = useState('');

  if (loading) return <Loading />;
  if (error) return <Loading error={error} />;

  const list = (theses || []).filter(
    (t) => !statusFilter || t.status === statusFilter
  );

  const statusCounts: Record<string, number> = {};
  (theses || []).forEach((t) => {
    if (t.status) statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  });

  const statuses = [
    'emerging', 'strengthening', 'accelerating', 'crowded', 'weakening', 'broken', 'archived',
  ];

  return (
    <div>
      <div className="page-title">Thesis Monitor</div>
      <div className="page-subtitle">
        {(theses || []).length} theses tracked — click a card to expand
      </div>

      <div className="filter-row">
        <label>
          Status:
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All ({(theses || []).length})</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s} ({statusCounts[s] || 0})
              </option>
            ))}
          </select>
        </label>
      </div>

      {list.length === 0 ? (
        <div className="table-empty">No theses match the current filter.</div>
      ) : (
        list.map((thesis, i) => <ThesisCard key={thesis.id || i} thesis={thesis} />)
      )}
    </div>
  );
}
