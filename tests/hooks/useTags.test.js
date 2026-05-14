import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'

vi.mock('../../src/firebase.js', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  onSnapshot: vi.fn((q, cb) => {
    cb({ docs: [] })
    return () => {}
  }),
}))

import { useTags } from '../../src/hooks/useTags.js'

describe('useTags', () => {
  it('returns empty array initially', () => {
    const { result } = renderHook(() => useTags())
    expect(result.current.tags).toEqual([])
  })
})
