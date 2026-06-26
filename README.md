# Wedding Planner

A mobile-first PWA for Hansen & Lavita to collaboratively manage their wedding guest list. Each partner maintains their own list, and both lists are visible through a combined deduplicated view.

**Live app:** https://wedding-planner-f723b.web.app

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18, Tailwind CSS (purple palette) |
| Build | Vite + vite-plugin-pwa (PWA/offline support) |
| Routing | React Router v6 |
| Backend | Firebase Auth + Firestore (real-time) |
| Testing | Vitest + Testing Library |

---

## Getting Started

### Prerequisites

- Node 18+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project with Auth (email/password) and Firestore enabled

### Setup

```bash
git clone <repo>
cd weddingApp
npm install
```

Create a `.env` file (or set these in your Firebase hosting environment):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Run

```bash
npm run dev          # Vite dev server at http://localhost:5173
npm run build        # Production build → dist/
npm run lint         # ESLint (zero-warning enforcement)
npx vitest run       # Run all tests once
```

---

## File Structure

```
src/
├── App.jsx                     # Root router + RequireAuth guard
├── firebase.js                 # Firebase SDK init (auth + db exports)
├── main.jsx                    # React entry point, AuthProvider wrapper
│
├── contexts/
│   └── AuthContext.jsx         # Exposes useAuth() via React context (useAuthContext hook)
│
├── hooks/
│   ├── useAuth.js              # Firebase auth state + role from Firestore users collection
│   ├── useGuests.js            # Real-time onSnapshot subscription to /guests
│   ├── useTags.js              # Real-time onSnapshot subscription to /tags
│   └── useBulkSelect.js        # Selection set + toggle-all bulk RSVP updates + undo
│
├── lib/
│   ├── guestUtils.js           # Pure utility functions for guest logic (calcWeight, sort, dedup, etc.)
│   ├── tagUtils.js             # Tag color list + utility helpers
│   └── excelUtils.js           # Excel import/export: parse, build, download workbooks (no Firebase)
│
├── pages/
│   ├── LoginPage.jsx           # Email/password login form
│   ├── HomePage.jsx            # Welcome screen with quick stats
│   └── GuestsPage.jsx          # Tabs: My List / Their List / Combined / Tags
│
└── components/
    ├── layout/
    │   ├── TopBar.jsx           # App header: title, settings gear (import/export), logout
    │   ├── BottomNav.jsx        # Fixed bottom navigation: Home / Guests / Updates / Settings
    │   └── ModuleLayout.jsx     # Horizontal tab strip for sub-navigation within a page
    │
    ├── ui/
    │   ├── GuestRow.jsx         # Single guest row with RSVP dots, tags, long-press support
    │   ├── FilterBar.jsx        # Tag filter pills + optional search input
    │   ├── BottomSheet.jsx      # Sliding bottom sheet modal (portal, body overflow lock)
    │   ├── Toast.jsx            # Timed notification bar with optional undo action
    │   ├── TagPill.jsx          # Coloured tag chip (click-to-toggle variant for edit forms)
    │   └── RsvpIcons.jsx        # Inline STD / Invite / Confirmed icon group
    │
    ├── guests/
    │   ├── GuestList.jsx        # My List / Their List tab: filter, sort, search, bulk select
    │   ├── AddGuest.jsx         # Add-guest form with duplicate detection and tag picker
    │   ├── GuestEditSheet.jsx   # Edit-guest bottom sheet: name, tags, group, RSVP, weight
    │   ├── CombinedList.jsx     # Deduplicated combined view with owner badges and invite limit
    │   ├── ArchivedGuestSheet.jsx # Archived guests viewer with bulk unarchive
    │   ├── TagsManager.jsx      # Create/reorder/edit tags with per-user weight sliders
    │   ├── TagEditSheet.jsx     # Edit a single tag's name, color, and weight
    │   └── GuestTagAssignSheet.jsx # Bulk tag assignment across selected guests
    │
    └── settings/
        ├── SettingsSheet.jsx    # Settings sheet: Export / Import Excel / Sample Template
        └── ImportSheet.jsx      # Import preview + Firestore batch commit

tests/                          # Mirrors src/ structure
├── lib/                        # Unit tests for pure utility functions
├── hooks/                      # Hook tests using renderHook + vi.mock
├── components/                 # Component tests using React Testing Library
│   ├── guests/
│   ├── settings/
│   └── ui/
└── pages/                      # Page-level component tests
```

---

## Architecture

```
Firebase Auth / Firestore
        │
   Custom Hooks (useAuth, useGuests, useTags, useBulkSelect)
        │  real-time snapshots, state management
        ▼
   Pages (GuestsPage, LoginPage, HomePage)
        │  compose components, pass data down
        ▼
   Feature Components (GuestList, GuestEditSheet, CombinedList, ...)
        │  UI logic, user interactions, Firestore writes
        ▼
   UI Primitives (GuestRow, FilterBar, BottomSheet, Toast, ...)
        │  pure presentation, no Firebase
        ▼
   lib/guestUtils.js, lib/tagUtils.js, lib/excelUtils.js
        purely functional, no React, fully testable
```

---

## Data Model

### `guests` collection

