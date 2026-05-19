import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'

vi.mock('../../src/firebase.js', () => ({ db: {} }))

const mockOnSnapshot = vi.hoisted(() => vi.fn())
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  onSnapshot: mockOnSnapshot,
}))

import { useTags } from '../../src/hooks/useTags.js'

describe('useTags', () => {
  it('returns empty array initially', () => {
    mockOnSnapshot.mockImplementation((q, cb) => {
      cb({ docs: [] })
      return () => {}
    })
    const { result } = renderHook(() => useTags())
    expect(result.current.tags).toEqual([])
  })

  it('sorts tags by order ascending', () => {
    mockOnSnapshot.mockImplementation((q, cb) => {
      cb({
        docs: [
          { id: 't3', data: () => ({ name: 'C', order: 300 }) },
          { id: 't1', data: () => ({ name: 'A', order: 100 }) },
          { id: 't2', data: () => ({ name: 'B', order: 200 }) },
        ],
      })
      return () => {}
    })
    const { result } = renderHook(() => useTags())
    expect(result.current.tags.map(t => t.name)).toEqual(['A', 'B', 'C'])
  })

  it('falls back to name for tags without order', () => {
    mockOnSnapshot.mockImplementation((q, cb) => {
      cb({
        docs: [
          { id: 't2', data: () => ({ name: 'Zebra' }) },
          { id: 't1', data: () => ({ name: 'Apple' }) },
        ],
      })
      return () => {}
    })
    const { result } = renderHook(() => useTags())
    expect(result.current.tags.map(t => t.name)).toEqual(['Apple', 'Zebra'])
  })
})
