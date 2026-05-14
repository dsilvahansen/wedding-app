# Wedding Planner App — Design Spec
**Date:** 2026-05-14
**Status:** Approved

---

## Overview

A mobile-first web app for managing wedding planning. Guest Manager is the first module. The app shell is designed to accommodate future modules (budget, vendors, timeline, etc.) without structural changes.

Accessible via Firebase Hosting (public URL) on any phone or desktop browser. No native app install required.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React (Vite) | Fast, component-based, good PWA support |
| Database | Firebase Firestore | Real-time sync, free tier, no server needed |
| Auth | Firebase Auth | Named accounts (Hansen / Lavita) |
| Hosting | Firebase Hosting | Free, instant public URL, HTTPS |
| PWA | Vite PWA plugin | Installable on phone, works offline for reads |

---

## Authentication

- Two named roles: **Hansen (H)** and **Lavita (L)**
- Login via Firebase Auth (email/password)
- Role is stored on the user profile in Firestore
- The active user's name (Hansen/Lavita) is shown in the top bar
- No role-based access restrictions — both can read and write everything (trust-based)

---

## App Shell

### Structure

```
App
├── Top bar (app name + user indicator)
├── Home screen (module grid)
│   ├── Guest List module (active)
│   ├── Budget (coming soon tile)
│   ├── Vendors (coming soon tile)
│   └── Timeline (coming soon tile)
└── Bottom nav
    ├── 🏠 Home
    ├── 👥 Guests (shortcut to Guest List module)
    ├── 🔔 Updates (future)
    └── ⚙️ Settings
```

### Home Screen

- 2×2 grid of module tiles
- Active modules are filled (purple); coming-soon modules are grey with dashed border and "coming soon" label
- Tapping a module navigates into it
- Future modules are added here as they are built — no nav restructuring needed

---

## Guest List Module

Accessed via the Home screen tile or the Guests shortcut in the bottom nav. Contains 5 sub-tabs:

```
Guest List Module
├── ➕ Add
├── 👥 My List
├── 👁️ Their List (read-only)
├── 🔗 Combined
└── 🏷️ Tags
```

---

### Data Model (Firestore)

#### `/users/{userId}`
```
{
  role: "hansen" | "lavita",
  email: string,
  displayName: string   // "Hansen" or "Lavita"
}
```

#### `/tags/{tagId}`
```
{
  name: string,
  createdBy: userId,
  createdByInitial: "H" | "L",  // shown as attribution label on tag pills
  weights: {
    [userId]: number   // per-user weight for this tag
  },
  color: string        // hex color for tag pill
}
```

Tags are shared globally (visible to both users), but each user sets their own weight for each tag. Each tag pill displays a small superscript initial (H or L) indicating who created it.

