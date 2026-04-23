/**
 * Security test helpers.
 *
 * Utilities for creating isolated test users and data in the real Supabase
 * project. Each test suite should call `teardownSecurityFixture` in afterAll
 * to hard-delete everything created during the test run.
 *
 * These helpers bypass RLS by using the service client (via SQL through the
 * Prisma-style direct connection). The service key used here is the TEST
 * project's service key — never the production one.
 */

import jwt from 'jsonwebtoken'
import * as argon2 from 'argon2'
import { serviceClient } from '@/shared/config/supabase'

/** A user record created for a security test. */
export type TestUser = {
  id: string
  email: string
  accessToken: string
}

/** A template created for a security test. */
export type TestTemplate = {
  id: string
  userId: string
}

/** A document created for a security test. */
export type TestDocument = {
  id: string
  userId: string
}

// ── JWT helpers ────────────────────────────────────────────────────────────

/**
 * Signs a JWT that will be accepted by Supabase as the `auth.uid()` for RLS.
 * Must match the JWT_SECRET configured in:
 *   Supabase Dashboard → Settings → API → JWT Settings
 */
export function signTestJwt(userId: string, email: string): string {
  const secret = process.env['JWT_SECRET']
  if (!secret) throw new Error('JWT_SECRET not set in test environment')

  return jwt.sign(
    {
      sub: userId,
      email,
      role: 'authenticated',
      iss: 'supabase',
    },
    secret,
    { expiresIn: '1h' },
  )
}

// ── Fixture helpers ────────────────────────────────────────────────────────

/**
 * Creates a test user directly via the service client (bypassing RLS).
 * Returns the user along with a signed access JWT.
 */
export async function createTestUser(
  emailPrefix: string,
): Promise<TestUser> {
  const id = crypto.randomUUID()
  const email = `${emailPrefix}_${id.slice(0, 8)}@security-test.local`
  const passwordHash = await argon2.hash('TestPass@123!', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  })

  const { error } = await serviceClient()
    .from('users')
    .insert({
      id,
      name: `Test User ${emailPrefix}`,
      email,
      password_hash: passwordHash,
    })

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`)
  }

  const accessToken = signTestJwt(id, email)
  return { id, email, accessToken }
}

/**
 * Creates a template owned by the given user via the service client.
 */
export async function createTestTemplate(userId: string): Promise<TestTemplate> {
  const { data, error } = await serviceClient()
    .from('templates')
    .insert({
      user_id: userId,
      name: 'Security Test Template',
      type: 'PROPOSAL',
      content: { blocks: [] },
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create test template: ${error?.message}`)
  }

  return { id: data.id as string, userId }
}

/**
 * Creates a document owned by the given user via the service client.
 */
export async function createTestDocument(userId: string): Promise<TestDocument> {
  const { data, error } = await serviceClient()
    .from('documents')
    .insert({
      user_id: userId,
      title: 'Security Test Document',
      client_name: 'Test Client',
      client_email: 'client@security-test.local',
      content: { blocks: [] },
      total_value: 100.0,
      currency: 'BRL',
      status: 'DRAFT',
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create test document: ${error?.message}`)
  }

  return { id: data.id as string, userId }
}

/**
 * Tears down all test data created for a security test run.
 * Deletes in reverse FK order; ignores errors (rows may already be gone).
 */
export async function teardownSecurityFixture(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return

  const svc = serviceClient()

  try {
    // Collect document IDs belonging to the test users
    const { data: docs } = await svc
      .from('documents')
      .select('id')
      .in('user_id', userIds)
    const docIds = (docs ?? []).map((d: { id: string }) => d.id)

    if (docIds.length > 0) {
      await svc.from('document_versions').delete().in('document_id', docIds)
    }
  } catch {
    // Ignore — rows may not exist
  }

  try {
    await svc.from('documents').delete().in('user_id', userIds)
  } catch {
    // Ignore
  }

  try {
    await svc.from('templates').delete().in('user_id', userIds)
  } catch {
    // Ignore
  }

  try {
    await svc.from('users').delete().in('id', userIds)
  } catch {
    // Ignore
  }
}
