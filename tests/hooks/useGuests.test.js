import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'

vi.mock('../../src/firebase.js', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  onSnapshot: vi.fn((q, cb) => {
    cb({ docs: [] })
    return () => {}
  }),
}))

import { useGuests } from '../../src/hooks/useGuests.js'

describe('useGuests', () => {
  it('returns empty array initially', () => {
    const { result } = renderHook(() => useGuests())
    expect(result.current.guests).toEqual([])
  })
})
