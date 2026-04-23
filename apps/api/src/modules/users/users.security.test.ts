/**
 * Users — RLS Security Tests
 *
 * Verifies that Supabase Row Level Security on the `users` table:
 *   - Allows a user to SELECT their own record
 *   - Prevents a user from SELECTing another user's record
 *   - Allows a user to UPDATE their own record
 *   - Prevents a user from UPDATEing another user's record
 *   - Blocks all INSERTs from client-role requests (service role only)
 *   - Blocks all DELETEs (soft-delete only pattern)
 *
 * These tests run against a real Supabase project and require:
 *   - TEST_SUPABASE_URL set in .env
 *   - TEST_SUPABASE_SERVICE_KEY set in .env
 *   - The JWT_SECRET configured in Supabase Dashboard → Settings → API
 *
 * They are SKIPPED when TEST_SUPABASE_URL is not set (e.g., in CI without a
 * dedicated test project).
 *
 * Run manually with:
 *   npm run test:security --workspace=apps/api
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { userClient } from '@/shared/config/supabase'
import {
  createTestUser,
  teardownSecurityFixture,
  type TestUser,
} from '@/test/security-helpers'

const RUN = !!process.env['TEST_SUPABASE_URL']

describe.skipIf(!RUN)('RLS — users table', () => {
  let userA: TestUser
  let userB: TestUser

  beforeAll(async () => {
    userA = await createTestUser('users_rls_a')
    userB = await createTestUser('users_rls_b')
  })

  afterAll(async () => {
    await teardownSecurityFixture([userA.id, userB.id])
  })

  // ── SELECT ───────────────────────────────────────────────────────────────

  it('allows a user to read their own record', async () => {
    const { data, error } = await userClient(userA.accessToken)
      .from('users')
      .select('id, email')
      .eq('id', userA.id)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].id).toBe(userA.id)
  })

  it('prevents a user from reading another user record (returns empty)', async () => {
    const { data, error } = await userClient(userA.accessToken)
      .from('users')
      .select('id, email')
      .eq('id', userB.id)

    expect(error).toBeNull()
    // RLS returns an empty array — no error, just no rows
    expect(data).toHaveLength(0)
  })

  it('prevents SELECT * from leaking other users data', async () => {
    const { data, error } = await userClient(userA.accessToken)
      .from('users')
      .select('id')

    expect(error).toBeNull()
    const ids = (data ?? []).map((r: { id: string }) => r.id)
    expect(ids).toContain(userA.id)
    expect(ids).not.toContain(userB.id)
  })

  // ── UPDATE ───────────────────────────────────────────────────────────────

  it('allows a user to update their own record', async () => {
    const { error } = await userClient(userA.accessToken)
      .from('users')
      .update({ name: 'Updated Name A' })
      .eq('id', userA.id)

    expect(error).toBeNull()
  })

  it('prevents a user from updating another user record (no rows affected)', async () => {
    const { error, count } = await userClient(userA.accessToken)
      .from('users')
      .update({ name: 'Hacked' })
      .eq('id', userB.id)
      .select()

    expect(error).toBeNull()
    // RLS filters out the row — update affects 0 rows, no error returned
    expect(count).toBeFalsy()
  })

  // ── INSERT ───────────────────────────────────────────────────────────────

  it('blocks client-role INSERT into users (service role only)', async () => {
    const { error } = await userClient(userA.accessToken)
      .from('users')
      .insert({
        name: 'Injected User',
        email: 'injected@security-test.local',
        password_hash: '$argon2id$fake',
      })

    // No INSERT policy exists — Supabase returns a permission denied error
    expect(error).not.toBeNull()
    expect(error!.code).toMatch(/42501|PGRST301/)
  })

  // ── DELETE ───────────────────────────────────────────────────────────────

  it('blocks client-role DELETE on users (soft-delete only)', async () => {
    const { error, count } = await userClient(userA.accessToken)
      .from('users')
      .delete()
      .eq('id', userA.id)
      .select()

    // No DELETE policy exists — RLS blocks the operation
    expect(error).not.toBeNull()
    expect(count).toBeFalsy()
  })
})
