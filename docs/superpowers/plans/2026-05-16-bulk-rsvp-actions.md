# Bulk RSVP Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to select multiple guests in My List or Combined tab and bulk-toggle a single RSVP field (save-the-date sent, invite sent, or confirmed) across all selected guests, with a 4-second undo toast.

**Architecture:** A `useBulkSelect` hook owns all selection state, bulk Firestore writes, and undo logic. `GuestList` and `CombinedList` call the hook and render a "Select" button, checkboxes on rows, a bottom action bar with confirmation prompt, and an undo toast. `GuestRow` gains `selectionMode` and `selected` props. `Toast` gains an optional `action` prop for the Undo button.

**Tech Stack:** React 18, Firebase Firestore v10, Vitest + React Testing Library, Tailwind CSS

---

## File Map

| File | Change |
|---|---|
| `src/hooks/useBulkSelect.js` | New — selection state + bulk write + undo logic |
| `tests/hooks/useBulkSelect.test.js` | New — unit tests for hook |
| `src/components/ui/GuestRow.jsx` | Add `selectionMode` + `selected` props, checkbox, hide RSVP icons |
| `tests/components/ui/GuestRow.test.jsx` | Add selection mode tests |
| `src/components/ui/Toast.jsx` | Add optional `action` prop `{ label, onClick }` for Undo button |
| `src/components/guests/GuestList.jsx` | Select button, selection rows, action bar, undo toast |
| `src/components/guests/CombinedList.jsx` | Same additions |

---

### Task 1: `useBulkSelect` hook

**Files:**
- Create: `src/hooks/useBulkSelect.js`
- Create: `tests/hooks/useBulkSelect.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/hooks/useBulkSelect.test.js`:

```js
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
    expect(calls[0][1].rsvp.hansen.saveTheDateSent).toBe(true)
    expect(calls[1][1].rsvp.hansen.saveTheDateSent).toBe(true)
  })

  it('applyBulkAction sets all to false when all are already true', async () => {
    const guests = [makeGuest('g1', true), makeGuest('g2', true)]
    const { result } = renderHook(() => useBulkSelect())
    act(() => { result.current.toggleGuest('g1'); result.current.toggleGuest('g2') })
    await act(async () => {
      await result.current.applyBulkAction('saveTheDateSent', guests)
    })
    const calls = mockUpdateDoc.mock.calls
    expect(calls[0][1].rsvp.hansen.saveTheDateSent).toBe(false)
    expect(calls[1][1].rsvp.hansen.saveTheDateSent).toBe(false)
  })

  it('applyBulkAction sets confirmed directly (not role-scoped)', async () => {
    const guests = [makeGuest('g1', false, false, false)]
    const { result } = renderHook(() => useBulkSelect())
    act(() => result.current.toggleGuest('g1'))
    await act(async () => {
      await result.current.applyBulkAction('confirmed', guests)
    })
    expect(mockUpdateDoc.mock.calls[0][1].rsvp.confirmed).toBe(true)
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
    expect(mockUpdateDoc.mock.calls[0][1].rsvp.hansen.saveTheDateSent).toBe(false)
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/i354601/Documents/git/weddingApp
npx vitest run tests/hooks/useBulkSelect.test.js
```

Expected: FAIL — `useBulkSelect` not found

- [ ] **Step 3: Create `src/hooks/useBulkSelect.js`**

