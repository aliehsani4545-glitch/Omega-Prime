'use client';
export const dynamic = 'force-dynamic';

import React from 'react';
import { useApi } from '../../lib/hooks';
import { api } from '../../lib/api';
import { Loading } from '../../components/Loading';
import { Pill } from '../../components/Pill';
import { Bar } from '../../components/Bar';
import type { DebateVerdict, DebateRound } from '../../lib/types';

function WinnerPill({ winner }: { winner: DebateVerdict['winner'] }) {
  if (winner === 'bull') return <Pill label="Bull Wins" variant="bullish" />;
  if (winner === 'skeptic') return <Pill label="Skeptic Wins" variant="bearish" />;
  return <Pill label="Contested" variant="watch" />;
}

function RoundGroup({ rounds, side }: { rounds: DebateRound[]; side: 'bull' | 'skeptic' }) {
  const filtered = rounds.filter((r) => r.side === side);
  if (filtered.length === 0) return null;
  const isBull = side === 'bull';
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          color: isBull ? 'var(--clr-bullish)' : 'var(--clr-bearish)',
          marginBottom: 6,
        }}
      >
        {isBull ? 'Bull Claims' : 'Skeptic Claims'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((round, i) => (
          <div
            key={i}
            style={{
              padding: '8px 10px',
              background: 'var(--bg-surface2)',
              border: `1px solid ${isBull ? 'rgba(63,185,80,0.15)' : 'rgba(248,81,73,0.15)'}`,
              borderRadius: 4,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.5 }}>
              {round.claim}
            </div>
            <Bar
              value={round.strength}
              max={1}
              color={isBull ? 'var(--clr-bullish)' : 'var(--clr-bearish)'}
              showValue
              height={6}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DebateCard({ verdict }: { verdict: DebateVerdict }) {
  const totalForce = (verdict.bullForce ?? 0) + (verdict.skepticForce ?? 0);
  const bullPct = totalForce > 0 ? (verdict.bullForce ?? 0) / totalForce : 0.5;
  const skepticPct = totalForce > 0 ? (verdict.skepticForce ?? 0) / totalForce : 0.5;

  const delta = verdict.convictionDelta ?? 0;

  return (
    <div
      className="panel"
      style={{ marginBottom: 16 }}
    >
      {/* Card header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
          {verdict.ticker ?? '—'}
        </span>
        <WinnerPill winner={verdict.winner} />
        {delta !== 0 && (
          <span
            className="mono"
            style={{
              fontSize: 12,
              color: delta >= 0 ? 'var(--clr-bullish)' : 'var(--clr-bearish)',
              marginLeft: 'auto',
            }}
          >
            Conviction delta: {delta >= 0 ? '+' : ''}{delta.toFixed(3)}
          </span>
        )}
      </div>

      {/* Bull vs skeptic force bars */}
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
          Force Breakdown
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="bar-wrapper">
            <span
              className="bar-label"
              style={{ color: 'var(--clr-bullish)', minWidth: 80, fontSize: 12 }}
            >
              Bull
            </span>
            <div className="bar-track" style={{ height: 10 }}>
              <div
                className="bar-fill"
                style={{
                  left: 0,
                  width: `${bullPct * 100}%`,
                  background: 'var(--clr-bullish)',
                  height: '100%',
                }}
              />
            </div>
            <span className="bar-value mono">
              {verdict.bullForce !== undefined ? verdict.bullForce.toFixed(2) : '—'}
            </span>
          </div>
          <div className="bar-wrapper">
            <span
              className="bar-label"
              style={{ color: 'var(--clr-bearish)', minWidth: 80, fontSize: 12 }}
            >
              Skeptic
            </span>
            <div className="bar-track" style={{ height: 10 }}>
              <div
                className="bar-fill"
                style={{
                  left: 0,
                  width: `${skepticPct * 100}%`,
                  background: 'var(--clr-bearish)',
                  height: '100%',
                }}
              />
            </div>
            <span className="bar-value mono">
              {verdict.skepticForce !== undefined ? verdict.skepticForce.toFixed(2) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Rounds */}
      {(verdict.rounds || []).length > 0 && (
        <div className="two-col" style={{ marginBottom: 14 }}>
          <RoundGroup rounds={verdict.rounds || []} side="bull" />
          <RoundGroup rounds={verdict.rounds || []} side="skeptic" />
        </div>
      )}

      {/* Rationale */}
      {verdict.rationale && (
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            padding: '10px 12px',
            background: 'var(--bg-surface2)',
            borderLeft: '3px solid var(--clr-accent)',
            borderRadius: '0 4px 4px 0',
          }}
        >
          {verdict.rationale}
        </div>
      )}
    </div>
  );
}

export default function DebatesPage() {
  const { data: verdicts, loading, error } = useApi(() => api.debates());

  if (loading) return <Loading />;
  if (error) return <Loading error={error} />;

  const list = verdicts || [];

  const bullWins = list.filter((v) => v.winner === 'bull').length;
  const skepticWins = list.filter((v) => v.winner === 'skeptic').length;
  const contested = list.filter((v) => v.winner === 'contested').length;

  return (
    <div>
      <div className="page-title">Reconciliation Debates</div>
      <div className="page-subtitle">
        Bull vs. skeptic adversarial debates — each ticker is evaluated across multiple claim rounds
        with per-claim strength scoring and a conviction delta
      </div>

      {list.length > 0 && (
        <div className="stat-cards" style={{ marginBottom: 24 }}>
          <div className="stat-card" style={{ borderTopColor: 'var(--clr-bullish)' }}>
            <div className="stat-label">Bull Wins</div>
            <div className="stat-value mono">{bullWins}</div>
          </div>
          <div className="stat-card" style={{ borderTopColor: 'var(--clr-bearish)' }}>
            <div className="stat-label">Skeptic Wins</div>
            <div className="stat-value mono">{skepticWins}</div>
          </div>
          <div className="stat-card" style={{ borderTopColor: 'var(--clr-amber)' }}>
            <div className="stat-label">Contested</div>
            <div className="stat-value mono">{contested}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Tickers</div>
            <div className="stat-value mono">{list.length}</div>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="table-empty">No debate verdicts available.</div>
      ) : (
        list.map((verdict, i) => (
          <DebateCard key={verdict.ticker ?? i} verdict={verdict} />
        ))
      )}
    </div>
  );
}
