-- ============================================================
-- Migration: 20260422000000_initial_schema
-- FreelanceDoc — Initial schema with tables, indexes,
-- updated_at triggers, RLS enabled, and all RLS policies.
--
-- Run against Supabase via the dashboard SQL editor or:
--   psql $DIRECT_URL -f supabase/migrations/20260422000000_initial_schema.sql
--
-- IMPORTANT: This file is idempotent — tables/indexes use IF NOT EXISTS,
-- policies use DROP IF EXISTS + CREATE. Safe to re-run against an existing database.
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────────────
-- pgcrypto provides gen_random_uuid() (also available as uuid_generate_v4
-- via uuid-ossp, but pgcrypto is enabled by default in Supabase).
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── updated_at trigger function ───────────────────────────────────────────
-- Single shared function — attached to every table that has an updated_at
-- column. Prevents stale timestamps on partial updates.
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── Enum types ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE template_type AS ENUM ('PROPOSAL', 'CONTRACT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE document_status AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Table: users ──────────────────────────────────────────────────────────
-- Stores application users. NOT linked to auth.users (we use custom JWT).
-- The user's UUID is the `sub` claim in our JWT tokens, which Supabase
-- resolves via auth.uid() when the JWT_SECRET is configured in Supabase
-- Dashboard → Settings → API → JWT Settings.
--
-- Soft-delete pattern: set deleted_at instead of deleting rows.
-- Hard DELETE is blocked by missing RLS policy (deny-all default).
CREATE TABLE IF NOT EXISTS users (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255) NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  professional_name VARCHAR(255),
  document          VARCHAR(20),   -- CPF (11 digits) or CNPJ (14 digits)
  phone             VARCHAR(30),
  address           TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at  ON users(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE OR REPLACE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS — deny all by default until an explicit policy grants access
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated user reads only their own record
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- UPDATE: authenticated user updates only their own record
-- WITH CHECK ensures they cannot change their id to another user's id
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own"
  ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT: intentionally omitted — only the service role may create users.
-- DELETE: intentionally omitted — blocked by deny-all default; use soft delete.


-- ── Table: templates ──────────────────────────────────────────────────────
-- Stores reusable document templates per user.
-- content is a JSONB structure with variable placeholders like {{client_name}}.
CREATE TABLE IF NOT EXISTS templates (
  id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name       VARCHAR(255)   NOT NULL,
  type       template_type  NOT NULL,
  content    JSONB          NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);

CREATE OR REPLACE TRIGGER templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "templates_select_own" ON templates;
CREATE POLICY "templates_select_own"
  ON templates
  FOR SELECT
  USING (auth.uid() = user_id);

-- WITH CHECK enforces that user_id equals the authenticated user's UUID.
-- Combined with DEFAULT auth.uid() on the column, this prevents client-supplied
-- user_id values from being honoured.
DROP POLICY IF EXISTS "templates_insert_own" ON templates;
CREATE POLICY "templates_insert_own"
  ON templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "templates_update_own" ON templates;
CREATE POLICY "templates_update_own"
  ON templates
  FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "templates_delete_own" ON templates;
CREATE POLICY "templates_delete_own"
  ON templates
  FOR DELETE
  USING (auth.uid() = user_id);


-- ── Table: documents ──────────────────────────────────────────────────────
-- Stores proposals/contracts. Status transitions are validated in the
-- service layer (e.g., SENT documents cannot be modified).
-- Hard DELETE is blocked by missing RLS policy (deny-all default).
CREATE TABLE IF NOT EXISTS documents (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  template_id     UUID            REFERENCES templates(id) ON DELETE SET NULL,
  title           VARCHAR(255)    NOT NULL,
  client_name     VARCHAR(255)    NOT NULL,
  client_email    VARCHAR(255)    NOT NULL,
  client_document VARCHAR(20),
  content         JSONB           NOT NULL DEFAULT '{}',
  status          document_status NOT NULL DEFAULT 'DRAFT',
  total_value     NUMERIC(15, 2)  NOT NULL DEFAULT 0,
  currency        CHAR(3)         NOT NULL DEFAULT 'BRL',
  valid_until     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id        ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id_status ON documents(user_id, status);

CREATE OR REPLACE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_select_own" ON documents;
CREATE POLICY "documents_select_own"
  ON documents
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "documents_insert_own" ON documents;
CREATE POLICY "documents_insert_own"
  ON documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- SENT documents can still be reached by this policy, but the service layer
-- will reject any attempted mutation with a 403 before Prisma is called.
DROP POLICY IF EXISTS "documents_update_own" ON documents;
CREATE POLICY "documents_update_own"
  ON documents
  FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: intentionally omitted — documents are permanent records.


-- ── Table: document_versions ──────────────────────────────────────────────
-- Immutable audit trail. No client-initiated writes are permitted.
-- Only the service role (back-end API) may INSERT via Prisma.
CREATE TABLE IF NOT EXISTS document_versions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content     JSONB       NOT NULL,
  version     INTEGER     NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT document_versions_unique_version UNIQUE (document_id, version)
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- SELECT only — joins with documents to verify ownership.
-- No INSERT/UPDATE/DELETE policies → only service role can write.
DROP POLICY IF EXISTS "document_versions_select_own" ON document_versions;
CREATE POLICY "document_versions_select_own"
  ON document_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   documents d
      WHERE  d.id      = document_versions.document_id
        AND  d.user_id = auth.uid()
    )
  );

-- ── Verification query (run manually to confirm setup) ────────────────────
-- SELECT tablename, rowsecurity
-- FROM   pg_tables
-- WHERE  schemaname = 'public'
--   AND  tablename IN ('users', 'templates', 'documents', 'document_versions');
-- All rows should have rowsecurity = true.
