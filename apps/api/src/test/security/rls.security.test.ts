/**
 * RLS Security Tests
 * ─────────────────────────────────────────────────────────────────────────
 * These tests run against an ISOLATED Supabase test project.
 * They are intentionally separate from unit tests and require real
 * network connections to verify that RLS policies work at the database level.
 *
 * Prerequisites:
 *   1. Create a dedicated Supabase project for testing (never use production)
 *   2. Run the migration against it:
 *        psql $TEST_DATABASE_URL -f supabase/migrations/20260422000000_initial_schema.sql
 *   3. Configure Supabase JWT Settings to use your TEST_JWT_SECRET
 *        Dashboard → Settings → API → JWT Settings → JWT Secret
 *   4. Set in .env:
 *        TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_KEY, TEST_JWT_SECRET
 *
 * Run:
 *   npm run test:security --workspace=apps/api
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'

// ── Configuration ────────────────────────────────────────────────────────

const TEST_SUPABASE_URL      = process.env['TEST_SUPABASE_URL']
const TEST_SUPABASE_KEY      = process.env['TEST_SUPABASE_SERVICE_KEY']
const TEST_JWT_SECRET        = process.env['TEST_JWT_SECRET']

const isConfigured =
  Boolean(TEST_SUPABASE_URL) &&
  Boolean(TEST_SUPABASE_KEY) &&
  Boolean(TEST_JWT_SECRET)

const skip = !isConfigured
  ? '[SKIPPED — TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_KEY, and TEST_JWT_SECRET not set]'
  : null

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Creates a short-lived JWT signed with the test secret.
 * The `sub` claim becomes the user's id in RLS policies (auth.uid()).
 * The `role: "authenticated"` claim enables authenticated RLS policies.
 */
function makeUserJwt(userId: string): string {
  return jwt.sign(
    { sub: userId, email: `${userId}@test.com`, role: 'authenticated' },
    TEST_JWT_SECRET!,
    { expiresIn: '5m' },
  )
}

