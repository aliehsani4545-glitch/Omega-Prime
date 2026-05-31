'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { Loading } from '../../components/Loading';
import { Bar } from '../../components/Bar';
import type { CausalGraph, CausalQueryResult, CausalBeneficiary } from '../../lib/types';

const ORDER_LABELS = ['1st Order', '2nd Order', '3rd Order', '4th Order'];

function groupByOrder(items: CausalBeneficiary[]) {
  const map: Record<number, CausalBeneficiary[]> = {};
  items.forEach((item) => {
    const o = item.order || 1;
    if (!map[o]) map[o] = [];
    map[o].push(item);
  });
  return map;
}

// Simple SVG diagram: columns by order, nodes stacked vertically
function CausalSVG({ result }: { result: CausalQueryResult }) {
  const maxOrder = 4;
  const COL_W = 160;
  const ROW_H = 36;
  const PADDING = 16;
  const colX = (o: number) => PADDING + (o - 1) * (COL_W + 20);

  const grouped = groupByOrder(result.beneficiaries || []);
  const maxRows = Math.max(1, ...Object.values(grouped).map((a) => a.length));
  const svgH = Math.max(120, maxRows * ROW_H + 60);
  const svgW = (maxOrder + 0.5) * (COL_W + 20) + PADDING;

  const nodeColor = (w: number) => {
    if (w >= 0.6) return 'var(--clr-bullish)';
    if (w >= 0.3) return 'var(--clr-accent)';
    return 'var(--text-muted)';
  };

  return (
    <div className="causal-svg-wrapper">
      <div className="panel-title" style={{ marginBottom: 8 }}>Transmission Diagram</div>
      <svg width={svgW} height={svgH} style={{ display: 'block' }}>
        {/* Source node */}
        <rect x={PADDING} y={20} width={COL_W} height={24} rx={3}
          fill="rgba(88,166,255,0.15)" stroke="var(--clr-accent)" strokeWidth={1} />
        <text x={PADDING + COL_W / 2} y={36} textAnchor="middle"
          fill="var(--clr-accent)" fontSize={11} fontFamily="monospace">
          {result.from || 'source'}
        </text>

        {/* Column labels */}
        {Array.from({ length: maxOrder }, (_, i) => i + 1).map((order) => {
          const x = colX(order);
          return (
            <text key={order} x={x + COL_W / 2} y={16} textAnchor="middle"
              fill="var(--text-muted)" fontSize={9} fontFamily="sans-serif"
              textDecoration="uppercase">
              {ORDER_LABELS[order - 1] || `${order}th`}
            </text>
          );
        })}

        {/* Beneficiary nodes */}
        {Array.from({ length: maxOrder }, (_, i) => i + 1).map((order) => {
          const items = grouped[order] || [];
          return items.slice(0, 8).map((item, idx) => {
            const x = colX(order);
            const y = 50 + idx * ROW_H;
            const w = item.transmittedWeight || 0;
            return (
              <g key={`${order}-${idx}`}>
                <rect x={x} y={y} width={COL_W} height={24} rx={3}
                  fill="rgba(28,33,40,0.9)" stroke={nodeColor(w)} strokeWidth={1} />
                <text x={x + 6} y={y + 10} fill="var(--text-primary)" fontSize={10} fontFamily="monospace">
                  {(item.node?.ticker || item.node?.label || item.node?.id || '?').substring(0, 18)}
                </text>
                <text x={x + 6} y={y + 21} fill={nodeColor(w)} fontSize={9} fontFamily="monospace">
                  w={w.toFixed(2)}
                </text>
                {/* Arrow from previous column */}
                {order > 1 && (
                  <line
                    x1={colX(order - 1) + COL_W}
                    y1={50 + idx * ROW_H + 12}
                    x2={x}
                    y2={y + 12}
                    stroke="var(--border)"
                    strokeWidth={0.5}
                    strokeDasharray="3,3"
                  />
                )}
              </g>
            );
          });
        })}
      </svg>
    </div>
  );
}

