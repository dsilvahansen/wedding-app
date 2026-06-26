import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// --- Firebase mocks ---
// onAuthStateChanged: invoke callback with `null` by default (unauthenticated).
// Call the stored callback in tests to simulate sign-in/out events.
let authCallback = null
vi.mock('../../src/firebase.js', () => ({ auth: {}, db: {} }))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth, cb) => { authCallback = cb; cb(null); return () => {} }),
  signInWithEmailAndPassword: vi.fn().mockResolvedValue({}),
  signOut: vi.fn().mockResolvedValue({}),
}))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
}))

import { useAuth } from '../../src/hooks/useAuth.js'
import { getDoc } from 'firebase/firestore'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'

describe('useAuth', () => {
  beforeEach(() => {
    authCallback = null
    getDoc.mockResolvedValue({ exists: () => false })
  })

  it('returns null user and role when not authenticated', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toBeNull()
    expect(result.current.role).toBeNull()
    // loading resolves to false once onAuthStateChanged fires with null
    expect(result.current.loading).toBe(false)
  })

  it('sets user and role from Firestore when authenticated', async () => {
    const fakeUser = { uid: 'u1', email: 'h@test.com' }
    // getDoc returns a role document for u1
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ role: 'hansen' }) })

    const { result } = renderHook(() => useAuth())

    // Simulate Firebase firing an authenticated user
    await act(async () => { authCallback(fakeUser) })

    expect(result.current.user).toBe(fakeUser)
    expect(result.current.role).toBe('hansen')
    expect(result.current.loading).toBe(false)
  })

  it('sets role to null if user doc does not exist', async () => {
    const fakeUser = { uid: 'u1' }
    getDoc.mockResolvedValue({ exists: () => false })

    const { result } = renderHook(() => useAuth())
    await act(async () => { authCallback(fakeUser) })

    expect(result.current.user).toBe(fakeUser)
    expect(result.current.role).toBeNull()
  })

  it('clears user and role on sign-out', async () => {
    const fakeUser = { uid: 'u1' }
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ role: 'hansen' }) })

    const { result } = renderHook(() => useAuth())
    await act(async () => { authCallback(fakeUser) })
    expect(result.current.user).toBe(fakeUser)

    // Simulate sign-out
    await act(async () => { authCallback(null) })
    expect(result.current.user).toBeNull()
    expect(result.current.role).toBeNull()
  })

  it('login calls signInWithEmailAndPassword with the correct args', async () => {
    const { result } = renderHook(() => useAuth())
    await act(async () => { result.current.login('test@test.com', 'pw123') })
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith({}, 'test@test.com', 'pw123')
  })

  it('logout calls signOut', async () => {
    const { result } = renderHook(() => useAuth())
    await act(async () => { result.current.logout() })
    expect(signOut).toHaveBeenCalled()
  })
})
