import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../src/firebase.js', () => ({ db: {} }))
vi.mock('../../src/hooks/useAuth.js', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, role: 'hansen' }),
}))

const mockUpdateDoc = vi.fn().mockResolvedValue(undefined)
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, col, id) => ({ id })),
  updateDoc: (...args) => mockUpdateDoc(...args),
  serverTimestamp: vi.fn(() => 'ts'),
}))

import { useBulkSelect } from '../../src/hooks/useBulkSelect.js'

const makeGuest = (id, saveTheDateSent = false, inviteSent = false, confirmed = false) => ({
  id,
  name: `Guest ${id}`,
  rsvp: {
    hansen: { saveTheDateSent, inviteSent },
    lavita: { saveTheDateSent: false, inviteSent: false },
    confirmed,
  },
})

describe('useBulkSelect', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => { vi.useRealTimers() })

  it('starts with selectionMode=false and no selected ids', () => {
    const { result } = renderHook(() => useBulkSelect())
    expect(result.current.selectionMode).toBe(false)
    expect(result.current.selectedIds.size).toBe(0)
  })

  it('toggleSelectionMode enters selection mode', () => {
    const { result } = renderHook(() => useBulkSelect())
    act(() => result.current.toggleSelectionMode())
    expect(result.current.selectionMode).toBe(true)
  })

  it('toggleSelectionMode exits selection mode and clears selection', () => {
    const { result } = renderHook(() => useBulkSelect())
    act(() => result.current.toggleSelectionMode())
    act(() => result.current.toggleGuest('g1'))
    act(() => result.current.toggleSelectionMode())
    expect(result.current.selectionMode).toBe(false)
    expect(result.current.selectedIds.size).toBe(0)
  })

  it('toggleGuest adds and removes guest ids', () => {
    const { result } = renderHook(() => useBulkSelect())
    act(() => result.current.toggleGuest('g1'))
    expect(result.current.selectedIds.has('g1')).toBe(true)
    act(() => result.current.toggleGuest('g1'))
    expect(result.current.selectedIds.has('g1')).toBe(false)
  })

  it('applyBulkAction sets all to true when not all are already true', async () => {
    const guests = [makeGuest('g1', false), makeGuest('g2', true)]
    const { result } = renderHook(() => useBulkSelect())
    act(() => { result.current.toggleGuest('g1'); result.current.toggleGuest('g2') })
    await act(async () => {
      await result.current.applyBulkAction('saveTheDateSent', guests)
    })
    expect(mockUpdateDoc).toHaveBeenCalledTimes(2)
    const calls = mockUpdateDoc.mock.calls
    expect(calls[0][1]['rsvp.hansen.saveTheDateSent']).toBe(true)
    expect(calls[1][1]['rsvp.hansen.saveTheDateSent']).toBe(true)
  })

  it('applyBulkAction sets all to false when all are already true', async () => {
    const guests = [makeGuest('g1', true), makeGuest('g2', true)]
    const { result } = renderHook(() => useBulkSelect())
    act(() => { result.current.toggleGuest('g1'); result.current.toggleGuest('g2') })
    await act(async () => {
      await result.current.applyBulkAction('saveTheDateSent', guests)
    })
    const calls = mockUpdateDoc.mock.calls
    expect(calls[0][1]['rsvp.hansen.saveTheDateSent']).toBe(false)
    expect(calls[1][1]['rsvp.hansen.saveTheDateSent']).toBe(false)
  })

  it('applyBulkAction sets confirmed directly (not role-scoped)', async () => {
    const guests = [makeGuest('g1', false, false, false)]
    const { result } = renderHook(() => useBulkSelect())
    act(() => result.current.toggleGuest('g1'))
    await act(async () => {
      await result.current.applyBulkAction('confirmed', guests)
    })
    expect(mockUpdateDoc.mock.calls[0][1]['rsvp.confirmed']).toBe(true)
  })

  it('applyBulkAction sets undoAvailable=true and undoMessage on success', async () => {
    const guests = [makeGuest('g1')]
    const { result } = renderHook(() => useBulkSelect())
    act(() => result.current.toggleGuest('g1'))
    await act(async () => {
      await result.current.applyBulkAction('saveTheDateSent', guests)
    })
    expect(result.current.undoAvailable).toBe(true)
    expect(result.current.undoMessage).toMatch(/1 guest/)
  })

  it('undoBulkAction restores previous values', async () => {
    const guests = [makeGuest('g1', false)]
    const { result } = renderHook(() => useBulkSelect())
    act(() => result.current.toggleGuest('g1'))
    await act(async () => {
      await result.current.applyBulkAction('saveTheDateSent', guests)
    })
    mockUpdateDoc.mockClear()
    await act(async () => {
      await result.current.undoBulkAction(guests)
    })
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1)
    expect(mockUpdateDoc.mock.calls[0][1]['rsvp.hansen.saveTheDateSent']).toBe(false)
    expect(result.current.undoAvailable).toBe(false)
  })

  it('undoAvailable clears after 4 seconds', async () => {
    vi.useFakeTimers()
    const guests = [makeGuest('g1')]
    const { result } = renderHook(() => useBulkSelect())
    act(() => result.current.toggleGuest('g1'))
    await act(async () => {
      await result.current.applyBulkAction('saveTheDateSent', guests)
    })
    expect(result.current.undoAvailable).toBe(true)
    act(() => vi.advanceTimersByTime(4000))
    expect(result.current.undoAvailable).toBe(false)
  })
})
