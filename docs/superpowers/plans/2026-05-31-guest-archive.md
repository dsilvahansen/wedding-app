# Guest Archive Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow guests to be archived (hidden from main list + counts) and later unarchived, with long-press, bulk select, and a dedicated archived view.

**Architecture:** Add `archived: boolean` to Firestore guest docs. Filter it out in `GuestList`. New `ArchivedGuestSheet` component handles the archived view. Long-press on `GuestRow` triggers an action sheet. RSVP toggle in `GuestEditSheet` prompts to unarchive if guest is archived.

**Tech Stack:** React, Firestore (firebase/firestore), Vitest + @testing-library/react, Tailwind CSS, existing BottomSheet/Toast/GuestRow components.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/components/ui/GuestRow.jsx` | Modify | Add `onLongPress` prop; fire after 500ms hold |
| `src/components/guests/GuestList.jsx` | Modify | Filter out archived; "Archived (N)" button; long-press action sheet; bulk Archive button |
| `src/components/guests/GuestEditSheet.jsx` | Modify | After RSVP toggle on archived guest, show unarchive prompt |
| `src/components/guests/ArchivedGuestSheet.jsx` | Create | Bottom sheet listing archived guests; long-press + selection unarchive |
| `tests/components/ui/GuestRow.test.jsx` | Modify | Add long-press tests |
| `tests/components/guests/GuestList.test.jsx` | Modify | Add archive filtering, count, and bulk archive tests |
| `tests/components/guests/GuestEditSheet.test.jsx` | Create | Tests for RSVP toggle on archived guest |
| `tests/components/guests/ArchivedGuestSheet.test.jsx` | Create | Tests for archived view and unarchive actions |

---

## Task 1: Add long-press support to GuestRow

**Files:**
- Modify: `src/components/ui/GuestRow.jsx`
- Modify: `tests/components/ui/GuestRow.test.jsx`

- [ ] **Step 1: Write failing tests**

Open `tests/components/ui/GuestRow.test.jsx` and add at the bottom (inside the `describe` block):

```jsx
it('calls onLongPress after 500ms hold', async () => {
  const onLongPress = vi.fn()
  render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} onLongPress={onLongPress} />)
  const row = screen.getByText('John Smith').closest('div[data-testid="guest-row"]')
  fireEvent.mouseDown(row)
  await vi.advanceTimersByTimeAsync(500)
  expect(onLongPress).toHaveBeenCalled()
})

it('does not call onLongPress if released before 500ms', async () => {
  const onLongPress = vi.fn()
  render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} onLongPress={onLongPress} />)
  const row = screen.getByText('John Smith').closest('div[data-testid="guest-row"]')
  fireEvent.mouseDown(row)
  await vi.advanceTimersByTimeAsync(200)
  fireEvent.mouseUp(row)
  await vi.advanceTimersByTimeAsync(500)
  expect(onLongPress).not.toHaveBeenCalled()
})

it('does not call onLongPress when readOnly', async () => {
  const onLongPress = vi.fn()
  render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={true} onRsvpToggle={() => {}} onEdit={() => {}} onLongPress={onLongPress} />)
  const row = screen.getByText('John Smith').closest('div[data-testid="guest-row"]')
  fireEvent.mouseDown(row)
  await vi.advanceTimersByTimeAsync(500)
  expect(onLongPress).not.toHaveBeenCalled()
})
```

Also add `vi.useFakeTimers()` in a `beforeEach` and `vi.useRealTimers()` in `afterEach` at the top of the describe block. Import `afterEach` from vitest.

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/components/ui/GuestRow.test.jsx
```

Expected: the three new tests fail (cannot find `data-testid="guest-row"`, `onLongPress` not called).

- [ ] **Step 3: Implement long-press in GuestRow**

Replace `src/components/ui/GuestRow.jsx` with:

