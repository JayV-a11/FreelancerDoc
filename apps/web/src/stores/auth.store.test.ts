import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './auth.store'

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isInitialized: false })
  })

  it('starts with no user and uninitialized', () => {
    const { user, isInitialized } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(isInitialized).toBe(false)
  })

  it('setUser stores the user', () => {
    const fakeUser = {
      id: 'u1',
      email: 'test@example.com',
      name: 'Alice',
      professionalName: null,
      document: null,
      phone: null,
      address: null,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    }
    useAuthStore.getState().setUser(fakeUser)
    expect(useAuthStore.getState().user).toEqual(fakeUser)
  })

  it('setUser with null clears the user', () => {
    useAuthStore.setState({ user: { id: 'u1' } as never })
    useAuthStore.getState().setUser(null)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('setInitialized marks the store as initialized', () => {
    useAuthStore.getState().setInitialized()
    expect(useAuthStore.getState().isInitialized).toBe(true)
  })

  it('clear resets user and isInitialized', () => {
    useAuthStore.setState({ user: { id: 'u1' } as never, isInitialized: true })
    useAuthStore.getState().clear()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().isInitialized).toBe(false)
  })
})
