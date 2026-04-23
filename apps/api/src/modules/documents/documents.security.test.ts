/**
 * Documents & DocumentVersions — RLS Security Tests
 *
 * Verifies that Supabase Row Level Security on the `documents` and
 * `document_versions` tables:
 *
 * documents:
 *   - Allows a user to SELECT their own documents
 *   - Prevents a user from SELECTing another user's documents
 *   - Allows a user to INSERT documents (user_id from auth.uid())
 *   - Prevents spoofing user_id on INSERT
 *   - Allows a user to UPDATE their own documents
 *   - Prevents a user from UPDATEing another user's documents
 *   - Blocks all DELETEs (documents are immutable once SENT)
 *
 * document_versions:
 *   - Allows a user to SELECT versions of their own documents
 *   - Prevents a user from SELECTing versions of another user's documents
 *   - Blocks client-role INSERT (service role only)
 *   - Blocks client-role UPDATE and DELETE
 *
 * Run with: npm run test:security --workspace=apps/api
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { userClient, serviceClient } from '@/shared/config/supabase'
import {
  createTestUser,
  createTestDocument,
  teardownSecurityFixture,
  type TestUser,
  type TestDocument,
} from '@/test/security-helpers'

const RUN = !!process.env['TEST_SUPABASE_URL']

describe.skipIf(!RUN)('RLS — documents table', () => {
  let userA: TestUser
  let userB: TestUser
  let documentA: TestDocument

  beforeAll(async () => {
    userA = await createTestUser('docs_rls_a')
    userB = await createTestUser('docs_rls_b')
    documentA = await createTestDocument(userA.id)
  })

  afterAll(async () => {
    await teardownSecurityFixture([userA.id, userB.id])
  })

  // ── SELECT ───────────────────────────────────────────────────────────────

  it('allows user A to read their own documents', async () => {
    const { data, error } = await userClient(userA.accessToken)
      .from('documents')
      .select('id, user_id')

    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(1)
    const ids = data!.map((d: { id: string }) => d.id)
    expect(ids).toContain(documentA.id)
  })

  it('prevents user B from reading user A documents (returns empty)', async () => {
    const { data, error } = await userClient(userB.accessToken)
      .from('documents')
      .select('id')
      .eq('id', documentA.id)

    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('SELECT * returns only the requesting user own documents', async () => {
    const documentB = await createTestDocument(userB.id)

    const { data: dataA } = await userClient(userA.accessToken)
      .from('documents')
      .select('id')
    const idsA = (dataA ?? []).map((d: { id: string }) => d.id)
    expect(idsA).toContain(documentA.id)
    expect(idsA).not.toContain(documentB.id)

    const { data: dataB } = await userClient(userB.accessToken)
      .from('documents')
      .select('id')
    const idsB = (dataB ?? []).map((d: { id: string }) => d.id)
    expect(idsB).toContain(documentB.id)
    expect(idsB).not.toContain(documentA.id)
  })

  // ── INSERT ───────────────────────────────────────────────────────────────

  it('allows user A to insert a document (user_id from auth.uid())', async () => {
    const { data, error } = await userClient(userA.accessToken)
      .from('documents')
      .insert({
        title: 'Insert Test Doc',
        client_name: 'Insert Client',
        client_email: 'insert@security-test.local',
        content: { blocks: [] },
        total_value: 50.0,
        currency: 'BRL',
        status: 'DRAFT',
      })
      .select('id, user_id')
      .single()

    expect(error).toBeNull()
    expect(data).toBeTruthy()
    expect((data as { user_id: string }).user_id).toBe(userA.id)
  })

  it('prevents spoofing user_id with user B id on document INSERT', async () => {
    const { error } = await userClient(userA.accessToken)
      .from('documents')
      .insert({
        user_id: userB.id,
        title: 'Spoofed Doc',
        client_name: 'Spoof Client',
        client_email: 'spoof@security-test.local',
        content: { blocks: [] },
        total_value: 0,
        currency: 'BRL',
        status: 'DRAFT',
      })

    expect(error).not.toBeNull()
  })

  // ── UPDATE ───────────────────────────────────────────────────────────────

  it('allows user A to update their own document', async () => {
    const { error } = await userClient(userA.accessToken)
      .from('documents')
      .update({ title: 'Updated by A' })
      .eq('id', documentA.id)

    expect(error).toBeNull()
  })

  it('prevents user B from updating user A document (no rows affected)', async () => {
    const { error, count } = await userClient(userB.accessToken)
      .from('documents')
      .update({ title: 'Hacked by B' })
      .eq('id', documentA.id)
      .select()

    expect(error).toBeNull()
    expect(count).toBeFalsy()
  })

  // ── DELETE ───────────────────────────────────────────────────────────────

  it('blocks client-role DELETE on documents (no DELETE policy)', async () => {
    const { error, count } = await userClient(userA.accessToken)
      .from('documents')
      .delete()
      .eq('id', documentA.id)
      .select()

    // No DELETE policy — RLS blocks it
    expect(error).not.toBeNull()
    expect(count).toBeFalsy()
  })
})

describe.skipIf(!RUN)('RLS — document_versions table', () => {
  let userA: TestUser
  let userB: TestUser
  let documentA: TestDocument
  let versionId: string

  beforeAll(async () => {
    userA = await createTestUser('docver_rls_a')
    userB = await createTestUser('docver_rls_b')
    documentA = await createTestDocument(userA.id)

    // Insert a version via service client (service role bypasses RLS)
    const { data, error } = await serviceClient()
      .from('document_versions')
      .insert({
        document_id: documentA.id,
        content: { title: 'v1 snapshot', blocks: [] },
        version: 1,
      })
      .select('id')
      .single()

    if (error || !data) {
      throw new Error(`Failed to create test document version: ${error?.message}`)
    }
    versionId = (data as { id: string }).id
  })

  afterAll(async () => {
    await teardownSecurityFixture([userA.id, userB.id])
  })

  // ── SELECT ───────────────────────────────────────────────────────────────

  it('allows user A to read versions of their own documents', async () => {
    const { data, error } = await userClient(userA.accessToken)
      .from('document_versions')
      .select('id, document_id')
      .eq('document_id', documentA.id)

    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(1)
    const ids = data!.map((v: { id: string }) => v.id)
    expect(ids).toContain(versionId)
  })

  it('prevents user B from reading versions of user A documents (returns empty)', async () => {
    const { data, error } = await userClient(userB.accessToken)
      .from('document_versions')
      .select('id')
      .eq('document_id', documentA.id)

    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('SELECT * returns only versions belonging to the requesting user documents', async () => {
    const documentB = await createTestDocument(userB.id)

    // Insert a version for user B via service client
    await serviceClient()
      .from('document_versions')
      .insert({
        document_id: documentB.id,
        content: { title: 'B v1', blocks: [] },
        version: 1,
      })

    const { data: dataA } = await userClient(userA.accessToken)
      .from('document_versions')
      .select('document_id')
    const docIdsA = (dataA ?? []).map((v: { document_id: string }) => v.document_id)
    expect(docIdsA.every((id: string) => id === documentA.id)).toBe(true)
    expect(docIdsA).not.toContain(documentB.id)
  })

  // ── INSERT ───────────────────────────────────────────────────────────────

  it('blocks client-role INSERT into document_versions (service role only)', async () => {
    const { error } = await userClient(userA.accessToken)
      .from('document_versions')
      .insert({
        document_id: documentA.id,
        content: { injected: true },
        version: 99,
      })

    expect(error).not.toBeNull()
    expect(error!.code).toMatch(/42501|PGRST301/)
  })

  // ── UPDATE ───────────────────────────────────────────────────────────────

  it('blocks client-role UPDATE on document_versions (no UPDATE policy)', async () => {
    const { error, count } = await userClient(userA.accessToken)
      .from('document_versions')
      .update({ version: 999 })
      .eq('id', versionId)
      .select()

    expect(error).not.toBeNull()
    expect(count).toBeFalsy()
  })

  // ── DELETE ───────────────────────────────────────────────────────────────

  it('blocks client-role DELETE on document_versions (no DELETE policy)', async () => {
    const { error, count } = await userClient(userA.accessToken)
      .from('document_versions')
      .delete()
      .eq('id', versionId)
      .select()

    expect(error).not.toBeNull()
    expect(count).toBeFalsy()
  })
})
