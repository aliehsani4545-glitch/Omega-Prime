'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { useApi } from '../../lib/hooks';
import { api } from '../../lib/api';
import { Loading } from '../../components/Loading';
import { Pill } from '../../components/Pill';
import type { Alert, AlertSeverity } from '../../lib/types';

const SEV_ORDER: AlertSeverity[] = ['urgent', 'elevated', 'watch', 'info'];

function severityClass(sev: AlertSeverity | undefined) {
  return `alert-item alert-${sev || 'info'}`;
}

function AlertItem({
  alert,
  onAck,
}: {
  alert: Alert;
  onAck: (id: string) => void;
}) {
  const [acking, setAcking] = useState(false);

  const handleAck = async () => {
    if (!alert.id || acking) return;
    setAcking(true);
    try {
      await onAck(alert.id);
    } finally {
      setAcking(false);
    }
  };

  return (
    <div className={`${severityClass(alert.severity)}${alert.acknowledged ? ' alert-acked' : ''}`}>
      <div className="alert-body-col">
        <div className="alert-title">{alert.title}</div>
        {alert.body && <div className="alert-text">{alert.body}</div>}
        <div className="alert-meta">
          {alert.at && (
            <span>{new Date(alert.at).toLocaleString()}</span>
          )}
          {alert.severity && <Pill label={alert.severity.toUpperCase()} variant={alert.severity} />}
          {(alert.tickers || []).length > 0 && (
            <span>Tickers: {(alert.tickers || []).join(', ')}</span>
          )}
          {alert.srScore !== undefined && (
            <span className="mono">SR: {alert.srScore.toFixed(3)}</span>
          )}
          {alert.acknowledged && (
            <span style={{ color: 'var(--clr-bullish)' }}>✓ Acknowledged</span>
          )}
        </div>
      </div>
      {!alert.acknowledged && (
        <div className="alert-ack-col">
          <button className="btn-ack" onClick={handleAck} disabled={acking}>
            {acking ? '…' : 'Ack'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AlertsPage() {
  const { data: alerts, loading, error, refetch } = useApi(() => api.alerts());
  const [sevFilter, setSevFilter] = useState('');
  const [showAcked, setShowAcked] = useState(false);

  if (loading) return <Loading />;
  if (error) return <Loading error={error} />;

  const handleAck = async (id: string) => {
    await api.acknowledgeAlert(id);
    refetch();
  };

  const filtered = (alerts || [])
    .filter((a) => !sevFilter || a.severity === sevFilter)
    .filter((a) => showAcked || !a.acknowledged)
    .sort((a, b) => {
      const ai = SEV_ORDER.indexOf(a.severity as AlertSeverity);
      const bi = SEV_ORDER.indexOf(b.severity as AlertSeverity);
      return ai - bi;
    });

  const counts: Record<string, number> = {};
  const unacked = (alerts || []).filter((a) => !a.acknowledged);
  unacked.forEach((a) => {
    if (a.severity) counts[a.severity] = (counts[a.severity] || 0) + 1;
  });

  return (
    <div>
      <div className="page-title">Alert Center</div>
      <div className="page-subtitle">
        {unacked.length} unacknowledged alerts — {(alerts || []).length} total
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {SEV_ORDER.map((sev) => (
          <div key={sev} className="stat-card" style={{ minWidth: 110, flex: '0 0 auto', padding: '10px 14px' }}>
            <div className="stat-label">{sev.toUpperCase()}</div>
            <div className="stat-value">{counts[sev] || 0}</div>
          </div>
        ))}
      </div>

      <div className="filter-row">
        <label>
          Severity:
          <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}>
            <option value="">All</option>
            {SEV_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <input
            type="checkbox"
            checked={showAcked}
            onChange={(e) => setShowAcked(e.target.checked)}
          />
          Show acknowledged
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="table-empty">No alerts match the current filter.</div>
      ) : (
        filtered.map((alert) => (
          <AlertItem key={alert.id} alert={alert} onAck={handleAck} />
        ))
      )}
    </div>
  );
}
