/**
 * Persistence adapters. Default is InMemoryRepository (no external deps).
 * PostgresRepository persists each run's snapshot for durability + replay;
 * full relational fan-out of the JSONB payload is an upgrade path.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { MemorySnapshot } from '../memory/store';

export interface Repository {
  readonly kind: 'memory' | 'postgres';
  init(): Promise<void>;
  saveSnapshot(snap: MemorySnapshot): Promise<number>;
  latestSnapshot(): Promise<MemorySnapshot | undefined>;
  close(): Promise<void>;
}

export class InMemoryRepository implements Repository {
  readonly kind = 'memory' as const;
  private snapshots: MemorySnapshot[] = [];
  async init(): Promise<void> {}
  async saveSnapshot(snap: MemorySnapshot): Promise<number> {
    this.snapshots.push(snap);
    return this.snapshots.length;
  }
  async latestSnapshot(): Promise<MemorySnapshot | undefined> {
    return this.snapshots[this.snapshots.length - 1];
  }
  async close(): Promise<void> {}
}

/** Postgres-backed repository (lazy-imports pg so 'memory' mode needs no driver). */
export class PostgresRepository implements Repository {
  readonly kind = 'postgres' as const;
  private pool: any;
  constructor(private connectionString: string) {}

  async init(): Promise<void> {
    const { Pool } = await import('pg');
    this.pool = new Pool({ connectionString: this.connectionString });
    const here = dirname(fileURLToPath(import.meta.url));
    const schema = readFileSync(join(here, 'schema.sql'), 'utf8');
    await this.pool.query(schema);
  }

  async saveSnapshot(snap: MemorySnapshot): Promise<number> {
    const res = await this.pool.query(
      'INSERT INTO runs (regime_label, operating_mode, snapshot) VALUES ($1,$2,$3) RETURNING id',
      [snap.regime?.label ?? null, snap.regime?.operatingMode ?? null, JSON.stringify(snap)],
    );
    return res.rows[0].id;
  }

  async latestSnapshot(): Promise<MemorySnapshot | undefined> {
    const res = await this.pool.query('SELECT snapshot FROM runs ORDER BY id DESC LIMIT 1');
    return res.rows[0]?.snapshot as MemorySnapshot | undefined;
  }

  async close(): Promise<void> {
    await this.pool?.end();
  }
}

export function buildRepository(): Repository {
  const backend = process.env.DATA_BACKEND ?? 'memory';
  if (backend === 'postgres') {
    const url = process.env.DATABASE_URL ?? 'postgresql://omega:omega@localhost:5432/omega';
    return new PostgresRepository(url);
  }
  return new InMemoryRepository();
}
