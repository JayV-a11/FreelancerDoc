import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '@/shared/utils/hash'

// Argon2 is intentionally slow — use a low-cost config via env flag in tests
// The hash utility tests verify correctness, not performance

describe('hashPassword', () => {
  it('returns a non-empty string', async () => {
    const hash = await hashPassword('correct-horse-battery-staple')
    expect(typeof hash).toBe('string')
    expect(hash.length).toBeGreaterThan(0)
  })

  it('produces different hashes for the same input (random salt)', async () => {
    const hash1 = await hashPassword('same-password')
    const hash2 = await hashPassword('same-password')
    expect(hash1).not.toBe(hash2)
  })

  it('does not return the plain-text password', async () => {
    const password = 'my-secret-password'
    const hash = await hashPassword(password)
    expect(hash).not.toContain(password)
  })
})

describe('verifyPassword', () => {
  it('returns true for a matching password', async () => {
    const password = 'correct-horse-battery-staple'
    const hash = await hashPassword(password)
    await expect(verifyPassword(hash, password)).resolves.toBe(true)
  })

  it('returns false for a wrong password', async () => {
    const hash = await hashPassword('correct-password')
    await expect(verifyPassword(hash, 'wrong-password')).resolves.toBe(false)
  })

  it('returns false (not throws) for an invalid hash', async () => {
    await expect(verifyPassword('not-a-valid-hash', 'any-password')).resolves.toBe(false)
  })

  it('returns false for an empty password against a valid hash', async () => {
    const hash = await hashPassword('some-password')
    await expect(verifyPassword(hash, '')).resolves.toBe(false)
  })
})