```js
import { useState, useRef, useCallback } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth } from './useAuth.js'

export function useBulkSelect() {
  const { role } = useAuth()
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [undoAvailable, setUndoAvailable] = useState(false)
  const [undoMessage, setUndoMessage] = useState('')
  const snapshotRef = useRef([])
  const undoTimerRef = useRef(null)

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => {
      if (prev) {
        setSelectedIds(new Set())
        clearTimeout(undoTimerRef.current)
      }
      return !prev
    })
  }, [])

  const toggleGuest = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const applyBulkAction = useCallback(async (field, guests) => {
    const selected = guests.filter(g => selectedIds.has(g.id))
    if (selected.length === 0) return

    const isConfirmed = field === 'confirmed'
    const allTrue = selected.every(g =>
      isConfirmed ? g.rsvp?.confirmed : g.rsvp?.[role]?.[field]
    )
    const newValue = !allTrue

    // Snapshot for undo
    snapshotRef.current = selected.map(g => ({
      guestId: g.id,
      field,
      previousValue: isConfirmed ? (g.rsvp?.confirmed ?? false) : (g.rsvp?.[role]?.[field] ?? false),
    }))

    try {
      await Promise.all(selected.map(g => {
        const rsvp = { ...g.rsvp }
        if (isConfirmed) {
          rsvp.confirmed = newValue
        } else {
          rsvp[role] = { ...rsvp[role], [field]: newValue }
        }
        return updateDoc(doc(db, 'guests', g.id), { rsvp, updatedAt: serverTimestamp() })
      }))

      clearTimeout(undoTimerRef.current)
      setUndoAvailable(true)
      setUndoMessage(`${selected.length} guest${selected.length > 1 ? 's' : ''} updated`)
      undoTimerRef.current = setTimeout(() => setUndoAvailable(false), 4000)
      return null
    } catch (err) {
      snapshotRef.current = []
      setUndoAvailable(false)
      return 'Failed to update. Try again.'
    }
  }, [selectedIds, role])

  const undoBulkAction = useCallback(async (guests) => {
    const snapshot = snapshotRef.current
    if (snapshot.length === 0) return null

    clearTimeout(undoTimerRef.current)
    setUndoAvailable(false)
    setUndoMessage('')

    try {
      await Promise.all(snapshot.map(({ guestId, field, previousValue }) => {
        const guest = guests.find(g => g.id === guestId)
        if (!guest) return Promise.resolve()
        const isConfirmed = field === 'confirmed'
        const rsvp = { ...guest.rsvp }
        if (isConfirmed) {
          rsvp.confirmed = previousValue
        } else {
          rsvp[role] = { ...rsvp[role], [field]: previousValue }
        }
        return updateDoc(doc(db, 'guests', guestId), { rsvp, updatedAt: serverTimestamp() })
      }))
      snapshotRef.current = []
      return null
    } catch (err) {
      return 'Failed to undo. Try again.'
    }
  }, [role])

  return {
    selectionMode,
    selectedIds,
    toggleSelectionMode,
    toggleGuest,
    applyBulkAction,
    undoAvailable,
    undoMessage,
    undoBulkAction,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/hooks/useBulkSelect.test.js
```