```js
{
  id: string,            // Firestore document ID
  name: string,
  ownerId: string,       // Firebase UID of the owner
  ownerRole: 'hansen' | 'lavita',
  createdByRole: 'hansen' | 'lavita' | 'hContributor' | 'lContributor',
  tags: string[],        // Array of tag document IDs
  weight: number,        // 1–10; computed from tags or manual override
  weightOverride: boolean,
  linkedGuestId: string | null, // ID of the same person in the partner's list
  isGroup: boolean,
  adultCount: number | null,
  kidCount: number | null,
  groupNotes: string,
  archived: boolean,
  rsvp: {
    hansen: { saveTheDateSent: boolean, inviteSent: boolean },
    lavita: { saveTheDateSent: boolean, inviteSent: boolean },
    confirmed: boolean,  // shared between both sides
  },
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

### `tags` collection

```js
{
  id: string,
  name: string,
  color: string,         // CSS hex color
  order: number,         // display order (integer, lowest first)
  weights: {             // per-user priority weight for this tag
    [userId: string]: number,  // 1–10
  },
}
```

### `users` collection

```js
{
  // Document ID = Firebase UID
  role: 'hansen' | 'lavita' | 'hContributor' | 'lContributor',
}
```

---

## Auth & Roles

| Role | Description |
|------|-------------|
| `hansen` | Hansen (owner) — full read/write |
| `lavita` | Lavita (owner) — full read/write |
| `hContributor` | Hansen's contributor — read-only; can view Hansen's list |
| `lContributor` | Lavita's contributor — read-only; can view Lavita's list |

**Key helpers in `guestUtils.js`:**

- `isContributor(role)` — returns true for `hContributor` / `lContributor`; gates all write actions
- `getOwnerRole(role)` — maps `'hContributor' → 'hansen'`, `'lContributor' → 'lavita'`, owners map to themselves; used to determine which RSVP slot a user writes to

---

## Key Flows

### Adding a Guest

1. User opens `AddGuest` (via the `+` FAB in `GuestList`)
2. As they type, `handleNameChange` runs `findDuplicates` against guests from the other user — if a match is found, a "Link" prompt appears
3. Tapping "Link" stores the partner guest's ID in `linkedGuestId`; this connection surfaces in the Combined view
4. On Save: `addDoc` writes to `/guests` with `ownerRole`, `ownerId`, `createdByRole`, `tags`, computed `weight`, and a full blank RSVP skeleton

### RSVP Update Flow

1. User taps a status dot in `GuestRow` → `onRsvpToggle(guestId, field)` fires
2. `GuestList.handleRsvpToggle` reads the current RSVP, toggles the specific field, and calls `updateDoc`
3. In `GuestEditSheet`, the same toggle uses **optimistic state**: `setRsvp(updated)` fires immediately, then `updateDoc` runs asynchronously; on error the previous state is restored

### Bulk Selection & Undo

1. User taps "Select" → `useBulkSelect.toggleSelectionMode()` activates selection mode
2. Individual guest taps call `toggleGuest(id)` to add/remove from the Set
3. User picks an action (STD / Invite / Confirmed / Archive) → a confirmation bar appears
4. On confirm: `applyBulkAction(field, guests)` uses **toggle-all semantics** — if all selected guests already have the field `true`, it sets all to `false`; otherwise all to `true`
5. Before writing, a **snapshot** of previous values is saved to `snapshotRef`
6. A 4-second undo window opens; `undoBulkAction` reads the snapshot and restores each guest's previous value via `updateDoc`

### Excel Export / Import

**Export:**
1. User opens Settings (⚙️) → clicks "Export Excel"
2. `buildWorkbook(guests, tags, userId)` builds a two-sheet XLSX in memory using SheetJS
3. `downloadWorkbook` triggers a browser download; no server involved

**Import:**
1. User picks a `.xlsx` file → `SettingsSheet` calls `onImportFile(file)`, closing itself and opening `ImportSheet`
2. `ImportSheet` parses the file on mount (`parseWorkbookFromFile`), then runs `sheetDataToTags` and `sheetDataToGuests` to produce `{ toCreate, toUpdate, errors }` previews
   - New tags get temporary `__new_<index>` IDs so guest rows can resolve tag names before Firestore IDs exist
3. User sees a preview (counts of creates / updates / errors) and confirms
4. `handleConfirm` runs a single Firestore `writeBatch`:
   - Create tags (capturing real Firestore IDs)
   - Update tags
   - Resolve `__new_` placeholders to real IDs
   - Batch-set new guests / batch-update existing guests
5. On success, `TopBar.handleImportSuccess` shows a Toast summary

---

## Testing

```bash
npx vitest run           # Run all tests once
npx vitest               # Watch mode
npx vitest run tests/lib/excelUtils.test.js   # Single file
```

**Structure:** tests mirror `src/` under `tests/`. Each test file mocks Firebase and hooks at the module boundary.

**Pattern:**
```js
vi.mock('../../src/hooks/useGuests.js', () => ({
  useGuests: () => ({ guests: [...] }),
}))
vi.mock('firebase/firestore', () => ({
  updateDoc: vi.fn().mockResolvedValue(undefined),
  ...
}))
```

**What's tested:**
- `lib/guestUtils.js` — weight calc, sort, dedup, duplicate detection (unit tests)
- `lib/excelUtils.js` — sheet data mapping, round-trip workbook parse (unit tests)
- `hooks/useAuth.js` — auth state, role loading, login/logout
- `hooks/useGuests.js` — Firestore snapshot population
- `hooks/useBulkSelect.js` — toggle-all, undo, selection mode
- Components — render, user interactions, Firestore write assertions

---

## Deployment

```bash
npm run build       # Build to dist/
firebase deploy     # Deploy to Firebase Hosting
```

Deploys to: **https://wedding-planner-f723b.web.app**

`firebase.json` rewrites all routes to `/index.html` for SPA support. The `dist/` folder is the hosting root.