#### `/guests/{guestId}`
```
{
  name: string,
  ownerId: userId,           // who added this guest
  tags: [tagId],
  weight: number,            // effective weight (auto or manual override)
  weightOverride: boolean,   // true if user manually set weight
  linkedGuestId: string | null,  // points to another guestId if manually linked as same person
  rsvp: {
    hansen: {
      saveTheDateSent: boolean,
      inviteSent: boolean
    },
    lavita: {
      saveTheDateSent: boolean,
      inviteSent: boolean
    },
    confirmed: boolean   // shared — either user can mark, visible to both
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

### ➕ Add Tab

**Flow:** Type name → see suggestions → pick tags → weight auto-fills → save

#### Name Field
- Free-text input, auto-focus on tab open
- As user types, a dropdown appears showing existing guests (from both lists) with matching names
- Each suggestion shows: guest name, tags, which list (Hansen/Lavita label)
- Duplicate detection: exact name match (case-insensitive) triggers a yellow inline warning: *"[Name] exists in [Lavita's/Hansen's] list ([Tag]) — Link as same person?"*
- User can dismiss the warning and add as a separate entry (duplicates are allowed)
- User can tap "Link" to associate the new entry with the existing one (`linkedGuestId`)

#### Tags
- All tags displayed as tappable pills below the name field, each with a small superscript initial (H or L) showing who created it
- Selected tags are highlighted (purple fill); unselected are light purple outline
- "+ new tag" pill opens an inline input to create a tag on the fly (name only; weight defaults to 5, editable later in Tags tab)

#### Weight
- Displays the effective weight: max of all selected tags' weights for the current user; defaults to 5 if no tags are selected
- Shows label "auto from tags" in grey
- Tapping the weight value makes it editable (overrides auto-calculation); sets `weightOverride: true`
- If tags change after a manual override, the override is preserved unless user clears it

#### Save
- Primary button: **"Save + Add Next"** — saves guest and clears form, keeping tags pre-selected for next entry
- After save, a subtle toast confirms: *"[Name] added"*

---

### 👥 My List Tab

Shows only the current user's guests.

#### Filter Bar
- Tag filter pills at the top (All + one per tag). Active filter highlighted.
- Sort dropdown: Weight (default, descending), Name (A–Z)

#### Guest Row (compact)
```
[Name]                    [weight]  [📅][✉️][✅]
[tag pill] [tag pill]
```
- Tags shown as small colored pills with H/L superscript
- Weight shown as a number in purple
- 3 RSVP icons: 📅 (save the date), ✉️ (invite), ✅ (confirmed)
  - 📅 and ✉️: **Lit** = done by current user; **Faded** = not done; H/L subscripts show both users' states
  - ✅: single shared state — lit if confirmed, faded if not; no H/L distinction
- Tap a row to open an edit sheet (same fields as Add, plus delete option)
- Tap an RSVP icon to toggle it for the current user only

#### Guest Count
- Header shows "My List (N)" where N is total count

---

### 👁️ Their List Tab

Read-only view of the other user's guest list.

- Identical layout to My List (compact rows, tag pills, weight, RSVP icons)
- No tap-to-edit — rows are non-interactive
- RSVP icons shown as-is (both H and L states visible, same as Combined)
- Header shows "[Partner name]'s List (N)" — e.g. "Lavita's List (31)" when Hansen is logged in
- Filter and sort controls are available (tag filter, sort by weight/name)
- No Add button visible while on this tab

---

### 🔗 Combined Tab

Merges both users' guest lists into one view.

#### Summary Bar
- "N total" (unique count — shared guests counted once)
- "N shared ★" badge showing how many guests appear in both lists

#### Filter Bar
- Pills: All | Hansen | Lavita | Shared ★
- Sort: Weight (default), Name

#### Guest Row
- Same compact row format as My List
- **Shared guests** (exact name match or manually linked): gold `★` badge, orange border, tags from both sides shown as "(H)" and "(L)" suffixed pills
- **Hansen-only guests**: purple "H" badge
- **Lavita-only guests**: pink "L" badge
- Weight shown is the higher of the two users' weights for shared guests
- RSVP icons reflect both users' states (Hansen's and Lavita's independently)

#### Invite Limit
- A "Set limit" control at the top of the combined list
- User enters a number (e.g. 150)
- Guests sorted by weight; those that exceed the limit are visually dimmed with a strikethrough
- This is a display-only helper — does not delete or lock any guest

---

### 🏷️ Tags Tab

Manage tags and per-user weights. Tags are global (shared between Hansen and Lavita), but each user's weight for each tag is independent.

#### Tag List
- Each tag shown with: colored pill + superscript H/L attribution, guest count, **current user's** weight value
- Tap a tag to edit: rename, change **your** weight, change color
- Swipe or long-press to delete (with confirmation; guests using this tag are unaffected — tag is removed from their tag list)
- "+ New Tag" button at top right

#### Tag Creation / Edit Sheet
- Fields: Name, Weight (1–10 slider), Color picker (preset palette)
- Tags are global (visible to both users) but weights are per-user

---

## Duplicate Handling

| Scenario | Behavior |
|---|---|
| Same name, same list | Allowed — shown as separate entries |
| Same name, different lists | Auto-detected, yellow warning on Add, prompt to link |
| Different names, same person | Manual linking via edit sheet on either guest |
| Linked guests in Combined view | Shown as one row with ★ badge |
| Linked guests in My List / Their List | Shown normally (no change to individual list views) |

---

## RSVP Status Markers

Each guest has 2 per-user markers (save the date, invite) plus 1 shared marker (confirmed):

| Marker | Icon | Scope | Meaning |
|---|---|---|---|
| Save the date sent | 📅 | Per-user (H / L) | Hansen or Lavita has sent the save the date |
| Invite sent | ✉️ | Per-user (H / L) | Hansen or Lavita has sent the formal invite |
| Confirmed attendance | ✅ | Shared | Guest has confirmed — either user can mark, both see it |

- 📅 and ✉️: tapping toggles for the **current user only**; both H and L states shown with subscripts
- ✅: tapping toggles the single shared value — no H/L distinction
- In the edit sheet: 📅 and ✉️ shown as two rows (H and L checkboxes each); ✅ shown as a single checkbox

---

## Real-time Sync

- Firestore listeners on both `/guests` and `/tags` collections
- Changes made by one user appear instantly on the other's screen
- No manual refresh needed
- Offline: reads from Firestore cache; writes queued and synced when connection restores

---

## Routing

```
/                    → Home screen (module grid)
/guests              → Guest List module → Add tab (default)
/guests/list         → My List tab
/guests/their-list   → Their List tab (read-only)
/guests/combined     → Combined tab
/guests/tags         → Tags tab
/login               → Login screen
```

---

## Out of Scope (v1)

- Push notifications
- Export to CSV / PDF
- Guest plus-ones / table assignments
- Budget, Vendors, Timeline modules (shells present on Home, not built)
- Admin panel or third user roles