```jsx
import { useRef } from 'react'
import TagPill from './TagPill.jsx'
import RsvpIcons from './RsvpIcons.jsx'
import { getTotalHeadcount } from '../../lib/guestUtils.js'

export default function GuestRow({ guest, tags, currentRole, readOnly, onRsvpToggle, onEdit, badge, selectionMode = false, selected = false, onLongPress }) {
  const guestTags = (guest.tags || []).map(id => tags.find(t => t.id === id)).filter(Boolean)
  const timerRef = useRef(null)

  function handlePointerDown() {
    if (readOnly || !onLongPress) return
    timerRef.current = setTimeout(() => {
      onLongPress()
    }, 500)
  }

  function handlePointerUp() {
    clearTimeout(timerRef.current)
  }

  return (
    <div
      data-testid="guest-row"
      className={`flex items-center gap-2 px-3 py-2 border-b border-gray-100 ${!readOnly || selectionMode ? 'cursor-pointer active:bg-purple-50' : ''}`}
      onClick={!readOnly || selectionMode ? onEdit : undefined}
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchEnd={handlePointerUp}
    >
      {selectionMode && (
        <input type="checkbox" readOnly checked={selected} className="accent-purple-500 w-4 h-4 shrink-0" />
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

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/components/ui/GuestRow.test.jsx
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/GuestRow.jsx tests/components/ui/GuestRow.test.jsx
git commit -m "feat: add long-press support to GuestRow"
```

---

## Task 2: Filter archived guests from GuestList and show "Archived (N)" button

**Files:**
- Modify: `src/components/guests/GuestList.jsx`
- Modify: `tests/components/guests/GuestList.test.jsx`

- [ ] **Step 1: Write failing tests**

Add these tests to `tests/components/guests/GuestList.test.jsx`. First update the mock guests at the top to include an archived guest — replace the existing `useGuests` mock with:

```js
vi.mock('../../../src/hooks/useGuests.js', () => ({
  useGuests: () => ({
    guests: [
      { id: 'g1', name: 'Alice', ownerRole: 'hansen', tags: [], weight: 8,
        rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
      { id: 'g2', name: 'Bob', ownerRole: 'hansen', tags: [], weight: 5, archived: true,
        rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
    ],
  }),
}))
```

Also add `useBulkSelect` mock if not present:

```js
vi.mock('../../../src/hooks/useBulkSelect.js', () => ({
  useBulkSelect: () => ({
    selectionMode: false,
    selectedIds: new Set(),
    toggleSelectionMode: vi.fn(),
    toggleGuest: vi.fn(),
    applyBulkAction: vi.fn(),
    undoAvailable: false,
    undoBulkAction: vi.fn(),
  }),
}))
```

Then add these test cases:

```js
it('hides archived guests from main list', () => {
  render(<GuestList readOnly={false} />)
  expect(screen.getByText('Alice')).toBeInTheDocument()
  expect(screen.queryByText('Bob')).not.toBeInTheDocument()
})

it('excludes archived guests from headcount', () => {
  render(<GuestList readOnly={false} />)
  expect(screen.getByText(/my list \(1\)/i)).toBeInTheDocument()
})

it('shows Archived button when archived guests exist', () => {
  render(<GuestList readOnly={false} />)
  expect(screen.getByRole('button', { name: /archived \(1\)/i })).toBeInTheDocument()
})

it('does not show Archived button when no archived guests', () => {
  // temporarily override mock for this test
  // We'll rely on the mock having 1 archived — this test just verifies absence in readOnly (partner side has none)
  render(<GuestList readOnly={true} />)
  expect(screen.queryByRole('button', { name: /archived/i })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/components/guests/GuestList.test.jsx
```

Expected: new tests fail.

- [ ] **Step 3: Update GuestList to filter archived and show button**

In `src/components/guests/GuestList.jsx`:

