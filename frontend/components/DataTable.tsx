'use client';
import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  keyFn?: (row: T, idx: number) => string;
  emptyMessage?: string;
}

export function DataTable<T extends object>({
  columns,
  rows,
  onRowClick,
  keyFn,
  emptyMessage = 'No data available.',
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <div className="table-empty">{emptyMessage}</div>;
  }

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={keyFn ? keyFn(row, idx) : idx}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'clickable' : undefined}
            >
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
