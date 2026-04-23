-- ============================================================
-- FreelanceDoc — Development Seed Data (SQL version)
-- Run: psql $DIRECT_URL -f supabase/seed.sql
-- WARNING: Only for development environments.
--
-- For the Prisma-based seed (recommended), use:
--   npm run db:seed --workspace=apps/api
--
-- This SQL seed is useful for quick resets via psql/Supabase dashboard.
-- Passwords below are argon2id hashes of "Seed@12345!" (dev only).
-- ============================================================

-- Truncate in reverse FK order before re-seeding
TRUNCATE TABLE document_versions RESTART IDENTITY CASCADE;
TRUNCATE TABLE documents         RESTART IDENTITY CASCADE;
TRUNCATE TABLE templates         RESTART IDENTITY CASCADE;
TRUNCATE TABLE users             RESTART IDENTITY CASCADE;

-- ── Users ─────────────────────────────────────────────────────────────────
INSERT INTO users (id, name, email, password_hash, professional_name, document, phone, address) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Alice Freelancer',
    'alice@freelancedoc.dev',
    -- argon2id hash of "Seed@12345!" — dev only, never use in production
    '$argon2id$v=19$m=65536,t=3,p=4$devSaltAlice123456789012$devHashPlaceholderForAlice00000000',
    'Alice Dev Studio',
    '12345678901',
    '+55 11 91234-5678',
    'Rua das Flores, 123 — São Paulo, SP'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Bob Designer',
    'bob@freelancedoc.dev',
    '$argon2id$v=19$m=65536,t=3,p=4$devSaltBob1234567890123$devHashPlaceholderForBob000000000',
    'Bob Creative',
    '98765432100',
    '+55 21 99876-5432',
    'Av. Copacabana, 456 — Rio de Janeiro, RJ'
  );

-- ── Templates ──────────────────────────────────────────────────────────────
INSERT INTO templates (id, user_id, name, type, content) VALUES
  (
    '11111111-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Web Development Proposal',
    'PROPOSAL',
    '{"blocks": [{"type": "heading", "value": "Project Proposal — {{project_name}}"}]}'::jsonb
  ),
  (
    '11111111-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Freelance Service Contract',
    'CONTRACT',
    '{"blocks": [{"type": "heading", "value": "Service Agreement"}]}'::jsonb
  ),
  (
    '22222222-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'Brand Design Proposal',
    'PROPOSAL',
    '{"blocks": [{"type": "heading", "value": "Design Proposal for {{client_name}}"}]}'::jsonb
  );

-- ── Documents ──────────────────────────────────────────────────────────────
INSERT INTO documents (id, user_id, template_id, title, client_name, client_email, content, status, total_value, currency, valid_until) VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000001',
    'Website Redesign Proposal — Acme Corp',
    'Acme Corporation',
    'cto@acme.example.com',
    '{"blocks": [{"type": "heading", "value": "Website Redesign"}]}'::jsonb,
    'DRAFT',
    8500.00,
    'BRL',
    NOW() + INTERVAL '30 days'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000002',
    'Service Contract — TechStart Ltd',
    'TechStart Ltd',
    'legal@techstart.example.com',
    '{"blocks": [{"type": "heading", "value": "Service Agreement"}]}'::jsonb,
    'SENT',
    24000.00,
    'BRL',
    NOW() + INTERVAL '15 days'
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '22222222-0000-0000-0000-000000000001',
    'Brand Identity Proposal — Startup X',
    'Startup X',
    'founder@startupx.example.com',
    '{"blocks": [{"type": "heading", "value": "Design Proposal"}]}'::jsonb,
    'DRAFT',
    4200.00,
    'BRL',
    NOW() + INTERVAL '14 days'
  );

-- ── Document Versions ──────────────────────────────────────────────────────
INSERT INTO document_versions (document_id, content, version) VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    '{"blocks": [{"type": "heading", "value": "Service Agreement"}]}'::jsonb,
    1
  );
