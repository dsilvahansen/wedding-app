import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'

vi.mock('../../src/firebase.js', () => ({
  auth: {},
  db: {},
}))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth, cb) => { cb(null); return () => {} }),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
}))

import { useAuth } from '../../src/hooks/useAuth.js'

describe('useAuth', () => {
  it('returns null user when not authenticated', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toBeNull()
    expect(result.current.role).toBeNull()
    expect(result.current.loading).toBe(false)
  })
})
