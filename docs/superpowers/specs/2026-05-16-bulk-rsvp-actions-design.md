# Bulk RSVP Actions — Design Spec

**Goal:** Allow the user to select multiple guests in My List, Their List, or Combined, and bulk-toggle a single RSVP field (save-the-date sent, invite sent, or confirmed) across all selected guests in one tap. An undo toast provides a 4-second safety net after each action.

**Architecture:** A `useBulkSelect` hook owns all selection state and bulk-write logic. `GuestList` and `CombinedList` each call it and render the action bar and undo toast inline. `GuestRow` gains two optional props for selection mode. No new Firestore fields.

---

## Hook: `useBulkSelect`

**File:** `src/hooks/useBulkSelect.js`

### Interface

```js
const {
  selectionMode,
  selectedIds,        // Set<string>
  toggleSelectionMode,
  toggleGuest,
  applyBulkAction,
  undoAvailable,
  undoMessage,
  undoBulkAction,
} = useBulkSelect()
```

### Behaviour

**`toggleSelectionMode()`**
- If entering selection mode: sets `selectionMode = true`, clears `selectedIds`
- If exiting selection mode: sets `selectionMode = false`, clears `selectedIds`, cancels any pending undo

**`toggleGuest(id)`**
- Adds `id` to `selectedIds` if not present; removes it if present

**`applyBulkAction(field, guests)`**
- `field`: one of `'saveTheDateSent'`, `'inviteSent'`, `'confirmed'`
- `guests`: the full guests array (from `useGuests`) — used to look up current `rsvp` values
- **Toggle logic:** If ALL selected guests already have `field = true`, set all to `false`. Otherwise set all to `true`.
- Snapshots `{ guestId, field, previousValue }` for each selected guest before writing
- Fires all Firestore `updateDoc` calls in parallel via `Promise.all`
  - For `saveTheDateSent` / `inviteSent`: updates `rsvp[role][field]`
  - For `confirmed`: updates `rsvp.confirmed`
- On success: sets `undoAvailable = true`, sets `undoMessage` (e.g. `"3 guests updated"`), starts 4-second timer to clear undo
- On failure: clears undo, surfaces error via returned `error` string (caller shows toast)
- Uses `useAuth()` internally to get `role`; imports `db` directly from `../../firebase.js` — no arguments needed at call site

**`undoBulkAction()`**
- Writes each snapshot's `previousValue` back to Firestore
- Clears undo state immediately
- On failure: surfaces error string

**Undo timer:** 4 seconds after `applyBulkAction` succeeds, `undoAvailable` becomes `false` automatically. Applying a new action resets the timer (the old undo is gone, new undo starts).

---

## UI Changes

### `GuestList.jsx` and `CombinedList.jsx`

Both components get identical additions:

**Summary bar** gains a "Select" / "Done" button on the right:
```
My List (12)                          [Select]   ← selection mode off
My List · 2 selected                  [Done]     ← selection mode on
```

**Guest rows in selection mode:**
- Each `GuestRow` receives `selectionMode={selectionMode}` and `selected={selectedIds.has(guest.id)}`
- Tapping a row in selection mode calls `toggleGuest(guest.id)` instead of opening edit

**Bottom action bar** — rendered below the list when `selectionMode && selectedIds.size > 0`:
```
[2 selected]    [📅 Date]  [✉️ Invite]  [✅ Confirmed]
```
Each action button on tap shows an inline confirm prompt replacing the bar:
```
Mark invite sent for 2 guests?    [Apply]  [Cancel]
```
Tapping Apply calls `applyBulkAction(field, guests)`. Tapping Cancel returns to the action bar.

**Undo toast** — after Apply fires successfully, a `Toast` is shown:
```
"2 guests updated — Undo"
```
Uses the existing `Toast` component. `onDone` clears undo state. If the user taps "Undo" (a button rendered inside the toast message), `undoBulkAction()` is called.

**Error toast** — if `applyBulkAction` or `undoBulkAction` fails, a `Toast` shows `"Failed to update. Try again."` with no undo option.

**In CombinedList specifically:**
- `applyBulkAction` is called with the current `role` — only the current user's RSVP fields are updated
- `confirmed` is shared (no role), same as individual toggle
- The `entry.id` from the deduplicated combined list maps directly to the real Firestore guest document ID

### `GuestRow.jsx`

Two new optional props:
- `selectionMode` (boolean, default `false`) — when true, renders a checkbox on the left and hides RSVP icons
- `selected` (boolean, default `false`) — controls checkbox checked state

When `selectionMode` is true:
- Row tap calls `onEdit` (which the parent remaps to `toggleGuest`) — the existing `onClick` handler is reused
- RSVP icons (`RsvpIcons`) are not rendered
- A checkbox visual appears on the left (a styled `div`, not a native `<input type="checkbox">`, to match app styling)

When `selectionMode` is false: behaviour unchanged from current implementation.

---

## Behaviour Details

- **Partial failure:** If any write in `Promise.all` rejects, the entire action is considered failed. An error toast is shown. No undo is offered (state may be partially written — user must check manually).
- **No select-all:** Guests are selected one by one only.
- **Exiting selection mode:** "Done" button clears selection and hides the action bar. Any pending undo toast remains until it expires.
- **Their List (readOnly):** `selectionMode` is not available in readOnly mode. The "Select" button is not rendered when `readOnly={true}`. If `readOnly` is true, `toggleSelectionMode` is a no-op and `selectionMode` stays false.
- **Confirmed field:** In GuestList (My List), `confirmed` is a shared field — updating it from My List affects both users' view, same as the existing individual toggle.

---

## Files to Change

| File | Change |
|---|---|
| `src/hooks/useBulkSelect.js` | New hook — selection state + bulk write + undo |
| `tests/hooks/useBulkSelect.test.js` | New tests |
| `src/components/guests/GuestList.jsx` | Select button, selection mode rows, action bar, undo toast |
| `src/components/guests/CombinedList.jsx` | Same additions |
| `src/components/ui/GuestRow.jsx` | `selectionMode` + `selected` props, checkbox, hide RSVP icons |
| `tests/components/ui/GuestRow.test.jsx` | Tests for selection mode rendering |

---

## Tests

| File | Tests |
|---|---|
| `tests/hooks/useBulkSelect.test.js` | `toggleGuest` adds/removes ids; `applyBulkAction` sets all true when mixed; sets all false when all true; snapshots correctly; `undoBulkAction` restores previous values; undo clears after 4s |
| `tests/components/ui/GuestRow.test.jsx` | Renders checkbox when `selectionMode=true`; hides RSVP icons in selection mode; calls `onEdit` on row tap in selection mode |