Expected: All 11 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useBulkSelect.js tests/hooks/useBulkSelect.test.js
git commit -m "feat: add useBulkSelect hook for bulk RSVP actions"
```

---

### Task 2: GuestRow selection mode + Toast undo button

**Files:**
- Modify: `src/components/ui/GuestRow.jsx`
- Modify: `tests/components/ui/GuestRow.test.jsx`
- Modify: `src/components/ui/Toast.jsx`

- [ ] **Step 1: Write the failing GuestRow tests**

Add to `tests/components/ui/GuestRow.test.jsx` inside the `describe('GuestRow', ...)` block:

```jsx
  it('shows checkbox and hides RSVP icons in selectionMode', () => {
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} selectionMode={true} selected={false} />)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    expect(screen.queryByTitle('Save the date')).not.toBeInTheDocument()
  })

  it('checkbox is checked when selected=true', () => {
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} selectionMode={true} selected={true} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('calls onEdit when row clicked in selectionMode', () => {
    const onEdit = vi.fn()
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={onEdit} selectionMode={true} selected={false} />)
    fireEvent.click(screen.getByText('John Smith'))
    expect(onEdit).toHaveBeenCalled()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/components/ui/GuestRow.test.jsx
```

Expected: FAIL on the 3 new tests

- [ ] **Step 3: Update `src/components/ui/GuestRow.jsx`**

Replace the entire file with:

```jsx
import TagPill from './TagPill.jsx'
import RsvpIcons from './RsvpIcons.jsx'
import { getTotalHeadcount } from '../../lib/guestUtils.js'

export default function GuestRow({ guest, tags, currentRole, readOnly, onRsvpToggle, onEdit, badge, selectionMode = false, selected = false }) {
  const guestTags = (guest.tags || []).map(id => tags.find(t => t.id === id)).filter(Boolean)

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 border-b border-gray-100 ${(selectionMode || !readOnly) ? 'cursor-pointer active:bg-purple-50' : ''}`}
      onClick={selectionMode ? onEdit : (!readOnly ? onEdit : undefined)}
    >
      {selectionMode && (
        <input
          type="checkbox"
          readOnly
          checked={selected}
          className="accent-purple-500 w-4 h-4 shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-medium text-sm truncate">{guest.name}</span>
          {guest.isGroup && (
            <span className="text-xs text-gray-500 font-medium">
              ({getTotalHeadcount(guest)})
            </span>
          )}
          {badge && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={badge.style}>{badge.label}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {guestTags.map(tag => (
            <TagPill key={tag.id} tag={tag} />
          ))}
        </div>
      </div>
      <span className="text-purple-500 font-bold text-sm w-5 text-center">{guest.weight}</span>
      {!selectionMode && (
        <RsvpIcons
          rsvp={guest.rsvp ?? { hansen: {}, lavita: {}, confirmed: false }}
          currentRole={currentRole}
          readOnly={readOnly}
          onToggle={field => onRsvpToggle(guest.id, field)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Update `src/components/ui/Toast.jsx`** to support an optional undo action button

Replace the entire file with:

```jsx
import { useEffect, useRef, useState } from 'react'

export default function Toast({ message, onDone, action }) {
  const [visible, setVisible] = useState(true)
  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone })

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDoneRef.current?.() }, 2000)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-3">
      <span>{message}</span>
      {action && (
        <button
          type="button"
          onClick={() => { action.onClick(); setVisible(false); onDoneRef.current?.() }}
          className="text-purple-300 font-semibold underline"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/components/ui/GuestRow.test.jsx
```

Expected: All 9 tests pass

- [ ] **Step 6: Run full suite to check no regressions**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/GuestRow.jsx tests/components/ui/GuestRow.test.jsx src/components/ui/Toast.jsx
git commit -m "feat: add selection mode to GuestRow and undo action to Toast"
```

---

### Task 3: GuestList bulk RSVP UI

**Files:**
- Modify: `src/components/guests/GuestList.jsx`

No new test file needed — GuestList tests don't exist yet and adding them would require mocking Firestore + hooks in a way that duplicates useBulkSelect tests. The hook is already tested; smoke test manually.

- [ ] **Step 1: Update `src/components/guests/GuestList.jsx`**

Replace the entire file with:

```jsx
import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useGuests } from '../../hooks/useGuests.js'
import { useTags } from '../../hooks/useTags.js'
import { useBulkSelect } from '../../hooks/useBulkSelect.js'
import { sortGuests } from '../../lib/guestUtils.js'
import GuestRow from '../ui/GuestRow.jsx'
import FilterBar from '../ui/FilterBar.jsx'
import GuestEditSheet from './GuestEditSheet.jsx'
import Toast from '../ui/Toast.jsx'

export default function GuestList({ readOnly }) {
  const { user, role } = useAuth()
  const { guests } = useGuests()
  const { tags } = useTags()
  const [activeTag, setActiveTag] = useState(null)
  const [sortBy, setSortBy] = useState('weight')
  const [editingGuest, setEditingGuest] = useState(null)
  const [pendingField, setPendingField] = useState(null)
  const [toast, setToast] = useState(null)

  const {
    selectionMode,
    selectedIds,
    toggleSelectionMode,
    toggleGuest,
    applyBulkAction,
    undoAvailable,
    undoMessage,
    undoBulkAction,
  } = useBulkSelect()

  const partnerName = role === 'hansen' ? 'Lavita' : 'Hansen'

  const myGuests = guests.filter(g => readOnly
    ? g.ownerId !== user?.uid
    : g.ownerId === user?.uid
  )

  const filtered = activeTag ? myGuests.filter(g => g.tags?.includes(activeTag)) : myGuests
  const sorted = sortGuests(filtered, sortBy)
  const listName = readOnly ? `${partnerName}'s List` : 'My List'

  async function handleRsvpToggle(guestId, field) {
    if (readOnly) return
    const guest = guests.find(g => g.id === guestId)
    if (!guest) return
    const rsvp = { ...guest.rsvp }
    if (field === 'confirmed') {
      rsvp.confirmed = !rsvp.confirmed
    } else {
      rsvp[role] = { ...rsvp[role], [field]: !rsvp[role]?.[field] }
    }
    await updateDoc(doc(db, 'guests', guestId), { rsvp, updatedAt: serverTimestamp() })
  }

  async function handleApply() {
    if (!pendingField) return
    const err = await applyBulkAction(pendingField, guests)
    setPendingField(null)
    if (err) {
      setToast({ message: err })
    } else {
      setToast({ message: undoMessage, undo: true })
    }
  }

  const fieldLabel = { saveTheDateSent: 'save-the-date sent', inviteSent: 'invite sent', confirmed: 'confirmed' }

  return (
    <div>
      {/* Summary bar */}
      <div className="px-3 py-2 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-purple-700">
          {selectionMode ? `${listName} · ${selectedIds.size} selected` : `${listName} (${sorted.length})`}
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={toggleSelectionMode}
            className="text-xs text-purple-600 font-medium"
          >
            {selectionMode ? 'Done' : 'Select'}
          </button>
        )}
      </div>

      <FilterBar tags={tags} activeTag={activeTag} onTagChange={setActiveTag} sortBy={sortBy} onSortChange={setSortBy} />

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No guests yet</p>
      ) : (
        sorted.map(guest => (
          <GuestRow
            key={guest.id}
            guest={guest}
            tags={tags}
            currentRole={role}
            readOnly={readOnly}
            onRsvpToggle={handleRsvpToggle}
            onEdit={selectionMode ? () => toggleGuest(guest.id) : () => !readOnly && setEditingGuest(guest)}
            selectionMode={selectionMode}
            selected={selectedIds.has(guest.id)}
          />
        ))
      )}

      {/* Bottom action bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40">
          {pendingField ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">
                Mark {fieldLabel[pendingField]} for {selectedIds.size} guest{selectedIds.size > 1 ? 's' : ''}?
              </span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPendingField(null)} className="text-xs text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200">Cancel</button>
                <button type="button" onClick={handleApply} className="text-xs text-white bg-purple-500 px-3 py-1.5 rounded-lg font-semibold">Apply</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{selectedIds.size} selected</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPendingField('saveTheDateSent')} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg">📅 Date</button>
                <button type="button" onClick={() => setPendingField('inviteSent')} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg">✉️ Invite</button>
                <button type="button" onClick={() => setPendingField('confirmed')} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg">✅</button>
              </div>
            </div>
          )}
        </div>
      )}

      {editingGuest && (
        <GuestEditSheet
          guest={editingGuest}
          tags={tags}
          userId={user?.uid}
          role={role}
          open={!!editingGuest}
          onClose={() => setEditingGuest(null)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          onDone={() => setToast(null)}
          action={toast.undo && undoAvailable ? {
            label: 'Undo',
            onClick: () => undoBulkAction(guests),
          } : undefined}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/components/guests/GuestList.jsx
git commit -m "feat: add bulk RSVP selection and action bar to GuestList"
```

---

### Task 4: CombinedList bulk RSVP UI

**Files:**
- Modify: `src/components/guests/CombinedList.jsx`

- [ ] **Step 1: Update `src/components/guests/CombinedList.jsx`**

Replace the entire file with:

```jsx
import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useGuests } from '../../hooks/useGuests.js'
import { useTags } from '../../hooks/useTags.js'
import { useBulkSelect } from '../../hooks/useBulkSelect.js'
import { deduplicateForCombined, sortGuests, getTotalHeadcount } from '../../lib/guestUtils.js'
import GuestRow from '../ui/GuestRow.jsx'
import Toast from '../ui/Toast.jsx'

export default function CombinedList() {
  const { user, role } = useAuth()
  const { guests } = useGuests()
  const { tags } = useTags()
  const [activeTag, setActiveTag] = useState(null)
  const [sortBy, setSortBy] = useState('weight')
  const [filterOwner, setFilterOwner] = useState('all')
  const [limit, setLimit] = useState('')
  const [editingLimit, setEditingLimit] = useState(false)
  const [pendingField, setPendingField] = useState(null)
  const [toast, setToast] = useState(null)

  const {
    selectionMode,
    selectedIds,
    toggleSelectionMode,
    toggleGuest,
    applyBulkAction,
    undoAvailable,
    undoMessage,
    undoBulkAction,
  } = useBulkSelect()

  const combined = deduplicateForCombined(guests)
  const sharedCount = combined.filter(g => g.shared).length

  let filtered = combined
  if (filterOwner === 'hansen') filtered = combined.filter(g => g.owners.some(id => id === user?.uid))
  if (filterOwner === 'lavita') filtered = combined.filter(g => g.owners.some(id => id !== user?.uid))
  if (filterOwner === 'shared') filtered = combined.filter(g => g.shared)

  if (activeTag) filtered = filtered.filter(g => (g.tags ?? []).includes(activeTag) || (g.allTags ?? []).some(t => t.tagId === activeTag))

  const sorted = sortGuests(filtered, sortBy)
  const inviteLimit = limit ? parseInt(limit, 10) : null

  async function handleRsvpToggle(guestId, field) {
    const guest = guests.find(g => g.id === guestId)
    if (!guest) return
    const rsvp = { ...guest.rsvp }
    if (field === 'confirmed') {
      rsvp.confirmed = !rsvp.confirmed
    } else {
      rsvp[role] = { ...rsvp[role], [field]: !rsvp[role]?.[field] }
    }
    try {
      await updateDoc(doc(db, 'guests', guestId), { rsvp, updatedAt: serverTimestamp() })
    } catch (err) {
      console.error('Failed to toggle RSVP:', err)
    }
  }

  async function handleApply() {
    if (!pendingField) return
    const err = await applyBulkAction(pendingField, guests)
    setPendingField(null)
    if (err) {
      setToast({ message: err })
    } else {
      setToast({ message: undoMessage, undo: true })
    }
  }

  function getBadge(entry) {
    if (entry.shared) return { label: '★', style: { backgroundColor: '#f39c12', color: '#fff' } }
    const ownerIsCurrentUser = entry.ownerId === user?.uid
    const initial = ownerIsCurrentUser
      ? (role === 'hansen' ? 'H' : 'L')
      : (role === 'hansen' ? 'L' : 'H')
    const style = ownerIsCurrentUser
      ? { backgroundColor: '#e0d0f0', color: '#9b59b6' }
      : { backgroundColor: '#f0d0e8', color: '#c0369b' }
    return { label: initial, style }
  }

  const fieldLabel = { saveTheDateSent: 'save-the-date sent', inviteSent: 'invite sent', confirmed: 'confirmed' }

  return (
    <div>
      {/* Summary bar */}
      <div className="px-3 py-2 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-purple-700">
          {selectionMode
            ? `${selectedIds.size} selected`
            : `${combined.reduce((sum, g) => sum + getTotalHeadcount(g), 0)} total`}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{sharedCount} shared ★</span>
          <button
            type="button"
            onClick={toggleSelectionMode}
            className="text-xs text-purple-600 font-medium"
          >
            {selectionMode ? 'Done' : 'Select'}
          </button>
        </div>
      </div>

      {/* Invite limit */}
      {!selectionMode && (
        <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
          <span className="text-xs text-gray-500">Invite limit:</span>
          {editingLimit ? (
            <input
              autoFocus type="number" min="1"
              value={limit}
              onChange={e => setLimit(e.target.value)}
              onBlur={() => setEditingLimit(false)}
              className="w-20 border border-gray-300 rounded px-2 py-0.5 text-xs"
            />
          ) : (
            <button type="button" onClick={() => setEditingLimit(true)} className="text-xs text-purple-500 underline">
              {limit || 'Set limit'}
            </button>
          )}
          {limit && <button type="button" onClick={() => setLimit('')} className="text-xs text-gray-400">✕</button>}
        </div>
      )}

      {/* Owner filter pills */}
      {!selectionMode && (
        <div className="flex gap-2 px-3 py-2 border-b border-gray-100 overflow-x-auto">
          {['all', 'hansen', 'lavita', 'shared'].map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilterOwner(f)}
              className={`text-xs px-3 py-1 rounded-full whitespace-nowrap capitalize ${filterOwner === f ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {f === 'shared' ? '★ Shared' : f === 'all' ? 'All' : f === 'hansen' ? 'Hansen' : 'Lavita'}
            </button>
          ))}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="ml-auto text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
          >
            <option value="weight">Weight ↓</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No guests yet</p>
      ) : (
        sorted.map((entry, idx) => {
          const overLimit = !selectionMode && inviteLimit && idx >= inviteLimit
          return (
            <div key={entry.id} className={overLimit ? 'opacity-40 line-through' : ''}>
              <GuestRow
                guest={entry}
                tags={tags}
                currentRole={role}
                readOnly={false}
                onRsvpToggle={handleRsvpToggle}
                onEdit={selectionMode ? () => toggleGuest(entry.id) : () => {}}
                badge={selectionMode ? undefined : getBadge(entry)}
                selectionMode={selectionMode}
                selected={selectedIds.has(entry.id)}
              />
            </div>
          )
        })
      )}

      {/* Bottom action bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40">
          {pendingField ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">
                Mark {fieldLabel[pendingField]} for {selectedIds.size} guest{selectedIds.size > 1 ? 's' : ''}?
              </span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPendingField(null)} className="text-xs text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200">Cancel</button>
                <button type="button" onClick={handleApply} className="text-xs text-white bg-purple-500 px-3 py-1.5 rounded-lg font-semibold">Apply</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{selectedIds.size} selected</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPendingField('saveTheDateSent')} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg">📅 Date</button>
                <button type="button" onClick={() => setPendingField('inviteSent')} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg">✉️ Invite</button>
                <button type="button" onClick={() => setPendingField('confirmed')} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg">✅</button>
              </div>
            </div>
          )}
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          onDone={() => setToast(null)}
          action={toast.undo && undoAvailable ? {
            label: 'Undo',
            onClick: () => undoBulkAction(guests),
          } : undefined}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 3: Build to check for compile errors**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/guests/CombinedList.jsx
git commit -m "feat: add bulk RSVP selection and action bar to CombinedList"
```

---

## Spec Coverage Self-Review

- ✅ `useBulkSelect` hook with all specified interface — Task 1
- ✅ Toggle logic (all true → false, otherwise → true) — Task 1 `applyBulkAction`
- ✅ Undo snapshot + restore — Task 1 `undoBulkAction`
- ✅ 4-second undo timer — Task 1
- ✅ `selectionMode` + `selected` props on GuestRow — Task 2
- ✅ Checkbox shown, RSVP icons hidden in selection mode — Task 2
- ✅ Toast `action` prop for Undo button — Task 2
- ✅ "Select" / "Done" button in summary bar — Tasks 3 & 4
- ✅ Bottom action bar with 3 action buttons — Tasks 3 & 4
- ✅ Inline confirm prompt before applying — Tasks 3 & 4
- ✅ Undo toast after successful apply — Tasks 3 & 4
- ✅ Error toast on failure — Tasks 3 & 4
- ✅ No Select button when `readOnly=true` — Task 3 (GuestList only)
- ✅ CombinedList hides filter/limit UI in selection mode — Task 4
- ✅ `confirmed` field not role-scoped — Task 1 `applyBulkAction`
