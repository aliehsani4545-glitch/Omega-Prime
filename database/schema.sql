-- ======================================================================
-- Omega Prime X — PostgreSQL schema
-- ----------------------------------------------------------------------
-- The platform runs fully in-memory by default. This schema enables
-- durable persistence + event replay when DATA_BACKEND=postgres.
-- pgvector is provisioned for future evidence/embedding similarity search.
-- ======================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- pgvector is provided by the pgvector/pgvector image; enable when present.
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector not available; continuing without vector type';
END $$;

-- Each pipeline execution is an immutable run (event replay friendly).
CREATE TABLE IF NOT EXISTS runs (
  id          BIGSERIAL PRIMARY KEY,
  run_uuid    UUID NOT NULL DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  regime_label TEXT,
  operating_mode TEXT,
  snapshot    JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS regimes (
  id          TEXT PRIMARY KEY,
  run_id      BIGINT REFERENCES runs(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  operating_mode TEXT NOT NULL,
  confidence  REAL NOT NULL,
  explanation TEXT,
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS theses (
  id          TEXT PRIMARY KEY,
  run_id      BIGINT REFERENCES runs(id) ON DELETE CASCADE,
  identity    TEXT NOT NULL,
  category    TEXT NOT NULL,
  status      TEXT NOT NULL,
  conviction  REAL NOT NULL,
  confidence  REAL NOT NULL,
  crowding    REAL NOT NULL,
  payload     JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidates (
  id          TEXT PRIMARY KEY,
  run_id      BIGINT REFERENCES runs(id) ON DELETE CASCADE,
  ticker      TEXT NOT NULL,
  company     TEXT NOT NULL,
  tier        TEXT NOT NULL,
  eep         REAL NOT NULL,
  sr_score    REAL NOT NULL,
  setup_stage TEXT NOT NULL,
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_candidates_ticker ON candidates(ticker);
CREATE INDEX IF NOT EXISTS idx_candidates_tier ON candidates(tier);

CREATE TABLE IF NOT EXISTS signals (
  id          TEXT PRIMARY KEY,
  run_id      BIGINT REFERENCES runs(id) ON DELETE CASCADE,
  family      TEXT NOT NULL,
  ticker      TEXT,
  value       REAL NOT NULL,
  velocity    REAL NOT NULL,
  is_inflection BOOLEAN NOT NULL,
  payload     JSONB NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_signals_family ON signals(family);

CREATE TABLE IF NOT EXISTS alerts (
  id          TEXT PRIMARY KEY,
  run_id      BIGINT REFERENCES runs(id) ON DELETE CASCADE,
  severity    TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  payload     JSONB NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id          TEXT PRIMARY KEY,
  run_id      BIGINT REFERENCES runs(id) ON DELETE CASCADE,
  actor       TEXT NOT NULL,
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  note        TEXT,
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_records (
  id          TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL,
  subject_id  TEXT NOT NULL,
  ticker      TEXT,
  regime_at_creation TEXT,
  outcome     TEXT NOT NULL DEFAULT 'pending',
  realized_return REAL,
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Future: evidence embeddings for similarity search.
-- CREATE TABLE evidence_embeddings (id TEXT PRIMARY KEY, embedding vector(768), payload JSONB);
