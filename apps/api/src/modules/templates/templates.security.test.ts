/**
 * Templates — RLS Security Tests
 *
 * Verifies that Supabase Row Level Security on the `templates` table:
 *   - Allows a user to SELECT their own templates
 *   - Prevents a user from SELECTing another user's templates
 *   - Allows a user to INSERT templates (user_id forced to auth.uid() by DEFAULT)
 *   - Prevents a user from INSERT with a spoofed user_id
 *   - Allows a user to UPDATE their own templates
 *   - Prevents a user from UPDATEing another user's templates
 *   - Allows a user to DELETE their own templates
 *   - Prevents a user from DELETEing another user's templates
 *
 * Run with: npm run test:security --workspace=apps/api
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { userClient } from '@/shared/config/supabase'
import {
  createTestUser,
  createTestTemplate,
  teardownSecurityFixture,
  type TestUser,
  type TestTemplate,
} from '@/test/security-helpers'

const RUN = !!process.env['TEST_SUPABASE_URL']

describe.skipIf(!RUN)('RLS — templates table', () => {
  let userA: TestUser
  let userB: TestUser
  let templateA: TestTemplate

  beforeAll(async () => {
    userA = await createTestUser('tmpl_rls_a')
    userB = await createTestUser('tmpl_rls_b')
    templateA = await createTestTemplate(userA.id)
  })

  afterAll(async () => {
    await teardownSecurityFixture([userA.id, userB.id])
  })

  // ── SELECT ───────────────────────────────────────────────────────────────

  it('allows user A to read their own templates', async () => {
    const { data, error } = await userClient(userA.accessToken)
      .from('templates')
      .select('id, user_id')

    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(1)
    const ids = data!.map((t: { id: string }) => t.id)
    expect(ids).toContain(templateA.id)
  })

  it('prevents user B from reading user A templates (returns empty)', async () => {
    const { data, error } = await userClient(userB.accessToken)
      .from('templates')
      .select('id')
      .eq('id', templateA.id)

    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('SELECT * returns only the requesting user own templates', async () => {
    // Create a template for user B as well
    const templateB = await createTestTemplate(userB.id)

    const { data: dataA } = await userClient(userA.accessToken)
      .from('templates')
      .select('id')
    const idsA = (dataA ?? []).map((t: { id: string }) => t.id)
    expect(idsA).toContain(templateA.id)
    expect(idsA).not.toContain(templateB.id)

    const { data: dataB } = await userClient(userB.accessToken)
      .from('templates')
      .select('id')
    const idsB = (dataB ?? []).map((t: { id: string }) => t.id)
    expect(idsB).toContain(templateB.id)
    expect(idsB).not.toContain(templateA.id)
  })

  // ── INSERT ───────────────────────────────────────────────────────────────

  it('allows user A to insert a template (user_id comes from auth.uid())', async () => {
    const { data, error } = await userClient(userA.accessToken)
      .from('templates')
      .insert({
        name: 'Test Insert Template',
        type: 'CONTRACT',
        content: { blocks: [] },
      })
      .select('id, user_id')
      .single()

    expect(error).toBeNull()
    expect(data).toBeTruthy()
    // The user_id DEFAULT ensures auth.uid() is used
    expect((data as { user_id: string }).user_id).toBe(userA.id)
  })

  it('prevents user A from spoofing user_id with user B id on INSERT', async () => {
    // Even if user A passes user_id = userB.id, WITH CHECK (auth.uid() = user_id) blocks it
    const { error } = await userClient(userA.accessToken)
      .from('templates')
      .insert({
        user_id: userB.id,
        name: 'Spoofed Template',
        type: 'PROPOSAL',
        content: { blocks: [] },
      })

    // RLS WITH CHECK fails — permission denied
    expect(error).not.toBeNull()
  })

  // ── UPDATE ───────────────────────────────────────────────────────────────

  it('allows user A to update their own template', async () => {
    const { error } = await userClient(userA.accessToken)
      .from('templates')
      .update({ name: 'Updated by A' })
      .eq('id', templateA.id)

    expect(error).toBeNull()
  })

  it('prevents user B from updating user A template (no rows affected)', async () => {
    const { error, count } = await userClient(userB.accessToken)
      .from('templates')
      .update({ name: 'Hacked by B' })
      .eq('id', templateA.id)
      .select()

    expect(error).toBeNull()
    expect(count).toBeFalsy()
  })

  // ── DELETE ───────────────────────────────────────────────────────────────

  it('allows user A to delete their own template', async () => {
    // Create a disposable template for this test
    const toDelete = await createTestTemplate(userA.id)

    const { error } = await userClient(userA.accessToken)
      .from('templates')
      .delete()
      .eq('id', toDelete.id)

    expect(error).toBeNull()
  })

  it('prevents user B from deleting user A template (no rows affected)', async () => {
    const { error, count } = await userClient(userB.accessToken)
      .from('templates')
      .delete()
      .eq('id', templateA.id)
      .select()

    expect(error).toBeNull()
    expect(count).toBeFalsy()

    // Verify template still exists via service client
    const { data } = await userClient(userA.accessToken)
      .from('templates')
      .select('id')
      .eq('id', templateA.id)

    expect(data).toHaveLength(1)
  })
})