1. Add `useState` for `showArchived` (already has useState import).
2. Add `ArchivedGuestSheet` import (create stub first — we'll build it in Task 4).
3. Update the filtering and summary bar.

Replace the filtering block (lines 35–42) with:

```js
const myGuests = myOwnerRole ? guests.filter(g => {
  const guestSide = g.ownerRole ?? (g.ownerId === user?.uid ? myOwnerRole : (myOwnerRole === 'hansen' ? 'lavita' : 'hansen'))
  return readOnly ? guestSide !== myOwnerRole : guestSide === myOwnerRole
}) : []

const activeGuests = myGuests.filter(g => !g.archived)
const archivedGuests = myGuests.filter(g => g.archived)
const filtered = activeTag ? activeGuests.filter(g => g.tags?.includes(activeTag)) : activeGuests
const sorted = sortGuests(filtered, sortBy)
```

Add `const [showArchived, setShowArchived] = useState(false)` with the other state declarations.

In the summary bar `<div>` (the one with `px-3 py-2 bg-purple-50`), add the Archived button after the sort select:

```jsx
{!selectionMode && archivedGuests.length > 0 && (
  <button
    type="button"
    onClick={() => setShowArchived(true)}
    className="text-xs text-gray-500 border border-gray-300 rounded px-2 py-1 bg-white"
  >
    Archived ({archivedGuests.length})
  </button>
)}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/components/guests/GuestList.test.jsx
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/guests/GuestList.jsx tests/components/guests/GuestList.test.jsx
git commit -m "feat: filter archived guests from GuestList, show Archived button"
```

---

## Task 3: Create ArchivedGuestSheet component

**Files:**
- Create: `src/components/guests/ArchivedGuestSheet.jsx`
- Create: `tests/components/guests/ArchivedGuestSheet.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `tests/components/guests/ArchivedGuestSheet.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/firestore', () => ({
  doc: vi.fn().mockReturnValue({}),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn().mockReturnValue('ts'),
}))
vi.mock('../../../src/firebase.js', () => ({ db: {} }))

import { updateDoc } from 'firebase/firestore'
import ArchivedGuestSheet from '../../../src/components/guests/ArchivedGuestSheet.jsx'

const tags = [{ id: 't1', name: 'Family', color: '#e8f4e8', weights: {} }]
const guests = [
  { id: 'g1', name: 'Alice', tags: ['t1'], weight: 8, archived: true, isGroup: false,
    rsvp: { hansen: {}, lavita: {}, confirmed: false } },
  { id: 'g2', name: 'Bob', tags: [], weight: 5, archived: true, isGroup: false,
    rsvp: { hansen: {}, lavita: {}, confirmed: false } },
]

