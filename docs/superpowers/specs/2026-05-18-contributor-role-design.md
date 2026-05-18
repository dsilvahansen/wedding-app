# Contributor Role — Design Spec

**Goal:** Add `hContributor` and `lContributor` roles so trusted helpers (e.g. Hansen's dad, Lavita's sister) can add and edit guests on their respective side without access to RSVP tracking.

**Architecture:** A new `ownerRole` field (`'hansen'` | `'lavita'`) and `createdByRole` field (`'hansen'` | `'lavita'` | `'hContributor'` | `'lContributor'`) are stored on every guest document. GuestList filters by `ownerRole` instead of `ownerId`. Contributors see a C badge on guests they added. RSVP section hidden for contributors. No new auth system — just a new role value in the Firestore `users` doc.

---

## Roles

| Role | Side | Can edit | RSVP access |
|---|---|---|---|
| `'hansen'` | Hansen | Hansen's list | Full |
| `'lavita'` | Lavita | Lavita's list | Full |
| `'hContributor'` | Hansen | Hansen's list | None |
| `'lContributor'` | Lavita | Lavita's list | None |

**Side helpers** (used throughout):
```js
function getOwnerRole(role) {
  return (role === 'hansen' || role === 'hContributor') ? 'hansen' : 'lavita'
}

function isContributor(role) {
  return role === 'hContributor' || role === 'lContributor'
}
```

---

## Data Model

### Guest document — two new fields

| Field | Type | Values | Set by |
|---|---|---|---|
| `ownerRole` | string | `'hansen'` \| `'lavita'` | `AddGuest` on create — derived from `getOwnerRole(role)` |
| `createdByRole` | string | `'hansen'` \| `'lavita'` \| `'hContributor'` \| `'lContributor'` | `AddGuest` on create — set to exact `role` |

`ownerId` stays as the real Firebase UID of whoever created the guest.

**Existing guests** (created before this feature) have no `ownerRole` or `createdByRole`. All existing guests were created by Hansen or Lavita, so they implicitly have `ownerRole` equal to the role of the user whose UID matches their `ownerId`. The GuestList filter must handle missing `ownerRole` by falling back to `ownerId === user?.uid`.

---

## GuestList filter change

**Before:**
```js
const myGuests = guests.filter(g => readOnly
  ? g.ownerId !== user?.uid
  : g.ownerId === user?.uid
)
```

**After:**
```js
const myOwnerRole = getOwnerRole(role)
const myGuests = guests.filter(g => {
  // New guests have ownerRole; legacy guests fall back to ownerId
  const guestSide = g.ownerRole ?? (g.ownerId === user?.uid ? myOwnerRole : (myOwnerRole === 'hansen' ? 'lavita' : 'hansen'))
  return readOnly ? guestSide !== myOwnerRole : guestSide === myOwnerRole
})
```

---

## Badge in GuestList (My List)

Currently GuestList passes no `badge` prop to GuestRow. After this change:
- If `guest.createdByRole === 'hContributor'` or `'lContributor'`: show **C badge** (`{ label: 'C', style: { backgroundColor: '#d0e8d0', color: '#2e7d32' } }` — green)
- Otherwise: no badge (Hansen's and Lavita's own guests stay clean)

The C badge only appears in the guest's own side's My List. In Combined tab, contributor guests show **H** or **L** (based on `ownerRole`) — no C badge there.

---

## Combined tab badge change

`getBadge()` currently uses `entry.ownerId === user?.uid` to decide H vs L. This breaks for contributor guests whose `ownerId` is neither Hansen nor Lavita.

**After:**
```js
function getBadge(entry) {
  if (entry.shared) return { label: '★', style: { backgroundColor: '#f39c12', color: '#fff' } }
  const entryOwnerRole = entry.ownerRole ?? (entry.ownerId === user?.uid ? getOwnerRole(role) : (getOwnerRole(role) === 'hansen' ? 'lavita' : 'hansen'))
  const isMyGuest = entryOwnerRole === getOwnerRole(role)
  const label = isMyGuest ? (getOwnerRole(role) === 'hansen' ? 'H' : 'L') : (getOwnerRole(role) === 'hansen' ? 'L' : 'H')
  const style = isMyGuest
    ? { backgroundColor: '#e0d0f0', color: '#9b59b6' }
    : { backgroundColor: '#f0d0e8', color: '#c0369b' }
  return { label, style }
}
```

---

## Contributor UI restrictions

When `isContributor(role)` is true:

### GuestList
- **No "Select" bulk button** — hide when contributor
- **RSVP toggle** — `readOnly={true}` passed to GuestRow so RSVP icons are visible but not tappable (they can see the status but not change it)
- **Edit** — contributor can open GuestEditSheet for guests on their side

### GuestEditSheet
- **Hide RSVP section entirely** when `isContributor(role)` — no RSVP checkboxes shown
- All other fields (name, tags, weight, group toggle, notes) remain editable

### Their List (opposite side)
- `readOnly={true}` — same as today for Hansen/Lavita viewing each other's list
- Contributor cannot edit the opposite side

### TopBar
- Shows the `displayName` from the Firestore `users` doc (e.g. "Dad") — no code change needed, already works this way

---

## AddGuest changes

On save, add two fields:
```js
ownerRole: getOwnerRole(role),     // 'hansen' or 'lavita'
createdByRole: role,               // 'hansen' | 'lavita' | 'hContributor' | 'lContributor'
```

---

## Files to Change

| File | Change |
|---|---|
| `src/lib/guestUtils.js` | Add `getOwnerRole(role)` and `isContributor(role)` helpers |
| `tests/lib/guestUtils.test.js` | Tests for both helpers |
| `src/components/guests/AddGuest.jsx` | Save `ownerRole` + `createdByRole` on create |
| `src/components/guests/GuestList.jsx` | Filter by `ownerRole` with legacy fallback; C badge; hide Select for contributor |
| `src/components/guests/CombinedList.jsx` | `getBadge()` uses `ownerRole` with legacy fallback |
| `src/components/guests/GuestEditSheet.jsx` | Hide RSVP section for contributor; pass `role` as prop |

---

## Tests

| File | Tests |
|---|---|
| `tests/lib/guestUtils.test.js` | `getOwnerRole('hansen')` → `'hansen'`; `getOwnerRole('hContributor')` → `'hansen'`; `getOwnerRole('lavita')` → `'lavita'`; `getOwnerRole('lContributor')` → `'lavita'`; `isContributor('hContributor')` → true; `isContributor('hansen')` → false |

No new component tests — GuestList/CombinedList/GuestEditSheet changes are thin UI branches tested manually.

---

## Setup instructions (manual, done in Firebase Console)

1. Create Firebase Auth user: `dad@wedding.local` (or any email)
2. Get the UID from Firebase Console → Authentication
3. Create Firestore document: `users/{dad_uid}` → `{ role: "hContributor", email: "dad@wedding.local", displayName: "Dad" }`
4. Done — no code changes needed for auth

---

## Backward compatibility

All existing guest documents lack `ownerRole` and `createdByRole`. The filter and badge logic falls back gracefully using `ownerId` comparison for legacy guests. No migration needed.
