# Family / Group Guest Entries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a guest entry to represent a family or group (e.g. "Smith family") with adult/kid counts and optional notes, displaying total headcount inline in the guest name.

**Architecture:** Additive — 4 new optional fields (`isGroup`, `adultCount`, `kidCount`, `groupNotes`) on existing Firestore guest documents. No migration needed. `getTotalHeadcount` utility function added to `guestUtils.js` and used in `CombinedList`. Toggle UI in `AddGuest` and `GuestEditSheet` reveals stepper + textarea when activated. `GuestRow` renders `name (N)` when `isGroup=true`.

**Tech Stack:** React 18, Vitest + React Testing Library, Tailwind CSS, Firebase Firestore

---

## File Map

| File | Change |
|---|---|
| `src/lib/guestUtils.js` | Add `getTotalHeadcount(guest)` export |
| `tests/lib/guestUtils.test.js` | Add tests for `getTotalHeadcount` |
| `src/components/ui/GuestRow.jsx` | Render `name (N)` when `isGroup=true` |
| `tests/components/ui/GuestRow.test.jsx` | Add group rendering tests |
| `src/components/guests/AddGuest.jsx` | Add isGroup toggle, adults/kids steppers, notes textarea |
| `tests/components/guests/AddGuest.test.jsx` | Add toggle show/hide + save payload tests |
| `src/components/guests/GuestEditSheet.jsx` | Add same toggle/steppers/notes, initialised from existing guest |
| `src/components/guests/CombinedList.jsx` | Use `getTotalHeadcount` in summary bar total |

---

### Task 1: `getTotalHeadcount` utility

**Files:**
- Modify: `src/lib/guestUtils.js`
- Modify: `tests/lib/guestUtils.test.js`

- [ ] **Step 1: Write the failing tests**

Add to `tests/lib/guestUtils.test.js` (after the existing `sortGuests` describe block):

```js
import {
  calcWeight,
  findDuplicates,
  deduplicateForCombined,
  sortGuests,
  getTotalHeadcount,
} from '../../src/lib/guestUtils.js'
```

```js
describe('getTotalHeadcount', () => {
  it('returns 1 for a non-group guest', () => {
    expect(getTotalHeadcount({ name: 'Alice' })).toBe(1)
  })

  it('returns 1 when isGroup is false', () => {
    expect(getTotalHeadcount({ isGroup: false, adultCount: 3, kidCount: 1 })).toBe(1)
  })

  it('returns adultCount + kidCount for a group guest', () => {
    expect(getTotalHeadcount({ isGroup: true, adultCount: 2, kidCount: 1 })).toBe(3)
  })

  it('returns 0 for a group with no counts set', () => {
    expect(getTotalHeadcount({ isGroup: true })).toBe(0)
  })

  it('treats missing kidCount as 0', () => {
    expect(getTotalHeadcount({ isGroup: true, adultCount: 3 })).toBe(3)
  })

  it('treats missing adultCount as 0', () => {
    expect(getTotalHeadcount({ isGroup: true, kidCount: 2 })).toBe(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/i354601/Documents/git/weddingApp
npx vitest run tests/lib/guestUtils.test.js
```

Expected: FAIL — `getTotalHeadcount is not a function` (or similar import error)

- [ ] **Step 3: Add `getTotalHeadcount` to `src/lib/guestUtils.js`**

Append to the bottom of the file (after `sortGuests`):

```js
export function getTotalHeadcount(guest) {
  if (!guest.isGroup) return 1
  return (guest.adultCount ?? 0) + (guest.kidCount ?? 0)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/lib/guestUtils.test.js
```

Expected: All tests pass (including new ones)

- [ ] **Step 5: Commit**

```bash
git add src/lib/guestUtils.js tests/lib/guestUtils.test.js
git commit -m "feat: add getTotalHeadcount utility for group guest entries"
```

---

### Task 2: GuestRow — render group count inline

