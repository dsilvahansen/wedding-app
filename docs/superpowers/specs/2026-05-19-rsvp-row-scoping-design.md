# RSVP Row Scoping — Design Spec

**Goal:** In GuestEditSheet, show only the RSVP row(s) relevant to the guest's ownership side. Hansen's guests show only Hansen's row; Lavita's guests show only Lavita's row; shared guests show both.

**Architecture:** One file change (`GuestEditSheet.jsx`). Compute `guestOwnerRole` from `guest.ownerRole` with legacy `ownerId` fallback (same pattern as GuestList filter). Derive `rsvpRows` array from that, replacing the hardcoded `['hansen', 'lavita']` in the existing map. Editability rules (`disabled={r !== role}`) unchanged.

---

## Behaviour

| Guest side | Logged in as | Hansen row | Lavita row | Confirmed |
|---|---|---|---|---|
| Hansen's guest | Hansen | ✅ editable | hidden | ✅ editable |
| Hansen's guest | Lavita | ✅ read-only | hidden | ✅ editable |
| Lavita's guest | Hansen | hidden | ✅ read-only | ✅ editable |
| Lavita's guest | Lavita | hidden | ✅ editable | ✅ editable |
| Shared guest | Hansen | ✅ editable | ✅ read-only | ✅ editable |
| Shared guest | Lavita | ✅ read-only | ✅ editable | ✅ editable |
| Contributor's guest | hContributor | RSVP section hidden entirely (existing behaviour) | | |

---

## Implementation

### File to change

`src/components/guests/GuestEditSheet.jsx`

### Import change

Add `getOwnerRole` to the existing guestUtils import:
```js
import { calcWeight, isContributor, getOwnerRole } from '../../lib/guestUtils.js'
```

### Logic to add (before the RSVP section JSX)

```js
const guestOwnerRole = guest.ownerRole
  ?? (guest.ownerId === userId
    ? getOwnerRole(role)
    : (getOwnerRole(role) === 'hansen' ? 'lavita' : 'hansen'))

const rsvpRows = guest.shared ? ['hansen', 'lavita'] : [guestOwnerRole]
```

### JSX change

Replace:
```jsx
{['hansen', 'lavita'].map(r => (
```
With:
```jsx
{rsvpRows.map(r => (
```

---

## Backward compatibility

Legacy guests (no `ownerRole`) fall back to `ownerId` comparison — same pattern already used in GuestList and CombinedList. No migration needed.

## No new tests

Single UI branch, tested manually.
