# Family / Group Guest Entries — Design Spec

**Goal:** Allow a guest entry to represent a family or group (e.g. "Smith family") with an adults count, kids count, and optional notes field. The total headcount is shown inline with the name.

**Architecture:** Additive — 4 new optional fields on the existing Firestore guest document. No migration needed for existing single-guest documents. UI changes are isolated to AddGuest, GuestEditSheet, GuestRow, and guestUtils.

---

## Data Model

Four new optional fields added to the `/guests/{guestId}` document:

| Field | Type | Default | Notes |
|---|---|---|---|
| `isGroup` | boolean | `false` / absent | When true, this entry represents a family or group |
| `adultCount` | number | absent | Number of adults in the group. Only set when `isGroup=true`. Min 1. |
| `kidCount` | number | absent | Number of children in the group. Only set when `isGroup=true`. Min 0. |
| `groupNotes` | string | absent | Optional free text (e.g. member names). Only set when `isGroup=true`. |

Total headcount = `adultCount + kidCount`.

Existing single-guest documents are unaffected. All new fields are optional — consumers must treat absent fields as falsy/zero.

---

## UI Changes

### 1. AddGuest.jsx

A "👨‍👩‍👧 Family / Group" toggle is added below the name input field.

**Toggle off (default):**
- Toggle rendered as a grey inactive switch
- No additional fields shown
- Saves `isGroup: false` (or omits the field)

**Toggle on:**
- Toggle rendered as purple active switch
- Reveals three fields below the toggle:
  - **Adults stepper:** label "Adults", minus button, count (min 1, default 1), plus button
  - **Kids stepper:** label "Kids", minus button, count (min 0, default 0), plus button
  - **Notes textarea:** label "Notes (optional)", free text, placeholder "e.g. John, Jane + 1 kid..."
- On save: writes `isGroup: true`, `adultCount`, `kidCount`, `groupNotes` (empty string if blank)

### 2. GuestEditSheet.jsx

Same toggle + counters + notes available when editing an existing guest. State initialised from the existing guest document fields. Saves the same fields on update.

### 3. GuestRow.jsx

When `guest.isGroup` is true, the displayed name becomes:

```
{guest.name} ({adultCount + kidCount})
```

e.g. "Smith family (4)"

This is a display-only change — the stored `name` field remains unchanged ("Smith family").

### 4. guestUtils.js — `getTotalHeadcount(guest)`

New exported utility function:

```js
export function getTotalHeadcount(guest) {
  if (!guest.isGroup) return 1
  return (guest.adultCount ?? 0) + (guest.kidCount ?? 0)
}
```

Used by the Combined tab to sum total people (not documents) when displaying aggregate counts.

### 5. CombinedList.jsx

The summary bar currently shows `{combined.length} total`. This changes to show total headcount:

```
{combined.reduce((sum, g) => sum + getTotalHeadcount(g), 0)} total
```

The document count (number of unique entries) is unchanged in deduplication logic.

---

## Behaviour Details

- **Stepper min values:** Adults min = 1 (a group must have at least 1 adult). Kids min = 0.
- **Toggle off resets:** If the user turns the toggle off after setting counts, the counts are cleared (not persisted). The saved document will not include `isGroup`, `adultCount`, `kidCount`, or `groupNotes`.
- **Notes field:** Plain text only, no formatting. Max length not enforced in UI (Firestore limit applies).
- **Weight:** Unchanged — weight still applies to the group entry as a whole (same as any guest).
- **RSVP:** Unchanged — RSVP tracks the entry, not individual members. `confirmed` applies to the whole group.
- **Deduplication:** Unchanged — `deduplicateForCombined` merges by name/linkedGuestId as before. A group entry merges with a same-named partner entry the same way a single guest would.
- **Their List / readOnly:** Group entries shown with count in name, same as My List. No edit possible in readOnly mode.

---

## Files to Change

| File | Change |
|---|---|
| `src/lib/guestUtils.js` | Add `getTotalHeadcount(guest)` export |
| `src/components/guests/AddGuest.jsx` | Add isGroup toggle, steppers, notes textarea |
| `src/components/guests/GuestEditSheet.jsx` | Add same toggle/steppers/notes, initialise from existing guest |
| `src/components/ui/GuestRow.jsx` | Render `name (total)` when `isGroup=true` |
| `src/components/guests/CombinedList.jsx` | Use `getTotalHeadcount` for summary bar count |

---

## Tests

| File | New tests |
|---|---|
| `tests/lib/guestUtils.test.js` | `getTotalHeadcount` — single guest returns 1, group returns adultCount+kidCount, missing fields return 0 |
| `tests/components/guests/AddGuest.test.jsx` | Toggle shows/hides counters; save with isGroup=true includes correct fields |
| `tests/components/ui/GuestRow.test.jsx` | Group guest renders "Smith family (4)" |