**Files:**
- Modify: `src/components/ui/GuestRow.jsx`
- Modify: `tests/components/ui/GuestRow.test.jsx`

- [ ] **Step 1: Write the failing tests**

Add to `tests/components/ui/GuestRow.test.jsx` (inside the `describe('GuestRow', ...)` block):

```js
it('renders name with headcount for group guest', () => {
  const groupGuest = {
    ...guest,
    name: 'Smith family',
    isGroup: true,
    adultCount: 2,
    kidCount: 1,
  }
  render(<GuestRow guest={groupGuest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} />)
  expect(screen.getByText('Smith family')).toBeInTheDocument()
  expect(screen.getByText('(3)')).toBeInTheDocument()
})

it('does not render count for non-group guest', () => {
  render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} />)
  expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/ui/GuestRow.test.jsx
```

Expected: FAIL — count `(3)` not found in DOM

- [ ] **Step 3: Update `src/components/ui/GuestRow.jsx`**

The name rendering section currently is:

```jsx
<span className="font-medium text-sm truncate">{guest.name}</span>
```

Replace the `<div className="flex items-center gap-1">` block (the name + badge row) with:

```jsx
<div className="flex items-center gap-1">
  <span className="font-medium text-sm truncate">{guest.name}</span>
  {guest.isGroup && (
    <span className="text-xs text-gray-500 font-medium">
      ({(guest.adultCount ?? 0) + (guest.kidCount ?? 0)})
    </span>
  )}
  {badge && (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={badge.style}>{badge.label}</span>
  )}
</div>
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/components/ui/GuestRow.test.jsx
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/GuestRow.jsx tests/components/ui/GuestRow.test.jsx
git commit -m "feat: show group headcount inline in GuestRow name"
```

---

### Task 3: AddGuest — isGroup toggle, steppers, notes

**Files:**
- Modify: `src/components/guests/AddGuest.jsx`
- Modify: `tests/components/guests/AddGuest.test.jsx`

- [ ] **Step 1: Write the failing tests**

Replace the content of `tests/components/guests/AddGuest.test.jsx` with:

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addDoc } from 'firebase/firestore'

vi.mock('../../../src/hooks/useAuth.js', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, role: 'hansen' }),
}))
vi.mock('../../../src/hooks/useGuests.js', () => ({
  useGuests: () => ({ guests: [] }),
}))
vi.mock('../../../src/hooks/useTags.js', () => ({
  useTags: () => ({ tags: [{ id: 't1', name: 'Family', color: '#e8f4e8', createdByInitial: 'H', weights: { u1: 9 } }] }),
}))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: 'new-guest' }),
  serverTimestamp: vi.fn(() => 'ts'),
}))
vi.mock('../../../src/firebase.js', () => ({ db: {} }))

import AddGuest from '../../../src/components/guests/AddGuest.jsx'