describe('ArchivedGuestSheet', () => {
  beforeEach(() => { updateDoc.mockClear() })

  it('renders archived guest names', () => {
    render(<ArchivedGuestSheet guests={guests} tags={tags} open={true} onClose={() => {}} readOnly={false} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('shows empty state when no archived guests', () => {
    render(<ArchivedGuestSheet guests={[]} tags={tags} open={true} onClose={() => {}} readOnly={false} />)
    expect(screen.getByText(/no archived guests/i)).toBeInTheDocument()
  })

  it('enters selection mode when Select tapped', () => {
    render(<ArchivedGuestSheet guests={guests} tags={tags} open={true} onClose={() => {}} readOnly={false} />)
    fireEvent.click(screen.getByRole('button', { name: /select/i }))
    expect(screen.getAllByRole('checkbox').length).toBe(2)
  })

  it('calls updateDoc with archived:false when Unarchive applied to selected guests', async () => {
    render(<ArchivedGuestSheet guests={guests} tags={tags} open={true} onClose={() => {}} readOnly={false} />)
    fireEvent.click(screen.getByRole('button', { name: /select/i }))
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    fireEvent.click(screen.getByRole('button', { name: /unarchive/i }))
    await vi.waitFor(() => expect(updateDoc).toHaveBeenCalledOnce())
    expect(updateDoc).toHaveBeenCalledWith({}, expect.objectContaining({ archived: false }))
  })

  it('hides Select button in readOnly mode', () => {
    render(<ArchivedGuestSheet guests={guests} tags={tags} open={true} onClose={() => {}} readOnly={true} />)
    expect(screen.queryByRole('button', { name: /select/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/components/guests/ArchivedGuestSheet.test.jsx
```

Expected: all fail (module not found).

- [ ] **Step 3: Implement ArchivedGuestSheet**

Create `src/components/guests/ArchivedGuestSheet.jsx`:

```jsx
import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase.js'
import BottomSheet from '../ui/BottomSheet.jsx'
import GuestRow from '../ui/GuestRow.jsx'

export default function ArchivedGuestSheet({ guests, tags, open, onClose, readOnly }) {
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [longPressGuest, setLongPressGuest] = useState(null)

  function toggleGuest(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleUnarchive(ids) {
    await Promise.all(
      [...ids].map(id => updateDoc(doc(db, 'guests', id), { archived: false, updatedAt: serverTimestamp() }))
    )
    setSelectedIds(new Set())
    setSelectionMode(false)
    setLongPressGuest(null)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Archived Guests">
      <div>
        {/* Summary bar */}
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-600">
            {selectionMode ? `${selectedIds.size} selected` : `${guests.length} archived`}
          </span>
          {!readOnly && (
            <button
              type="button"
              onClick={() => { setSelectionMode(prev => !prev); setSelectedIds(new Set()) }}
              className="text-xs text-purple-600 font-medium"
            >
              {selectionMode ? 'Done' : 'Select'}
            </button>
          )}
        </div>

        {/* Guest list */}
        {guests.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No archived guests</p>
        ) : (
          guests.map(guest => (
            <GuestRow
              key={guest.id}
              guest={guest}
              tags={tags}
              currentRole={null}
              readOnly={true}
              onRsvpToggle={() => {}}
              onEdit={selectionMode ? () => toggleGuest(guest.id) : undefined}
              selectionMode={selectionMode}
              selected={selectedIds.has(guest.id)}
              onLongPress={!readOnly && !selectionMode ? () => setLongPressGuest(guest) : undefined}
            />
          ))
        )}

        {/* Bulk unarchive action bar */}
        {selectionMode && selectedIds.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40 flex items-center justify-between">
            <span className="text-xs text-gray-500">{selectedIds.size} selected</span>
            <button
              type="button"
              onClick={() => handleUnarchive(selectedIds)}
              className="text-xs bg-purple-500 text-white px-4 py-1.5 rounded-lg font-semibold"
            >
              Unarchive
            </button>
          </div>
        )}

        {/* Long-press action sheet */}
        {longPressGuest && (
          <div className="fixed inset-0 z-50 flex items-end" onClick={() => setLongPressGuest(null)}>
            <div className="w-full bg-white rounded-t-2xl shadow-xl p-4 space-y-2" onClick={e => e.stopPropagation()}>
              <p className="text-sm font-semibold text-center text-gray-700 pb-1">{longPressGuest.name}</p>
              <button
                type="button"
                onClick={() => handleUnarchive([longPressGuest.id])}
                className="w-full text-sm text-purple-600 font-medium py-3 border-t border-gray-100 text-center"
              >
                Unarchive
              </button>
              <button
                type="button"
                onClick={() => setLongPressGuest(null)}
                className="w-full text-sm text-gray-500 py-3 border-t border-gray-100 text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/components/guests/ArchivedGuestSheet.test.jsx
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/guests/ArchivedGuestSheet.jsx tests/components/guests/ArchivedGuestSheet.test.jsx
git commit -m "feat: add ArchivedGuestSheet component"
```

---

## Task 4: Wire ArchivedGuestSheet into GuestList + long-press archive

**Files:**
- Modify: `src/components/guests/GuestList.jsx`
- Modify: `tests/components/guests/GuestList.test.jsx`

- [ ] **Step 1: Write failing tests**

Add to `tests/components/guests/GuestList.test.jsx`:

```js
it('opens archived sheet when Archived button clicked', async () => {
  render(<GuestList readOnly={false} />)
  fireEvent.click(screen.getByRole('button', { name: /archived \(1\)/i }))
  expect(await screen.findByText(/archived guests/i)).toBeInTheDocument()
})
```

Also add `fireEvent` to the import if not already there.

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/guests/GuestList.test.jsx
```

Expected: new test fails (sheet doesn't open).

- [ ] **Step 3: Add ArchivedGuestSheet + long-press wiring to GuestList**

At the top of `src/components/guests/GuestList.jsx`, add:

```js
import ArchivedGuestSheet from './ArchivedGuestSheet.jsx'
```

Add state:

```js
const [longPressGuest, setLongPressGuest] = useState(null)
```

Add `async function handleArchiveGuest(guestId)`:

```js
async function handleArchiveGuest(guestId) {
  await updateDoc(doc(db, 'guests', guestId), { archived: true, updatedAt: serverTimestamp() })
  setLongPressGuest(null)
}
```

Add the `doc`, `updateDoc`, `serverTimestamp` imports from `firebase/firestore` (already imported in GuestList — verify they're there; if not, add them).

In the `sorted.map(guest => ...)` block, add `onLongPress` to each `GuestRow`:

```jsx
onLongPress={!readOnly && !selectionMode ? () => setLongPressGuest(guest) : undefined}
```

After the closing `})}` of the guest map and before the `{editingGuest && ...}` block, add the long-press action sheet:

```jsx
{longPressGuest && (
  <div className="fixed inset-0 z-50 flex items-end" onClick={() => setLongPressGuest(null)}>
    <div className="w-full bg-white rounded-t-2xl shadow-xl p-4 space-y-2" onClick={e => e.stopPropagation()}>
      <p className="text-sm font-semibold text-center text-gray-700 pb-1">{longPressGuest.name}</p>
      <button
        type="button"
        onClick={() => { setLongPressGuest(null); setEditingGuest(longPressGuest) }}
        className="w-full text-sm text-gray-700 py-3 border-t border-gray-100 text-center"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => handleArchiveGuest(longPressGuest.id)}
        className="w-full text-sm text-orange-500 font-medium py-3 border-t border-gray-100 text-center"
      >
        Archive
      </button>
      <button
        type="button"
        onClick={() => setLongPressGuest(null)}
        className="w-full text-sm text-gray-500 py-3 border-t border-gray-100 text-center"
      >
        Cancel
      </button>
    </div>
  </div>
)}
```

At the bottom of the component (after the AddGuest BottomSheet), add:

```jsx
{showArchived && (
  <ArchivedGuestSheet
    guests={archivedGuests}
    tags={tags}
    open={showArchived}
    onClose={() => setShowArchived(false)}
    readOnly={readOnly}
  />
)}
```

- [ ] **Step 4: Run all GuestList tests**

```bash
npx vitest run tests/components/guests/GuestList.test.jsx
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/guests/GuestList.jsx tests/components/guests/GuestList.test.jsx
git commit -m "feat: wire ArchivedGuestSheet and long-press archive into GuestList"
```

---

## Task 5: Add bulk Archive action to selection mode

**Files:**
- Modify: `src/components/guests/GuestList.jsx`
- Modify: `tests/components/guests/GuestList.test.jsx`

- [ ] **Step 1: Write failing tests**

Add a mock that puts `useBulkSelect` in selection mode for these tests. Add a new `describe` block:

```js
describe('GuestList bulk archive', () => {
  beforeEach(() => {
    vi.mocked(require('../../../src/hooks/useBulkSelect.js').useBulkSelect).mockReturnValue({
      selectionMode: true,
      selectedIds: new Set(['g1']),
      toggleSelectionMode: vi.fn(),
      toggleGuest: vi.fn(),
      applyBulkAction: vi.fn().mockResolvedValue(null),
      undoAvailable: false,
      undoBulkAction: vi.fn(),
    })
  })
})
```

Add this test to the top-level describe in `GuestList.test.jsx`:

```js
it('does not show Archive button when not in selection mode', () => {
  render(<GuestList readOnly={false} />)
  // Archive button in the bulk bar only appears in selection mode — not visible here
  expect(screen.queryByRole('button', { name: /^archive$/i })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it passes (or fails)**

```bash
npx vitest run tests/components/guests/GuestList.test.jsx
```

- [ ] **Step 3: Add Archive button to the bulk selection action bar in GuestList**

In `src/components/guests/GuestList.jsx`, find the bulk action bar (the `{selectionMode && selectedIds.size > 0 && ...}` block).

In the non-pending state (the row with STD/Invite/Confirmed buttons), add an Archive button:

```jsx
<button type="button" onClick={() => setPendingField('archive')} className="text-xs bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg">📦 Archive</button>
```

Update `fieldLabel` to include archive:

```js
const fieldLabel = { saveTheDateSent: 'save-the-date sent', inviteSent: 'invite sent', confirmed: 'confirmed', archive: 'archive' }
```

In `handleApply`, handle the `archive` action before calling `applyBulkAction` (which doesn't handle archive):

```js
async function handleApply() {
  if (!pendingField) return
  const count = selectedIds.size
  if (pendingField === 'archive') {
    try {
      const selected = [...selectedIds]
      await Promise.all(selected.map(id => updateDoc(doc(db, 'guests', id), { archived: true, updatedAt: serverTimestamp() })))
      setPendingField(null)
      toggleSelectionMode()
      setToast({ message: `${count} guest${count > 1 ? 's' : ''} archived` })
    } catch {
      setPendingField(null)
      setToast({ message: 'Failed to archive. Try again.' })
    }
    return
  }
  const err = await applyBulkAction(pendingField, guests)
  setPendingField(null)
  if (err) {
    setToast({ message: err })
  } else {
    setToast({ message: `${count} guest${count > 1 ? 's' : ''} updated`, undo: true })
  }
}
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run tests/components/guests/GuestList.test.jsx
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/guests/GuestList.jsx
git commit -m "feat: add Archive action to bulk selection mode in GuestList"
```

---

## Task 6: Unarchive prompt in GuestEditSheet after RSVP toggle

**Files:**
- Modify: `src/components/guests/GuestEditSheet.jsx`
- Create: `tests/components/guests/GuestEditSheet.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `tests/components/guests/GuestEditSheet.test.jsx`:

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/firestore', () => ({
  doc: vi.fn().mockReturnValue({}),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn().mockReturnValue('ts'),
}))
vi.mock('../../../src/firebase.js', () => ({ db: {} }))

import { updateDoc } from 'firebase/firestore'
import GuestEditSheet from '../../../src/components/guests/GuestEditSheet.jsx'

const tags = []
const archivedGuest = {
  id: 'g1',
  name: 'Alice',
  tags: [],
  weight: 8,
  archived: true,
  isGroup: false,
  ownerRole: 'hansen',
  rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false },
}
const activeGuest = { ...archivedGuest, archived: false }

describe('GuestEditSheet RSVP on archived guest', () => {
  beforeEach(() => { updateDoc.mockClear() })

  it('shows unarchive prompt after RSVP toggle on archived guest', async () => {
    render(<GuestEditSheet guest={archivedGuest} tags={tags} userId="u1" role="hansen" open={true} onClose={() => {}} />)
    fireEvent.click(screen.getByLabelText(/save the date/i))
    await waitFor(() => expect(screen.getByText(/unarchive/i)).toBeInTheDocument())
  })

  it('calls updateDoc with archived:false when Unarchive clicked', async () => {
    render(<GuestEditSheet guest={archivedGuest} tags={tags} userId="u1" role="hansen" open={true} onClose={() => {}} />)
    fireEvent.click(screen.getByLabelText(/save the date/i))
    await waitFor(() => screen.getByText(/unarchive them/i))
    fireEvent.click(screen.getByRole('button', { name: /^unarchive$/i }))
    await waitFor(() => expect(updateDoc).toHaveBeenCalledWith({}, expect.objectContaining({ archived: false })))
  })

  it('does not show unarchive prompt for non-archived guest', async () => {
    render(<GuestEditSheet guest={activeGuest} tags={tags} userId="u1" role="hansen" open={true} onClose={() => {}} />)
    fireEvent.click(screen.getByLabelText(/save the date/i))
    await waitFor(() => expect(updateDoc).toHaveBeenCalled())
    expect(screen.queryByText(/unarchive/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/components/guests/GuestEditSheet.test.jsx
```

Expected: all fail (no unarchive prompt exists yet).

- [ ] **Step 3: Update GuestEditSheet to show unarchive prompt**

In `src/components/guests/GuestEditSheet.jsx`:

Add state: `const [showUnarchivePrompt, setShowUnarchivePrompt] = useState(false)`

Update `handleRsvpToggle` to check for archived status after the Firestore write:

```js
async function handleRsvpToggle(field) {
  const rsvp = { ...guest.rsvp }
  if (field === 'confirmed') {
    rsvp.confirmed = !rsvp.confirmed
  } else {
    rsvp[role] = { ...rsvp[role], [field]: !rsvp[role]?.[field] }
  }
  try {
    await updateDoc(doc(db, 'guests', guest.id), { rsvp, updatedAt: serverTimestamp() })
    if (guest.archived) {
      setShowUnarchivePrompt(true)
    }
  } catch (err) {
    console.error(err)
  }
}
```

Add `handleUnarchive`:

```js
async function handleUnarchive() {
  try {
    await updateDoc(doc(db, 'guests', guest.id), { archived: false, updatedAt: serverTimestamp() })
  } catch (err) {
    console.error(err)
  } finally {
    setShowUnarchivePrompt(false)
  }
}
```

Add the unarchive prompt dialog just before the closing `</BottomSheet>` tag:

```jsx
{showUnarchivePrompt && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="bg-white rounded-2xl shadow-xl p-5 mx-4 max-w-sm w-full space-y-3">
      <p className="text-sm font-semibold text-gray-800 text-center">
        {guest.name} has an RSVP update. Unarchive them?
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setShowUnarchivePrompt(false)}
          className="flex-1 border border-gray-300 rounded-xl py-2 text-sm text-gray-600"
        >
          Keep archived
        </button>
        <button
          type="button"
          onClick={handleUnarchive}
          className="flex-1 bg-purple-500 text-white rounded-xl py-2 text-sm font-semibold"
        >
          Unarchive
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/components/guests/GuestEditSheet.test.jsx
```

Expected: all pass.

- [ ] **Step 5: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/guests/GuestEditSheet.jsx tests/components/guests/GuestEditSheet.test.jsx
git commit -m "feat: prompt to unarchive guest when RSVP updated in edit sheet"
```

---

## Task 7: Manual smoke test + deploy

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Smoke test — archive via long-press**
  - Open My List
  - Hold a guest row for ~500ms
  - Action sheet appears with Edit / Archive / Cancel
  - Tap Archive → guest disappears from main list
  - "Archived (1)" button appears in summary bar

- [ ] **Step 3: Smoke test — archived view**
  - Tap "Archived (1)"
  - Archived guest sheet opens
  - Guest is listed
  - Tap Select → checkbox appears
  - Select guest → Unarchive button appears → tap → guest disappears from archived list → reappears in main list

- [ ] **Step 4: Smoke test — RSVP unarchive prompt**
  - Archive a guest
  - Open that guest via long-press → Edit
  - Toggle an RSVP checkbox
  - Unarchive prompt appears
  - Tap Unarchive → guest reappears in main list

- [ ] **Step 5: Smoke test — bulk archive**
  - Tap Select in main list
  - Select multiple guests
  - Tap 📦 Archive → confirm → guests disappear

- [ ] **Step 6: Deploy**

```bash
npm run build && firebase deploy
```

- [ ] **Step 7: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: smoke test fixes for guest archive feature"
```
