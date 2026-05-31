'use client';
export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import { useApi } from '../../../lib/hooks';
import { api } from '../../../lib/api';
import { Loading } from '../../../components/Loading';
import { Pill } from '../../../components/Pill';
import { Bar } from '../../../components/Bar';
import { StatCard } from '../../../components/StatCard';

const COMPONENT_LABELS: Record<string, string> = {
  realityDivergence: 'Reality Divergence',
  expectationGap: 'Expectation Gap',
  regimeFit: 'Regime Fit',
  thesisSupport: 'Thesis Support',
  causalPositioning: 'Causal Positioning',
  narrativeStrength: 'Narrative Strength',
  narrativeGravity: 'Narrative Gravity',
  revisions: 'Revisions',
  relativeStrength: 'Relative Strength',
  catalystQuality: 'Catalyst Quality',
  flowSponsorship: 'Flow Sponsorship',
  valuationVsEmbedded: 'Valuation vs Embedded',
  balanceSheetResilience: 'Balance Sheet',
  liquidity: 'Liquidity',
  crowdingRisk: 'Crowding Risk (inv)',
  fragilityRisk: 'Fragility Risk (inv)',
};

interface PageProps {
  params: { ticker: string };
}

export default function CandidateDetailPage({ params }: PageProps) {
  const { ticker } = params;
  const { data: c, loading, error } = useApi(() => api.candidate(ticker));

  if (loading) return <Loading />;
  if (error) return <Loading error={error} />;
  if (!c) return <div className="table-empty">Candidate not found.</div>;

  const components = c.components || {};
  const verdict = c.skepticVerdict;

  return (
    <div>
      <Link href="/candidates" className="back-link">← Candidates</Link>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <span className="regime-title mono">{c.ticker}</span>
        <span style={{ fontSize: 18, color: 'var(--text-secondary)' }}>{c.company}</span>
        {c.tier && <Pill label={c.tier} variant={c.tier} />}
        {c.setupStage && <Pill label={c.setupStage} variant="default" />}
      </div>

      {c.theme && (
        <div style={{ marginBottom: 16 }}>
          <span className="tag">{c.theme}</span>
        </div>
      )}

      <div className="stat-cards">
        <StatCard label="EEP" value={c.eep !== undefined ? (c.eep * 100).toFixed(1) + '%' : '—'} />
        <StatCard label="SR Score" value={c.srScore !== undefined ? c.srScore.toFixed(3) : '—'} />
        <StatCard label="Regime Fit" value={c.regimeFit !== undefined ? c.regimeFit.toFixed(3) : '—'} />
        <StatCard label="Conviction" value={c.conviction !== undefined ? (c.conviction * 100).toFixed(0) + '%' : '—'} />
        <StatCard label="Confidence" value={c.confidence !== undefined ? (c.confidence * 100).toFixed(0) + '%' : '—'} />
        <StatCard label="Crowding Risk" value={c.crowdingRisk !== undefined ? (c.crowdingRisk * 100).toFixed(0) + '%' : '—'} />
        <StatCard
          label="Time Horizon"
          value={c.timeHorizonDays !== undefined ? `${c.timeHorizonDays}d` : '—'}
        />
        <StatCard
          label="Catalyst Window"
          value={c.catalystWindowDays !== undefined ? `${c.catalystWindowDays}d` : '—'}
        />
      </div>

      <div className="two-col">
        <div>
          {c.whyNow && (
            <div className="panel" style={{ marginBottom: 12 }}>
              <div className="panel-title">Why Now</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c.whyNow}</p>
            </div>
          )}
          {c.whyNotObvious && (
            <div className="panel" style={{ marginBottom: 12 }}>
              <div className="panel-title">Why Not Obvious</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c.whyNotObvious}</p>
            </div>
          )}
          {c.supportingThesis && (
            <div className="panel" style={{ marginBottom: 12 }}>
              <div className="panel-title">Supporting Thesis</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c.supportingThesis}</p>
            </div>
          )}
          {c.portfolioRole && (
            <div className="panel" style={{ marginBottom: 12 }}>
              <div className="panel-title">Portfolio Role</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{c.portfolioRole}</p>
            </div>
          )}

          {(c.catalysts || []).length > 0 && (
            <div className="panel" style={{ marginBottom: 12 }}>
              <div className="panel-title">Catalysts</div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(c.catalysts || []).map((cat, i) => (
                  <li key={i} className="evidence-item">
                    <span className="evidence-bullet">+</span>
                    <span>{cat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(c.contrarianRisks || []).length > 0 && (
            <div className="panel" style={{ marginBottom: 12 }}>
              <div className="panel-title">Contrarian Risks</div>
              <div className="tag-list">
                {(c.contrarianRisks || []).map((r, i) => (
                  <span key={i} className="tag" style={{ color: 'var(--clr-bearish)', borderColor: 'rgba(248,81,73,0.3)' }}>
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(c.invalidationTriggers || []).length > 0 && (
            <div className="panel">
              <div className="panel-title">Invalidation Triggers</div>
              <div className="tag-list">
                {(c.invalidationTriggers || []).map((r, i) => (
                  <span key={i} className="tag" style={{ color: 'var(--clr-orange)', borderColor: 'rgba(219,109,40,0.3)' }}>
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          {Object.keys(components).length > 0 && (
            <div className="panel" style={{ marginBottom: 12 }}>
              <div className="panel-title">SR Components (16)</div>
              <div className="component-bars">
                {Object.entries(components).map(([key, val]) => (
                  <Bar
                    key={key}
                    label={COMPONENT_LABELS[key] || key}
                    value={val as number}
                    max={1}
                    showValue
                    height={8}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {verdict && (
        <div className="panel">
          <div className="panel-title">
            Skeptic Verdict
            {verdict.skepticWins !== undefined && (
              <span
                className="rec-badge"
                style={{ marginLeft: 8 }}
                data-verdict={verdict.skepticWins ? 'wins' : 'loses'}
              >
                {verdict.skepticWins
                  ? <span className="refuted-badge refuted-no">SKEPTIC WINS</span>
                  : <span className="refuted-badge refuted-yes">THESIS HOLDS</span>}
              </span>
            )}
          </div>
          {verdict.aggregateSeverity !== undefined && (
            <div style={{ marginBottom: 12 }}>
              <Bar
                label="Aggregate Severity"
                value={verdict.aggregateSeverity}
                max={1}
                color="var(--clr-bearish)"
                showValue
              />
            </div>
          )}
          {(verdict.objections || []).map((obj, i) => (
            <div key={i} className="objection-item">
              <div className="objection-angle">
                {obj.angle}
                {obj.severity !== undefined && (
                  <span className="mono" style={{ marginLeft: 8, color: 'var(--text-muted)' }}>
                    sev: {obj.severity.toFixed(2)}
                  </span>
                )}
                {obj.refuted !== undefined && (
                  <span className={`refuted-badge ${obj.refuted ? 'refuted-yes' : 'refuted-no'}`}>
                    {obj.refuted ? 'Refuted' : 'Stands'}
                  </span>
                )}
              </div>
              <div className="objection-statement">{obj.statement}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
