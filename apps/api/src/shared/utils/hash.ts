import * as argon2 from 'argon2'

/**
 * OWASP-recommended argon2id configuration (2024+).
 * - memoryCost: 64 MiB
 * - timeCost: 3 iterations
 * - parallelism: 4 threads
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65_536, // 64 MiB
  timeCost: 3,
  parallelism: 4,
}

/**
 * Hash a plain-text password using argon2id.
 * Never store or log the plain-text input.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS)
}

/**
 * Verify a plain-text password against an argon2id hash.
 * Returns false (not throwing) on mismatch to avoid timing-based enumeration.
 */
export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}
