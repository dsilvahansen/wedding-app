import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'

// --- Firebase mocks ---
// onSnapshot: store the callback so tests can push new snapshot data.
let snapshotCallback = null
vi.mock('../../src/firebase.js', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  onSnapshot: vi.fn((q, cb) => {
    snapshotCallback = cb
    cb({ docs: [] })     // initial empty state
    return () => {}
  }),
}))

import { useGuests } from '../../src/hooks/useGuests.js'

describe('useGuests', () => {
  it('returns empty array initially', () => {
    const { result } = renderHook(() => useGuests())
    expect(result.current.guests).toEqual([])
  })

  it('populates guests array from onSnapshot documents', () => {
    const { result } = renderHook(() => useGuests())

    // Simulate Firestore sending a snapshot with one document
    act(() => {
      snapshotCallback({
        docs: [
          { id: 'g1', data: () => ({ name: 'Alice', ownerRole: 'hansen', tags: [] }) },
        ],
      })
    })

    expect(result.current.guests).toHaveLength(1)
    expect(result.current.guests[0]).toMatchObject({ id: 'g1', name: 'Alice', ownerRole: 'hansen' })
  })

  it('updates guests array when Firestore pushes a second snapshot', () => {
    const { result } = renderHook(() => useGuests())

    act(() => {
      snapshotCallback({
        docs: [
          { id: 'g1', data: () => ({ name: 'Alice' }) },
          { id: 'g2', data: () => ({ name: 'Bob' }) },
        ],
      })
    })

    expect(result.current.guests).toHaveLength(2)

    // Simulate a later snapshot with only one guest (e.g. after deletion)
    act(() => {
      snapshotCallback({ docs: [{ id: 'g1', data: () => ({ name: 'Alice' }) }] })
    })

    expect(result.current.guests).toHaveLength(1)
  })

  it('merges Firestore id into each guest object', () => {
    const { result } = renderHook(() => useGuests())

    act(() => {
      snapshotCallback({
        docs: [{ id: 'abc123', data: () => ({ name: 'Carol' }) }],
      })
    })

    expect(result.current.guests[0].id).toBe('abc123')
    expect(result.current.guests[0].name).toBe('Carol')
  })
})