/** Supabase client authenticated as a specific user (respects RLS) */
function userClient(userId: string) {
  const token = makeUserJwt(userId)
  return createClient(TEST_SUPABASE_URL!, TEST_SUPABASE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

/** Supabase service-role client (bypasses RLS — for test setup/teardown only) */
function adminClient() {
  return createClient(TEST_SUPABASE_URL!, TEST_SUPABASE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ── Seed helpers ───────────────────────────────────────────────────────────

type SeedUser = { id: string; templateId?: string; documentId?: string }

async function seedUser(id: string): Promise<SeedUser> {
  const admin = adminClient()
  const { error } = await admin.from('users').insert({
    id,
    name: `Test User ${id.slice(0, 8)}`,
    email: `${id}@test.com`,
    password_hash: '$argon2id$v=19$m=65536,t=3,p=4$placeholder',
  })
  if (error) throw new Error(`seedUser failed: ${error.message}`)
  return { id }
}

async function seedTemplate(userId: string): Promise<string> {
  const admin = adminClient()
  const id = randomUUID()
  const { error } = await admin.from('templates').insert({
    id,
    user_id: userId,
    name: 'Test Template',
    type: 'PROPOSAL',
    content: {},
  })
  if (error) throw new Error(`seedTemplate failed: ${error.message}`)
  return id
}

async function seedDocument(userId: string): Promise<string> {
  const admin = adminClient()
  const id = randomUUID()
  const { error } = await admin.from('documents').insert({
    id,
    user_id: userId,
    title: 'Test Document',
    client_name: 'Client A',
    client_email: 'client@example.com',
    content: {},
    status: 'DRAFT',
    total_value: 1000,
  })
  if (error) throw new Error(`seedDocument failed: ${error.message}`)
  return id
}

async function cleanupUsers(ids: string[]): Promise<void> {
  const admin = adminClient()
  // Cascade: documents → templates → users (FK ON DELETE CASCADE not set, so order matters)
  await admin.from('documents').delete().in('user_id', ids)
  await admin.from('templates').delete().in('user_id', ids)
  await admin.from('users').delete().in('id', ids)
}

// ── Test state ─────────────────────────────────────────────────────────────

let userA: { id: string; templateId: string; documentId: string }
let userB: { id: string; templateId: string; documentId: string }

// ── Suite ─────────────────────────────────────────────────────────────────

describe.skipIf(skip !== null)('RLS — data isolation and policy enforcement', () => {

  beforeAll(async () => {
    const idA = randomUUID()
    const idB = randomUUID()

    await seedUser(idA)
    await seedUser(idB)

    const [templateIdA, documentIdA, templateIdB, documentIdB] = await Promise.all([
      seedTemplate(idA),
      seedDocument(idA),
      seedTemplate(idB),
      seedDocument(idB),
    ])

    userA = { id: idA, templateId: templateIdA, documentId: documentIdA }
    userB = { id: idB, templateId: templateIdB, documentId: documentIdB }
  })

  afterAll(async () => {
    if (userA && userB) {
      await cleanupUsers([userA.id, userB.id])
    }
  })

  // ── users table ─────────────────────────────────────────────────────────

  describe('users table', () => {
    it('user A can read their own record', async () => {
      const { data, error } = await userClient(userA.id)
        .from('users').select('id').eq('id', userA.id).single()
      expect(error).toBeNull()
      expect(data?.id).toBe(userA.id)
    })

    it('user A cannot read user B record (RLS isolation)', async () => {
      const { data, error } = await userClient(userA.id)
        .from('users').select('id').eq('id', userB.id)
      // RLS returns empty result set (not an error) when rows are filtered out
      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    it('unauthenticated request returns no user rows', async () => {
      // No JWT — anon role has no SELECT policy → empty result
      const anon = createClient(TEST_SUPABASE_URL!, TEST_SUPABASE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data } = await anon.from('users').select('id')
      expect(data).toHaveLength(0)
    })

    it('user A cannot delete their own row (no DELETE policy)', async () => {
      const { error } = await userClient(userA.id)
        .from('users').delete().eq('id', userA.id)
      expect(error).not.toBeNull()
    })
  })

  // ── templates table ─────────────────────────────────────────────────────

  describe('templates table', () => {
    it('user A can read their own templates', async () => {
      const { data, error } = await userClient(userA.id).from('templates').select('id')
      expect(error).toBeNull()
      expect(data?.map((t) => t.id)).toContain(userA.templateId)
    })

    it('user A cannot see user B templates (RLS isolation)', async () => {
      const { data, error } = await userClient(userA.id)
        .from('templates').select('id').eq('id', userB.templateId)
      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    it('user A cannot insert a template with user B id (user_id injection)', async () => {
      // Attempt to inject a different user_id — WITH CHECK rejects this
      const { error } = await userClient(userA.id).from('templates').insert({
        user_id: userB.id, // injected — must be rejected
        name: 'Injected Template',
        type: 'CONTRACT',
        content: {},
      })
      expect(error).not.toBeNull()
    })

    it('user A cannot update user B template', async () => {
      const { error } = await userClient(userA.id)
        .from('templates').update({ name: 'Hacked' }).eq('id', userB.templateId)
      // Either error or 0 rows affected (RLS filters USING clause)
      if (!error) {
        const { data } = await adminClient()
          .from('templates').select('name').eq('id', userB.templateId).single()
        expect(data?.name).not.toBe('Hacked')
      }
    })

    it('user A cannot delete user B template', async () => {
      const before = await adminClient()
        .from('templates').select('id').eq('id', userB.templateId)
      await userClient(userA.id).from('templates').delete().eq('id', userB.templateId)
      const after = await adminClient()
        .from('templates').select('id').eq('id', userB.templateId)
      expect(after.data).toHaveLength(before.data?.length ?? 1)
    })
  })

  // ── documents table ─────────────────────────────────────────────────────

  describe('documents table', () => {
    it('user A can read their own documents', async () => {
      const { data, error } = await userClient(userA.id).from('documents').select('id')
      expect(error).toBeNull()
      expect(data?.map((d) => d.id)).toContain(userA.documentId)
    })

    it('user A cannot see user B documents (RLS isolation)', async () => {
      const { data, error } = await userClient(userA.id)
        .from('documents').select('id').eq('id', userB.documentId)
      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    it('user A cannot insert a document with user B id (user_id injection)', async () => {
      const { error } = await userClient(userA.id).from('documents').insert({
        user_id: userB.id,
        title: 'Injected Doc',
        client_name: 'Client',
        client_email: 'c@example.com',
        content: {},
        total_value: 0,
      })
      expect(error).not.toBeNull()
    })

    it('user A cannot delete a document (no DELETE policy)', async () => {
      const { error } = await userClient(userA.id)
        .from('documents').delete().eq('id', userA.documentId)
      expect(error).not.toBeNull()
    })

    it('user A cannot delete user B document (no DELETE policy)', async () => {
      const { error } = await userClient(userA.id)
        .from('documents').delete().eq('id', userB.documentId)
      expect(error).not.toBeNull()
    })
  })

  // ── document_versions table ─────────────────────────────────────────────

  describe('document_versions table', () => {
    let versionId: string

    beforeAll(async () => {
      // Only service role may insert versions
      const admin = adminClient()
      versionId = randomUUID()
      await admin.from('document_versions').insert({
        id: versionId,
        document_id: userA.documentId,
        content: { snapshot: true },
        version: 1,
      })
    })

    it('user A can read versions of their own document', async () => {
      const { data, error } = await userClient(userA.id)
        .from('document_versions').select('id').eq('document_id', userA.documentId)
      expect(error).toBeNull()
      expect(data?.map((v) => v.id)).toContain(versionId)
    })

    it('user A cannot read versions of user B document', async () => {
      // Seed a version for user B document first
      const vIdB = randomUUID()
      await adminClient().from('document_versions').insert({
        id: vIdB, document_id: userB.documentId, content: {}, version: 1,
      })

      const { data, error } = await userClient(userA.id)
        .from('document_versions').select('id').eq('id', vIdB)
      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    it('user A cannot insert a document version (no INSERT policy)', async () => {
      const { error } = await userClient(userA.id).from('document_versions').insert({
        document_id: userA.documentId,
        content: {},
        version: 99,
      })
      expect(error).not.toBeNull()
    })

    it('user A cannot update a document version (no UPDATE policy)', async () => {
      const { error } = await userClient(userA.id)
        .from('document_versions').update({ content: { hacked: true } }).eq('id', versionId)
      expect(error).not.toBeNull()
    })

    it('user A cannot delete a document version (no DELETE policy)', async () => {
      const { error } = await userClient(userA.id)
        .from('document_versions').delete().eq('id', versionId)
      expect(error).not.toBeNull()
    })
  })
})
