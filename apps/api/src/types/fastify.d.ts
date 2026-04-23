import '@fastify/jwt'

/**
 * Augments @fastify/jwt types so that request.user is strongly typed
 * across all modules without casting.
 *
 * IMPORTANT:
 * - `payload` = what we sign when issuing access tokens
 * - `user`    = what @fastify/jwt puts in request.user after jwtVerify()
 *               It mirrors the decoded payload exactly — do NOT use `id` here
 *               because the JWT standard claim is `sub`, not `id`.
 *
 * The `role: 'authenticated'` claim is required for Supabase RLS policies
 * to activate when using a custom JWT secret configured in Supabase dashboard.
 *
 * Usage in route handlers:
 *   const userId = request.user.sub   // ← correct
 *   const userId = request.user.id    // ← would be undefined at runtime
 */
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string               // user UUID — doubles as RLS auth.uid()
      email: string
      role: 'authenticated'    // Supabase role claim for RLS
    }
    user: {
      sub: string
      email: string
      role: 'authenticated'
    }
  }
}
