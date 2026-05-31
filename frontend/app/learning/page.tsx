'use client';
export const dynamic = 'force-dynamic';

import React from 'react';
import { useApi } from '../../lib/hooks';
import { api } from '../../lib/api';
import { Loading } from '../../components/Loading';
import { StatCard } from '../../components/StatCard';
import { Bar } from '../../components/Bar';

function recBadgeClass(rec: string | undefined) {
  if (!rec) return 'rec-badge';
  const r = rec.toLowerCase();
  if (r.includes('keep') || r.includes('maintain')) return 'rec-badge rec-keep';
  if (r.includes('tune') || r.includes('adjust') || r.includes('improve')) return 'rec-badge rec-tune';
  if (r.includes('deprioritize') || r.includes('reduce')) return 'rec-badge rec-deprioritize';
  if (r.includes('retire') || r.includes('remove') || r.includes('disable')) return 'rec-badge rec-retire';
  return 'rec-badge rec-tune';
}

function recLabel(rec: string | undefined) {
  if (!rec) return 'Review';
  const r = rec.toLowerCase();
  if (r.includes('keep') || r.includes('maintain')) return 'Keep';
  if (r.includes('tune') || r.includes('adjust') || r.includes('improve')) return 'Tune';
  if (r.includes('deprioritize') || r.includes('reduce')) return 'Deprioritize';
  if (r.includes('retire') || r.includes('remove') || r.includes('disable')) return 'Retire';
  return rec.substring(0, 12);
}

export default function LearningPage() {
  const { data: lr, loading, error } = useApi(() => api.learning());

  if (loading) return <Loading />;
  if (error) return <Loading error={error} />;
  if (!lr) return <div className="table-empty">No learning data.</div>;

  return (
    <div>
      <div className="page-title">Learning Review</div>
      <div className="page-subtitle">
        System self-assessment — weight recommendations, agent value, and threshold calibration
        {lr.generatedAt && (
          <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>
            Generated: {new Date(lr.generatedAt).toLocaleString()}
          </span>
        )}
      </div>

      <div className="stat-cards">
        <StatCard
          label="Hit Rate"
          value={lr.hitRate !== undefined ? (lr.hitRate * 100).toFixed(1) + '%' : '—'}
          accent="var(--clr-bullish)"
        />
        <StatCard
          label="False Positive Rate"
          value={lr.falsePositiveRate !== undefined ? (lr.falsePositiveRate * 100).toFixed(1) + '%' : '—'}
          accent="var(--clr-bearish)"
        />
        <StatCard
          label="Sample Size"
          value={lr.sampleSize !== undefined ? lr.sampleSize.toLocaleString() : '—'}
        />
      </div>

      {(lr.weightRecommendations || []).length > 0 && (
        <>
          <div className="section-title">Weight Recommendations</div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th style={{ minWidth: 130 }}>Current Weight</th>
                  <th style={{ minWidth: 130 }}>Recommended</th>
                  <th>Delta</th>
                  <th>Rationale</th>
                </tr>
              </thead>
              <tbody>
                {(lr.weightRecommendations || []).map((wr, i) => {
                  const delta = (wr.recommendedWeight || 0) - (wr.currentWeight || 0);
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{wr.component}</td>
                      <td>
                        <Bar value={wr.currentWeight || 0} max={1} height={6} showValue />
                      </td>
                      <td>
                        <Bar value={wr.recommendedWeight || 0} max={1} height={6} color="var(--clr-teal)" showValue />
                      </td>
                      <td>
                        <span
                          className="mono"
                          style={{ color: delta > 0 ? 'var(--clr-bullish)' : delta < 0 ? 'var(--clr-bearish)' : 'var(--text-muted)' }}
                        >
                          {delta >= 0 ? '+' : ''}{delta.toFixed(3)}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{wr.rationale}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {(lr.agentAssessments || []).length > 0 && (
        <>
          <div className="section-title">Agent Value Assessments</div>
          <div className="table-scroll">
            <table className="data-table agent-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Hit Rate</th>
                  <th>Noise Rate</th>
                  <th>Net Value</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {(lr.agentAssessments || []).map((aa, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>{aa.agent}</td>
                    <td className="mono">{aa.hitRate !== undefined ? (aa.hitRate * 100).toFixed(1) + '%' : '—'}</td>
                    <td className="mono" style={{ color: 'var(--clr-bearish)' }}>
                      {aa.noiseRate !== undefined ? (aa.noiseRate * 100).toFixed(1) + '%' : '—'}
                    </td>
                    <td>
                      <span
                        className="mono"
                        style={{ color: (aa.netValue || 0) >= 0 ? 'var(--clr-bullish)' : 'var(--clr-bearish)' }}
                      >
                        {aa.netValue !== undefined ? (aa.netValue >= 0 ? '+' : '') + aa.netValue.toFixed(3) : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={recBadgeClass(aa.recommendation)}>
                        {recLabel(aa.recommendation)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {(lr.thresholdRecommendations || []).length > 0 && (
        <>
          <div className="section-title">Threshold Recommendations</div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Threshold</th>
                  <th>Current</th>
                  <th>Recommended</th>
                  <th>Delta</th>
                  <th>Rationale</th>
                </tr>
              </thead>
              <tbody>
                {(lr.thresholdRecommendations || []).map((tr, i) => {
                  const delta = (tr.recommended || 0) - (tr.current || 0);
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{tr.name}</td>
                      <td className="mono">{tr.current?.toFixed(4)}</td>
                      <td className="mono" style={{ color: 'var(--clr-teal)' }}>{tr.recommended?.toFixed(4)}</td>
                      <td>
                        <span
                          className="mono"
                          style={{ color: delta > 0 ? 'var(--clr-bullish)' : delta < 0 ? 'var(--clr-bearish)' : 'var(--text-muted)' }}
                        >
                          {delta >= 0 ? '+' : ''}{delta.toFixed(4)}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tr.rationale}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {(lr.proposedNewAgents || []).length > 0 && (
        <>
          <div className="section-title">Proposed New Agents</div>
          <div className="tag-list">
            {(lr.proposedNewAgents || []).map((a, i) => (
              <span key={i} className="signal-chip" style={{ borderColor: 'rgba(88,166,255,0.3)', color: 'var(--clr-accent)' }}>
                {a}
              </span>
            ))}
          </div>
        </>
      )}

      {(lr.notes || []).length > 0 && (
        <>
          <div className="section-title">Notes</div>
          <div className="panel">
            {(lr.notes || []).map((note, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.6, borderBottom: i < (lr.notes?.length || 0) - 1 ? '1px solid var(--border-subtle)' : 'none', paddingBottom: 8 }}>
                {note}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