export default function CausalPage() {
  const [fromNode, setFromNode] = useState('driver:hyperscaler_capex');
  const [maxOrder, setMaxOrder] = useState(3);
  const [minWeight, setMinWeight] = useState(0.1);
  const [querying, setQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<CausalQueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const [graph, setGraph] = useState<CausalGraph | null>(null);
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState<string | null>(null);

  useEffect(() => {
    api.causalGraph()
      .then(setGraph)
      .catch((e: unknown) => setGraphError(e instanceof Error ? e.message : String(e)))
      .finally(() => setGraphLoading(false));
  }, []);

  const handleQuery = useCallback(async () => {
    setQuerying(true);
    setQueryError(null);
    try {
      const result = await api.causalQuery({ from: fromNode, maxOrder, minWeight });
      setQueryResult(result);
    } catch (e: unknown) {
      setQueryError(e instanceof Error ? e.message : String(e));
    } finally {
      setQuerying(false);
    }
  }, [fromNode, maxOrder, minWeight]);

  const grouped = queryResult ? groupByOrder(queryResult.beneficiaries || []) : {};
  const ordersPresent = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  return (
    <div>
      <div className="page-title">Causal Graph Explorer</div>
      <div className="page-subtitle">Trace causal transmission paths through the market structure</div>

      <div className="causal-controls">
        <label>
          From Node:
          <input
            type="text"
            value={fromNode}
            onChange={(e) => setFromNode(e.target.value)}
            style={{ width: 260, marginLeft: 6 }}
            placeholder="e.g. driver:hyperscaler_capex"
          />
        </label>
        <div className="slider-row">
          <label>Max Order:</label>
          <input
            type="range" min={1} max={6} step={1}
            value={maxOrder}
            onChange={(e) => setMaxOrder(Number(e.target.value))}
          />
          <span className="slider-val">{maxOrder}</span>
        </div>
        <div className="slider-row">
          <label>Min Weight:</label>
          <input
            type="range" min={0} max={1} step={0.05}
            value={minWeight}
            onChange={(e) => setMinWeight(Number(e.target.value))}
          />
          <span className="slider-val">{minWeight.toFixed(2)}</span>
        </div>
        <button className="btn-query" onClick={handleQuery} disabled={querying}>
          {querying ? 'Querying…' : 'Run Query'}
        </button>
      </div>

      {queryError && <Loading error={queryError} />}

      {queryResult && (
        <>
          <div className="section-title">
            Beneficiaries from <span className="mono">{queryResult.from}</span>
          </div>

          {queryResult.beneficiaries && queryResult.beneficiaries.length > 0 && (
            <CausalSVG result={queryResult} />
          )}

          <div className="order-columns">
            {ordersPresent.slice(0, 4).map((order) => (
              <div key={order} className="order-col">
                <div className="order-col-title">{ORDER_LABELS[order - 1] || `Order ${order}`}</div>
                {(grouped[order] || []).map((item, i) => (
                  <div key={i} className="beneficiary-item">
                    <div className="beneficiary-label">
                      {item.node?.ticker && (
                        <span className="mono" style={{ color: 'var(--clr-accent)', marginRight: 4 }}>
                          {item.node.ticker}
                        </span>
                      )}
                      {item.node?.label || item.node?.id}
                    </div>
                    <div className="beneficiary-weight">
                      <Bar
                        value={item.transmittedWeight || 0}
                        max={1}
                        height={6}
                        showValue={true}
                      />
                    </div>
                    {(item.viaRelations || []).length > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        via: {(item.viaRelations || []).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
                {(grouped[order] || []).length === 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>None</span>
                )}
              </div>
            ))}
          </div>

          {(queryResult.bottlenecks || []).length > 0 && (
            <>
              <div className="section-title">Bottlenecks</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(queryResult.bottlenecks || []).map((b, i) => (
                  <div key={i} className="panel" style={{ minWidth: 200, flex: '1 1 200px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--clr-orange)', marginBottom: 4 }}>
                      {b.node?.label || b.node?.id}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Order {b.order} — weight {(b.transmittedWeight || 0).toFixed(3)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div className="section-title">Full Causal Graph</div>
      {graphLoading && <Loading />}
      {graphError && <Loading error={graphError} />}
      {graph && (
        <div className="two-col">
          <div className="panel">
            <div className="panel-title">Nodes ({(graph.nodes || []).length})</div>
            <div className="table-scroll" style={{ maxHeight: 340, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>ID</th><th>Type</th><th>Label</th><th>Ticker</th></tr>
                </thead>
                <tbody>
                  {(graph.nodes || []).map((n, i) => (
                    <tr key={i}>
                      <td className="mono" style={{ fontSize: 11 }}>{n.id}</td>
                      <td><span className="tag">{n.type}</span></td>
                      <td style={{ fontSize: 12 }}>{n.label}</td>
                      <td className="mono" style={{ color: 'var(--clr-accent)' }}>{n.ticker || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="panel">
            <div className="panel-title">Edges ({(graph.edges || []).length})</div>
            <div className="table-scroll" style={{ maxHeight: 340, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>From</th><th>To</th><th>Relation</th><th>W</th><th>Conf</th></tr>
                </thead>
                <tbody>
                  {(graph.edges || []).map((e, i) => (
                    <tr key={i}>
                      <td className="mono" style={{ fontSize: 10 }}>{e.from}</td>
                      <td className="mono" style={{ fontSize: 10 }}>{e.to}</td>
                      <td style={{ fontSize: 11 }}>{e.relation}</td>
                      <td className="mono">{e.weight?.toFixed(2)}</td>
                      <td className="mono">{e.confidence?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
