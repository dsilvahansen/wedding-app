# Spec: Backfill `ownerRole` onto Legacy Guest Records

**Date:** 2026-06-04
**Status:** Approved

## Background

On May 18, 2026, `AddGuest.jsx` was updated to write `ownerRole` (`"hansen"` or `"lavita"`) alongside the existing `ownerId` (Firebase UID) on every new guest document. Guests created before that date have `ownerId` but no `ownerRole`.

The app handles this via a `??` fallback in GuestList, GuestEditSheet, and CombinedList — inferring `ownerRole` at read time from `ownerId`. This works correctly but leaves technical debt: the fallback code will live forever unless old records are patched.

## Goal

Patch all legacy guest documents (those missing `ownerRole`) with the correct `"hansen"` or `"lavita"` value, so the fallback logic in the app becomes dead code that can be removed later.

## Approach

A one-time Node.js migration script (`scripts/backfill-owner-role.js`) run locally by the developer. No changes to app code.

## Logic

1. Load all documents from the `users` collection → build a `uid → role` map
2. Query all guests where `ownerRole` is absent (`== null` in Firestore)
3. For each legacy guest:
   - Look up `users[guest.ownerId].role`
   - Normalize via `getOwnerRole(role)` → `"hansen"` or `"lavita"`
   - If `ownerId` is missing from the users map, skip and log a warning
4. Batch-write updates (Firestore max 500 per batch)
5. Log total guests found, updated, and skipped

## `getOwnerRole` mapping

| Role stored in `users` | Normalized `ownerRole` |
|------------------------|------------------------|
| `"hansen"`             | `"hansen"`             |
| `"hContributor"`       | `"hansen"`             |
| `"lavita"`             | `"lavita"`             |
| `"lContributor"`       | `"lavita"`             |
| anything else          | skip + warn            |

## Files

| File | Action |
|------|--------|
| `scripts/backfill-owner-role.js` | Create — the migration script |
| `scripts/firebase-admin.js` | Create — Firebase Admin SDK initializer (shared util for future scripts) |

## Dependencies

- `firebase-admin` npm package (dev dependency)
- Service account key file — not committed to repo; path passed via `GOOGLE_APPLICATION_CREDENTIALS` env var or `--keyfile` flag

## Running the Script

```bash
# Dry run (logs what would change, writes nothing)
node scripts/backfill-owner-role.js --dry-run

# Live run
GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccount.json node scripts/backfill-owner-role.js
```

## Success Criteria

- Script exits 0
- All guests that previously lacked `ownerRole` now have it set to `"hansen"` or `"lavita"`
- No guests are modified incorrectly (verified by spot-check in Firestore console)
- Zero warnings about missing users

## Out of Scope

- Removing the fallback logic from the app (separate cleanup PR, after verification)
- Backfilling `createdByRole` (not used in any read path)
