-- ============================================================
-- FreelanceDoc — RLS Policies
-- All tables have RLS enabled with DENY ALL as the default.
-- Policies follow the principle of least privilege.
--
-- This file documents every RLS policy in the database.
-- All policies are also included in the corresponding migration files.
-- ============================================================

-- ── users ────────────────────────────────────────────────────────────────
-- RLS is enabled; no access is permitted without an explicit policy.
-- INSERT is blocked for clients — only the service role can create users.
-- DELETE is blocked permanently; use soft delete via deletedAt.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only read their own record
CREATE POLICY "users_select_own"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can only update their own record
CREATE POLICY "users_update_own"
  ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT and DELETE are intentionally omitted (denied by default)


-- ── templates ────────────────────────────────────────────────────────────
-- user_id is set via DEFAULT auth.uid() — never accepted from the client.

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Users can only read their own templates
CREATE POLICY "templates_select_own"
  ON templates
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert templates under their own user_id
-- The user_id column has DEFAULT auth.uid() so any client-supplied value
-- is overridden by the database.
CREATE POLICY "templates_insert_own"
  ON templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own templates
CREATE POLICY "templates_update_own"
  ON templates
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own templates
CREATE POLICY "templates_delete_own"
  ON templates
  FOR DELETE
  USING (auth.uid() = user_id);


-- ── documents ────────────────────────────────────────────────────────────
-- DELETE is blocked — documents are immutable after status = SENT.
-- Immutability of SENT documents is also enforced at the service layer.

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Users can only read their own documents
CREATE POLICY "documents_select_own"
  ON documents
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert documents under their own user_id
CREATE POLICY "documents_insert_own"
  ON documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own documents
-- Note: status transition DRAFT→SENT is also validated in the service layer
CREATE POLICY "documents_update_own"
  ON documents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE is intentionally omitted (denied by default)


-- ── document_versions ────────────────────────────────────────────────────
-- Immutable audit trail — only the service role can insert.
-- No client-initiated updates or deletes are ever permitted.

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Users can only read versions of documents they own (via join)
CREATE POLICY "document_versions_select_own"
  ON document_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM documents d
      WHERE d.id = document_versions.document_id
        AND d.user_id = auth.uid()
    )
  );

-- INSERT, UPDATE, DELETE are intentionally omitted (denied by default)
-- Only the service role (back-end API) may insert document versions