describe('AddGuest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders name input', () => {
    render(<AddGuest />)
    expect(screen.getByPlaceholderText(/guest name/i)).toBeInTheDocument()
  })

  it('renders tag pills', () => {
    render(<AddGuest />)
    expect(screen.getByText('Family')).toBeInTheDocument()
  })

  it('shows Save + Add Next button', () => {
    render(<AddGuest />)
    expect(screen.getByText(/save \+ add next/i)).toBeInTheDocument()
  })

  it('shows Family / Group toggle', () => {
    render(<AddGuest />)
    expect(screen.getByText(/family \/ group/i)).toBeInTheDocument()
  })

  it('does not show counters when toggle is off', () => {
    render(<AddGuest />)
    expect(screen.queryByText('Adults')).not.toBeInTheDocument()
    expect(screen.queryByText('Kids')).not.toBeInTheDocument()
  })

  it('shows counters and notes when toggle is turned on', () => {
    render(<AddGuest />)
    fireEvent.click(screen.getByRole('checkbox', { name: /family \/ group/i }))
    expect(screen.getByText('Adults')).toBeInTheDocument()
    expect(screen.getByText('Kids')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/e\.g\. john, jane/i)).toBeInTheDocument()
  })

  it('increments adult count with plus button', () => {
    render(<AddGuest />)
    fireEvent.click(screen.getByRole('checkbox', { name: /family \/ group/i }))
    const plusButtons = screen.getAllByRole('button', { name: '+' })
    fireEvent.click(plusButtons[0]) // adults +
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('does not decrement adults below 1', () => {
    render(<AddGuest />)
    fireEvent.click(screen.getByRole('checkbox', { name: /family \/ group/i }))
    const minusButtons = screen.getAllByRole('button', { name: '−' })
    fireEvent.click(minusButtons[0]) // adults −
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('saves isGroup fields when toggle is on', async () => {
    render(<AddGuest />)
    fireEvent.change(screen.getByPlaceholderText(/guest name/i), { target: { value: 'Smith family' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /family \/ group/i }))
    // increment adults to 2
    const plusButtons = screen.getAllByRole('button', { name: '+' })
    fireEvent.click(plusButtons[0])
    fireEvent.click(screen.getByText(/save \+ add next/i))
    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isGroup: true,
          adultCount: 2,
          kidCount: 0,
          groupNotes: '',
        })
      )
    })
  })

  it('does not save group fields when toggle is off', async () => {
    render(<AddGuest />)
    fireEvent.change(screen.getByPlaceholderText(/guest name/i), { target: { value: 'Alice' } })
    fireEvent.click(screen.getByText(/save \+ add next/i))
    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.not.objectContaining({ isGroup: true })
      )
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/guests/AddGuest.test.jsx
```

Expected: Multiple FAILs — no toggle, no counters, no group fields in save payload

- [ ] **Step 3: Update `src/components/guests/AddGuest.jsx`**

Add state variables after existing state declarations (after `const [linkedGuestId, setLinkedGuestId] = useState(null)`):

```jsx
const [isGroup, setIsGroup] = useState(false)
const [adultCount, setAdultCount] = useState(1)
const [kidCount, setKidCount] = useState(0)
const [groupNotes, setGroupNotes] = useState('')
```

Update `handleSave` to include group fields — replace the `await addDoc(...)` call with:

```jsx
const groupFields = isGroup
  ? { isGroup: true, adultCount, kidCount, groupNotes }
  : {}

await addDoc(collection(db, 'guests'), {
  name: name.trim(),
  ownerId: user.uid,
  tags: selectedTags,
  weight: effectiveWeight,
  weightOverride,
  linkedGuestId: linkedGuestId || null,
  ...groupFields,
  rsvp: {
    hansen: { saveTheDateSent: false, inviteSent: false },
    lavita: { saveTheDateSent: false, inviteSent: false },
    confirmed: false,
  },
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})
```

Also reset group state after save — add to the reset block after `setToast(...)`:

```jsx
setIsGroup(false)
setAdultCount(1)
setKidCount(0)
setGroupNotes('')
```

Add the toggle + fields UI in the JSX, between the name `</div>` and the Tags `<div>`:

```jsx
{/* Family / Group toggle */}
<div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isGroup ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
  <label htmlFor="isGroupToggle" className={`text-xs font-medium cursor-pointer select-none ${isGroup ? 'text-purple-600' : 'text-gray-500'}`}>
    👨‍👩‍👧 Family / Group
  </label>
  <input
    id="isGroupToggle"
    type="checkbox"
    aria-label="Family / Group"
    checked={isGroup}
    onChange={e => {
      setIsGroup(e.target.checked)
      if (!e.target.checked) {
        setAdultCount(1)
        setKidCount(0)
        setGroupNotes('')
      }
    }}
    className="ml-auto accent-purple-500 w-4 h-4 cursor-pointer"
  />
</div>

{/* Group counters + notes (visible only when isGroup) */}
{isGroup && (
  <div className="space-y-3">
    <div className="flex gap-3">
      {/* Adults stepper */}
      <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-center">
        <p className="text-xs text-gray-500 mb-1">Adults</p>
        <div className="flex items-center justify-center gap-4">
          <button type="button" aria-label="−" onClick={() => setAdultCount(c => Math.max(1, c - 1))} className="text-purple-500 font-bold text-lg leading-none">−</button>
          <span className="font-bold text-sm w-4 text-center">{adultCount}</span>
          <button type="button" aria-label="+" onClick={() => setAdultCount(c => c + 1)} className="text-purple-500 font-bold text-lg leading-none">+</button>
        </div>
      </div>
      {/* Kids stepper */}
      <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-center">
        <p className="text-xs text-gray-500 mb-1">Kids</p>
        <div className="flex items-center justify-center gap-4">
          <button type="button" aria-label="−" onClick={() => setKidCount(c => Math.max(0, c - 1))} className="text-purple-500 font-bold text-lg leading-none">−</button>
          <span className="font-bold text-sm w-4 text-center">{kidCount}</span>
          <button type="button" aria-label="+" onClick={() => setKidCount(c => c + 1)} className="text-purple-500 font-bold text-lg leading-none">+</button>
        </div>
      </div>
    </div>
    {/* Notes textarea */}
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-500 mb-1">Notes (optional)</p>
      <textarea
        value={groupNotes}
        onChange={e => setGroupNotes(e.target.value)}
        placeholder="e.g. John, Jane + 1 kid..."
        rows={2}
        className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-purple-300"
      />
    </div>
  </div>
)}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/components/guests/AddGuest.test.jsx
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/guests/AddGuest.jsx tests/components/guests/AddGuest.test.jsx
git commit -m "feat: add family/group toggle to AddGuest with adult/kid counters and notes"
```

---

### Task 4: GuestEditSheet + CombinedList

**Files:**
- Modify: `src/components/guests/GuestEditSheet.jsx`
- Modify: `src/components/guests/CombinedList.jsx`

No new test files — GuestEditSheet changes mirror AddGuest (toggle + steppers), and CombinedList change is a one-liner utility swap. Verify via the full test suite at the end.

- [ ] **Step 1: Update `src/components/guests/GuestEditSheet.jsx`**

Add state variables after existing state declarations (after `const [overrideValue, ...]`):

```jsx
const [isGroup, setIsGroup] = useState(guest?.isGroup || false)
const [adultCount, setAdultCount] = useState(guest?.adultCount ?? 1)
const [kidCount, setKidCount] = useState(guest?.kidCount ?? 0)
const [groupNotes, setGroupNotes] = useState(guest?.groupNotes || '')
```

Update `handleSave` — add group fields to the `updateDoc` call:

```jsx
async function handleSave() {
  try {
    const groupFields = isGroup
      ? { isGroup: true, adultCount, kidCount, groupNotes }
      : { isGroup: false, adultCount: null, kidCount: null, groupNotes: null }

    await updateDoc(doc(db, 'guests', guest.id), {
      name: name.trim(),
      tags: selectedTags,
      weight: effectiveWeight,
      weightOverride,
      ...groupFields,
      updatedAt: serverTimestamp(),
    })
    onClose()
  } catch (err) {
    console.error(err)
    alert('Failed to save. Please try again.')
  }
}
```

Add the toggle + fields UI in the JSX, between the Weight section and the RSVP Status section. Insert after the weight `</div>` closing tag:

```jsx
{/* Family / Group toggle */}
<div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isGroup ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
  <label htmlFor="editIsGroupToggle" className={`text-xs font-medium cursor-pointer select-none ${isGroup ? 'text-purple-600' : 'text-gray-500'}`}>
    👨‍👩‍👧 Family / Group
  </label>
  <input
    id="editIsGroupToggle"
    type="checkbox"
    aria-label="Family / Group"
    checked={isGroup}
    onChange={e => {
      setIsGroup(e.target.checked)
      if (!e.target.checked) {
        setAdultCount(1)
        setKidCount(0)
        setGroupNotes('')
      }
    }}
    className="ml-auto accent-purple-500 w-4 h-4 cursor-pointer"
  />
</div>

{isGroup && (
  <div className="space-y-3">
    <div className="flex gap-3">
      <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-center">
        <p className="text-xs text-gray-500 mb-1">Adults</p>
        <div className="flex items-center justify-center gap-4">
          <button type="button" aria-label="−" onClick={() => setAdultCount(c => Math.max(1, c - 1))} className="text-purple-500 font-bold text-lg leading-none">−</button>
          <span className="font-bold text-sm w-4 text-center">{adultCount}</span>
          <button type="button" aria-label="+" onClick={() => setAdultCount(c => c + 1)} className="text-purple-500 font-bold text-lg leading-none">+</button>
        </div>
      </div>
      <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-center">
        <p className="text-xs text-gray-500 mb-1">Kids</p>
        <div className="flex items-center justify-center gap-4">
          <button type="button" aria-label="−" onClick={() => setKidCount(c => Math.max(0, c - 1))} className="text-purple-500 font-bold text-lg leading-none">−</button>
          <span className="font-bold text-sm w-4 text-center">{kidCount}</span>
          <button type="button" aria-label="+" onClick={() => setKidCount(c => c + 1)} className="text-purple-500 font-bold text-lg leading-none">+</button>
        </div>
      </div>
    </div>
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-500 mb-1">Notes (optional)</p>
      <textarea
        value={groupNotes}
        onChange={e => setGroupNotes(e.target.value)}
        placeholder="e.g. John, Jane + 1 kid..."
        rows={2}
        className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-purple-300"
      />
    </div>
  </div>
)}
```

- [ ] **Step 2: Update `src/components/guests/CombinedList.jsx`**

Update the import line to include `getTotalHeadcount`:

```jsx
import { deduplicateForCombined, sortGuests, getTotalHeadcount } from '../../lib/guestUtils.js'
```

Replace the summary bar total count — change:

```jsx
<span className="text-sm font-semibold text-purple-700">{combined.length} total</span>
```

to:

```jsx
<span className="text-sm font-semibold text-purple-700">
  {combined.reduce((sum, g) => sum + getTotalHeadcount(g), 0)} total
</span>
```

- [ ] **Step 3: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests pass (including new ones from Tasks 1–3)

- [ ] **Step 4: Build to verify no compilation errors**

```bash
npm run build
```

Expected: Build succeeds (chunk size warning is expected and acceptable)

- [ ] **Step 5: Commit**

```bash
git add src/components/guests/GuestEditSheet.jsx src/components/guests/CombinedList.jsx
git commit -m "feat: add group toggle to GuestEditSheet and use headcount in CombinedList total"
```

---

## Spec Coverage Self-Review

- ✅ `isGroup`, `adultCount`, `kidCount`, `groupNotes` fields — Task 3 (AddGuest save), Task 4 (GuestEditSheet save)
- ✅ `getTotalHeadcount` utility — Task 1
- ✅ AddGuest toggle off = no counters, toggle on = reveals counters + notes — Task 3 tests
- ✅ Adults min = 1, kids min = 0 — Task 3 stepper code + test
- ✅ Toggle off resets counts — Task 3 onChange handler + Task 4 onChange handler
- ✅ GuestRow renders `name (N)` when `isGroup=true` — Task 2
- ✅ CombinedList summary bar uses headcount total — Task 4
- ✅ GuestEditSheet initialised from existing guest fields — Task 4 (useState init from `guest?.adultCount`)
- ✅ No migration needed — additive fields, no changes to existing Firestore structure
