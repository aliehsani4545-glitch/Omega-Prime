'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { useApi } from '../../lib/hooks';
import { api } from '../../lib/api';
import { Loading } from '../../components/Loading';
import { Pill } from '../../components/Pill';
import { Bar } from '../../components/Bar';
import type { Narrative } from '../../lib/types';

// Narrative quadrant SVG (x=velocity, y=gravity)
function NarrativeQuadrant({ narratives }: { narratives: Narrative[] }) {
  const W = 400;
  const H = 300;
  const PAD = 40;
  const plotW = W - PAD * 2;
  const plotH = H - PAD * 2;

  const toX = (v: number) => PAD + ((v + 1) / 2) * plotW;
  const toY = (g: number) => PAD + (1 - (g + 1) / 2) * plotH;

  const classColor: Record<string, string> = {
    fad: 'var(--clr-amber)',
    early_emerging: 'var(--clr-teal)',
    durable_ecosystem_forming: 'var(--clr-bullish)',
    saturated: 'var(--clr-bearish)',
    crowded_euphoric: 'var(--clr-orange)',
  };

  return (
    <div className="narrative-quadrant">
      <div className="panel-title">Narrative Velocity × Gravity Quadrant</div>
      <svg width={W} height={H} style={{ display: 'block', margin: '0 auto' }}>
        {/* Axes */}
        <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="var(--border)" strokeWidth={1} />
        <line x1={W / 2} y1={PAD} x2={W / 2} y2={H - PAD} stroke="var(--border)" strokeWidth={1} />

        {/* Axis labels */}
        <text x={W - PAD + 4} y={H / 2 + 4} fill="var(--text-muted)" fontSize={9}>velocity →</text>
        <text x={W / 2 - 2} y={PAD - 6} fill="var(--text-muted)" fontSize={9} textAnchor="middle">gravity ↑</text>

        {/* Data points */}
        {narratives.map((n, i) => {
          const x = toX(n.velocity || 0);
          const y = toY(n.gravity || 0);
          const color = classColor[n.classification || ''] || 'var(--clr-accent)';
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={5} fill={color} opacity={0.8} />
              <text x={x + 7} y={y + 4} fill="var(--text-secondary)" fontSize={9}>
                {(n.name || '').substring(0, 20)}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
        {Object.entries({
          fad: 'Fad',
          early_emerging: 'Early Emerging',
          durable_ecosystem_forming: 'Durable',
          saturated: 'Saturated',
          crowded_euphoric: 'Crowded/Euphoric',
        }).map(([k, label]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: {
              fad: 'var(--clr-amber)',
              early_emerging: 'var(--clr-teal)',
              durable_ecosystem_forming: 'var(--clr-bullish)',
              saturated: 'var(--clr-bearish)',
              crowded_euphoric: 'var(--clr-orange)',
            }[k] || 'var(--clr-accent)', display: 'inline-block' }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// 3-point mini chart for expectation gap
function MiniEGChart({ embedded, observed, emerging }: { embedded?: number; observed?: number; emerging?: number }) {
  const points = [embedded, observed, emerging].map((v, i) => ({
    v: v || 0,
    label: ['Embed', 'Obs', 'Emrg'][i],
    color: ['var(--text-muted)', 'var(--clr-accent)', 'var(--clr-bullish)'][i],
  }));
  const W = 90;
  const H = 36;
  const PAD = 6;

  const minV = Math.min(...points.map((p) => p.v));
  const maxV = Math.max(...points.map((p) => p.v));
  const range = maxV - minV || 1;

  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - minV) / range) * (H - PAD * 2);

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.v)}`).join(' ');

  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <path d={pathD} fill="none" stroke="var(--border)" strokeWidth={1} />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.v)} r={3} fill={p.color} />
      ))}
    </svg>
  );
}

export default function EvidencePage() {
  const { data: gaps, loading: gapsLoading, error: gapsError } = useApi(() => api.expectationGaps());
  const { data: divs, loading: divsLoading, error: divsError } = useApi(() => api.realityDivergence());
  const { data: infoAdv, loading: iaLoading, error: iaError } = useApi(() => api.informationAdvantage());
  const { data: narratives, loading: nLoading, error: nError } = useApi(() => api.narratives());

  const [tab, setTab] = useState<'gaps' | 'divergence' | 'info' | 'narratives'>('gaps');

  const loading = gapsLoading || divsLoading || iaLoading || nLoading;
  const error = gapsError || divsError || iaError || nError;

  if (loading) return <Loading />;
  if (error) return <Loading error={error} />;

  return (
    <div>
      <div className="page-title">Evidence Explorer</div>
      <div className="page-subtitle">
        Expectation gaps, reality divergence, pre-consensus information advantage, and narrative monitoring
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        {(['gaps', 'divergence', 'info', 'narratives'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: tab === t ? 'var(--bg-surface2)' : 'transparent',
              border: '1px solid ' + (tab === t ? 'var(--clr-accent)' : 'var(--border)'),
              color: tab === t ? 'var(--clr-accent)' : 'var(--text-secondary)',
              padding: '5px 12px',
              borderRadius: 'var(--radius)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {t === 'gaps' ? 'Expectation Gaps' : t === 'divergence' ? 'Reality Divergence' : t === 'info' ? 'Info Advantage' : 'Narratives'}
          </button>
        ))}
      </div>

      {tab === 'gaps' && (
        <>
          <div className="section-title">Expectation Gap Analysis ({(gaps || []).length})</div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Mini Chart</th>
                  <th>Embedded</th>
                  <th>Observed</th>
                  <th>Emerging</th>
                  <th>Gap Score</th>
                  <th>Surprise Potential</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {(gaps || []).map((g, i) => (
                  <tr key={i}>
                    <td className="mono" style={{ color: 'var(--clr-accent)', fontWeight: 700 }}>{g.ticker}</td>
                    <td>
                      <MiniEGChart
                        embedded={g.embeddedExpectation}
                        observed={g.observedReality}
                        emerging={g.emergingReality}
                      />
                    </td>
                    <td className="mono">{g.embeddedExpectation?.toFixed(3)}</td>
                    <td className="mono">{g.observedReality?.toFixed(3)}</td>
                    <td className="mono" style={{ color: 'var(--clr-bullish)' }}>{g.emergingReality?.toFixed(3)}</td>
                    <td>
                      <Bar value={g.gapScore || 0} max={1} height={8} showValue />
                    </td>
                    <td>
                      <Bar value={g.surprisePotential || 0} max={1} height={8} color="var(--clr-teal)" showValue />
                    </td>
                    <td className="mono">{g.confidence !== undefined ? (g.confidence * 100).toFixed(0) + '%' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(gaps || []).length === 0 && <div className="table-empty">No expectation gap data.</div>}
        </>
      )}

      {tab === 'divergence' && (
        <>
          <div className="section-title">Reality Divergence ({(divs || []).length})</div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Mini Chart</th>
                  <th>Consensus</th>
                  <th>Observed</th>
                  <th>Emerging</th>
                  <th>Divergence</th>
                  <th>Surprise</th>
                  <th>Repricing</th>
                  <th>Conf</th>
                </tr>
              </thead>
              <tbody>
                {(divs || []).map((d, i) => (
                  <tr key={i}>
                    <td className="mono" style={{ color: 'var(--clr-accent)', fontWeight: 700 }}>{d.ticker}</td>
                    <td>
                      <MiniEGChart
                        embedded={d.consensusReality}
                        observed={d.observedReality}
                        emerging={d.emergingReality}
                      />
                    </td>
                    <td className="mono">{d.consensusReality?.toFixed(3)}</td>
                    <td className="mono">{d.observedReality?.toFixed(3)}</td>
                    <td className="mono" style={{ color: 'var(--clr-bullish)' }}>{d.emergingReality?.toFixed(3)}</td>
                    <td>
                      <Bar value={d.divergenceScore || 0} max={1} height={8} showValue />
                    </td>
                    <td className="mono">{d.surprisePotential?.toFixed(2)}</td>
                    <td className="mono">{d.repricingPotential?.toFixed(2)}</td>
                    <td className="mono">{d.confidence !== undefined ? (d.confidence * 100).toFixed(0) + '%' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(divs || []).length === 0 && <div className="table-empty">No reality divergence data.</div>}
        </>
      )}

      {tab === 'info' && (
        <>
          <div className="section-title">Pre-Consensus Information Advantage ({(infoAdv || []).length})</div>
          {(infoAdv || []).map((ia, i) => (
            <div key={i} className="info-advantage-item">
              <div className="ia-origin">{ia.origin}</div>
              <div className="ia-desc">{ia.description}</div>
              <div className="ia-meta">
                {ia.freshnessDays !== undefined && (
                  <span className="ia-tag">Freshness: {ia.freshnessDays}d</span>
                )}
                {ia.decayDays !== undefined && (
                  <span className="ia-tag">Decay: {ia.decayDays}d</span>
                )}
                {ia.preConsensusProbability !== undefined && (
                  <span className="ia-tag" style={{ color: 'var(--clr-bullish)' }}>
                    Pre-consensus: {(ia.preConsensusProbability * 100).toFixed(0)}%
                  </span>
                )}
                {(ia.affectedTickers || []).length > 0 && (
                  <span className="ia-tag">
                    Tickers: {(ia.affectedTickers || []).join(', ')}
                  </span>
                )}
                {(ia.affectedIndustries || []).length > 0 && (
                  <span className="ia-tag">
                    Industries: {(ia.affectedIndustries || []).join(', ')}
                  </span>
                )}
              </div>
            </div>
          ))}
          {(infoAdv || []).length === 0 && <div className="table-empty">No information advantage data.</div>}
        </>
      )}

      {tab === 'narratives' && (
        <>
          <NarrativeQuadrant narratives={narratives || []} />

          <div className="section-title">Narrative Registry ({(narratives || []).length})</div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Classification</th>
                  <th style={{ minWidth: 140 }}>Velocity</th>
                  <th style={{ minWidth: 140 }}>Gravity</th>
                  <th>Linked Theses</th>
                </tr>
              </thead>
              <tbody>
                {(narratives || []).map((n, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, fontSize: 12 }}>{n.name}</td>
                    <td>
                      {n.classification && (
                        <Pill label={n.classification.replace(/_/g, ' ')} variant={
                          n.classification === 'durable_ecosystem_forming' ? 'selective' :
                          n.classification === 'fad' ? 'watchlist_only' :
                          n.classification === 'crowded_euphoric' ? 'crowded' :
                          n.classification === 'early_emerging' ? 'emerging' : 'default'
                        } />
                      )}
                    </td>
                    <td>
                      <Bar value={n.velocity || 0} max={1} diverging height={8} showValue />
                    </td>
                    <td>
                      <Bar value={n.gravity || 0} max={1} height={8} color="var(--clr-purple)" showValue />
                    </td>
                    <td>
                      <div className="tag-list">
                        {(n.thesisIds || []).slice(0, 4).map((id, j) => (
                          <span key={j} className="tag">{id}</span>
                        ))}
                        {(n.thesisIds || []).length > 4 && (
                          <span className="tag">+{(n.thesisIds || []).length - 4}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(narratives || []).length === 0 && <div className="table-empty">No narrative data.</div>}
        </>
      )}
    </div>
  );
}
