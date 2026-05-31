# Guest Archive Feature — Design Spec

**Date:** 2026-05-31
**Status:** Approved

---

## Overview

Add the ability to archive guests who are "maybe" invites — guests you'd invite only if space allows. Archived guests are hidden from the main list and excluded from all guest counts. A dedicated archived view allows review and unarchiving. If an archived guest's RSVP is updated, a prompt offers to unarchive them.

---

## Data Model

- Add `archived: boolean` field to each guest Firestore document.
- Absent or `false` = active guest (default, no migration needed).
- `true` = archived guest.
- No new collections or subcollections.

---

## Filtering

- `GuestList` filters the main list to `!g.archived` before rendering.
- The summary bar headcount excludes archived guests entirely — no separate count displayed in the main view.
- All existing tag filtering, sort, and RSVP logic operates only on active (non-archived) guests.
- `useGuests` continues to fetch all guests from Firestore; filtering is done in the component.

---

## Archiving a Guest

### Single guest — long-press
- Holding a `GuestRow` for ~500ms opens a bottom action sheet with two options: **Archive** and **Edit**.
- "Edit" is a shortcut equivalent to tapping the row normally (opens `GuestEditSheet`).
- "Archive" writes `{ archived: true, updatedAt: serverTimestamp() }` to the guest doc and closes the sheet.
- Available to both owner and contributor roles.
- Disabled in `readOnly` mode (partner's list view).

### Bulk — selection mode
- The existing selection mode bottom bar adds an **Archive** button alongside STD / Invite / Confirmed.
- Same confirm-then-apply pattern: tapping Archive shows "Archive N guests?" with Cancel / Apply.
- On apply, writes `{ archived: true, updatedAt: serverTimestamp() }` for each selected guest.
- Available to both owner and contributor roles.
- Not shown in `readOnly` mode.

---

## Archived List View

- An **"Archived (N)"** button appears in the `GuestList` summary bar when `N > 0` archived guests exist on that side.
- Tapping it opens a `BottomSheet` titled "Archived Guests".
- The sheet lists only archived guests for that side (same ownerRole scoping as the main list).
- Uses the existing `GuestRow` component; RSVP icons are read-only in this view.
- **Selection mode** is available inside the sheet: selecting one or more guests shows an **Unarchive** button in a bottom action bar.
- **Long-press** on a single archived guest row opens an action sheet with **Unarchive**.
- Both paths write `{ archived: false, updatedAt: serverTimestamp() }` to the guest doc.
- No tag filtering or sorting in the archived view — keep it simple.
- Available to both owner and contributor roles. `readOnly` mode shows the archived list as view-only (no unarchive controls).

---

## RSVP Change → Unarchive Prompt

- In `GuestEditSheet`, `handleRsvpToggle` already writes RSVP changes directly to Firestore on each toggle (not deferred to save).
- After any successful RSVP write, if `guest.archived === true`, show a confirmation dialog:
  > **"[Guest name] has an RSVP update. Unarchive them?"**
  > **Unarchive** · **Keep archived**
- If the user taps Unarchive: write `{ archived: false, updatedAt: serverTimestamp() }` to the guest doc.
- If the user taps Keep archived or dismisses: no further action.
- The RSVP change is already saved regardless — the prompt is only about the archive status.
- Applies to all three RSVP fields: `saveTheDateSent`, `inviteSent`, `confirmed`.

---

## Access Control

- Both owner (`hansen`, `lavita`) and contributor (`hContributor`, `lContributor`) roles can archive and unarchive guests.
- `readOnly` prop disables all archive/unarchive actions, matching existing edit/RSVP restrictions.

---

## Components Affected

| Component | Change |
|---|---|
| `GuestList.jsx` | Filter out archived guests; add "Archived (N)" button; long-press handler on rows; Archive action in bulk select bar |
| `GuestRow.jsx` | Add long-press support (onLongPress prop) |
| `GuestEditSheet.jsx` | After RSVP toggle on archived guest, show unarchive prompt |
| `ArchivedGuestSheet.jsx` | New component — bottom sheet listing archived guests with unarchive controls |
| `useBulkSelect.js` | No change — archive bulk action is handled directly in `GuestList` (archive doesn't fit the RSVP field-toggle pattern used by `applyBulkAction`) |

---

## Testing

- Unit: `GuestList` filters out archived guests; headcount excludes them.
- Unit: Bulk archive action writes correct fields.
- Unit: RSVP toggle on archived guest triggers unarchive prompt logic.
- Integration: Long-press → archive → guest disappears from main list → appears in archived sheet → unarchive → guest reappears.
