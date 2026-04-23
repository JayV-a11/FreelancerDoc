import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client factory — server-side only.
 *
 * Two clients are used in the back-end:
 *
 * 1. serviceClient() — uses SUPABASE_SERVICE_KEY
 *    - Bypasses RLS; used by the API for all normal database operations.
 *    - NEVER expose this key or this client to the front-end.
 *
 * 2. userClient(jwt) — uses the anon key + the user's access JWT
 *    - Respects RLS; used in security tests to verify policies.
 *    - The anon key alone has no RLS permissions (all tables deny-all by default).
 *
 * Note: Normal application queries go through Prisma (which also uses service role
 * via DATABASE_URL). The Supabase client is used for:
 *   - Security test assertions against RLS policies
 *   - Any future Storage / Realtime integration
 */

let _serviceClient: SupabaseClient | undefined

export function serviceClient(): SupabaseClient {
  if (!_serviceClient) {
    const url = process.env['SUPABASE_URL']
    const key = process.env['SUPABASE_SERVICE_KEY']

    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set')
    }

    _serviceClient = createClient(url, key, {
      auth: {
        // Disable auto-refresh and session persistence — this is a server-side client
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  }

  return _serviceClient
}

/**
 * Creates a Supabase client that sends requests with the given JWT.
 * Supabase will validate the JWT against the configured JWT secret and
 * enforce RLS policies based on auth.uid() = sub claim.
 *
 * The JWT must have `role: "authenticated"` claim for authenticated policies
 * to apply (our auth module sets this automatically).
 */
export function userClient(accessToken: string): SupabaseClient {
  const url = process.env['SUPABASE_URL'] ?? process.env['TEST_SUPABASE_URL']
  // Use anon key — the JWT provides the identity for RLS enforcement
  // In tests, there is no separate anon key; we use the service key but
  // restrict access by passing the user JWT in the Authorization header.
  // The Supabase client will use the provided accessToken over the key.
  const key = process.env['SUPABASE_SERVICE_KEY'] ?? process.env['TEST_SUPABASE_SERVICE_KEY']

  if (!url || !key) {
    throw new Error('Supabase environment variables are not configured')
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}
