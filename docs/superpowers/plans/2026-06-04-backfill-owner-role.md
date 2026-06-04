# Backfill `ownerRole` on Legacy Guests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Patch every Firestore guest document that lacks `ownerRole` with the correct `"hansen"` or `"lavita"` value, eliminating the legacy fallback indefinitely.

**Architecture:** A standalone Node.js CommonJS script in `scripts/` queries the `users` collection to build a uid→role map, finds all guests missing `ownerRole`, and batch-writes the correct value. A shared `scripts/firebase-admin.js` initialises the Admin SDK for reuse by future scripts. Warnings from the run are saved to `scripts/backfill-warnings.md`.

**Tech Stack:** Node.js (CommonJS), `firebase-admin` npm package, Firestore Admin SDK, service account JSON key.

---

### Task 1: Install `firebase-admin` and create the scripts folder

**Files:**
- Modify: `package.json`
- Create: `scripts/` (directory)

- [ ] **Step 1: Install firebase-admin as a dev dependency**

```bash
npm install --save-dev firebase-admin
```

Expected: `firebase-admin` appears in `devDependencies` in `package.json`.

- [ ] **Step 2: Create the scripts directory**

```bash
mkdir scripts
```

- [ ] **Step 3: Add a package.json inside scripts/ to opt out of ESM**

The root `package.json` has `"type": "module"`, which breaks `require()`. Scripts need CommonJS. Create `scripts/package.json`:

```json
{
  "type": "commonjs"
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json scripts/package.json
git commit -m "chore: install firebase-admin, create scripts dir with CJS override"
```

---

### Task 2: Create the Firebase Admin SDK initialiser

**Files:**
- Create: `scripts/firebase-admin.js`

- [ ] **Step 1: Create `scripts/firebase-admin.js`**

```js
/**
 * Firebase Admin SDK initialiser for migration scripts.
 *
 * Usage:
 *   const { db } = require('./firebase-admin')
 *
 * Auth: set GOOGLE_APPLICATION_CREDENTIALS env var to your service account
 * JSON key path before running any script, e.g.:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/serviceAccount.json node scripts/foo.js
 *
 * Service account keys are never committed to the repo.
 */
const admin = require('firebase-admin')

// initializeApp reads credentials from GOOGLE_APPLICATION_CREDENTIALS
// automatically when no explicit credential is passed.
if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

module.exports = { admin, db }
```

- [ ] **Step 2: Commit**

```bash
git add scripts/firebase-admin.js
git commit -m "chore: add Firebase Admin SDK initialiser for scripts"
```

---

### Task 3: Write the backfill script

**Files:**
- Create: `scripts/backfill-owner-role.js`

- [ ] **Step 1: Create `scripts/backfill-owner-role.js`**

```js
/**
 * One-time migration: backfill `ownerRole` onto legacy guest documents.
 *
 * Background
 * ----------
 * Before May 18 2026, AddGuest.jsx only wrote `ownerId` (Firebase UID) to
 * each guest document. On May 18 it was updated to also write `ownerRole`
 * ('hansen' or 'lavita'). Guests created before that date have `ownerId`
 * but no `ownerRole`.
 *
 * The app handles missing `ownerRole` with a runtime fallback in GuestList,
 * GuestEditSheet, and CombinedList (using ?? to infer from ownerId). This
 * script patches those legacy records so the fallback becomes dead code.
 *
 * How it works
 * ------------
 * 1. Load all `users` docs → build a uid → ownerRole map.
 * 2. Query all guests where ownerRole is not set.
 * 3. For each legacy guest, look up ownerRole from the users map via ownerId.
 * 4. Batch-write { ownerRole } onto each doc (Firestore max 500 per batch).
 * 5. Log results and save any warnings to scripts/backfill-warnings.md.
 *
 * Usage
 * -----
 *   # Dry run — logs what would change, writes nothing:
 *   node scripts/backfill-owner-role.js --dry-run
 *
 *   # Live run:
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccount.json \
 *     node scripts/backfill-owner-role.js
 */

const { db } = require('./firebase-admin')
const fs = require('fs')
const path = require('path')

const DRY_RUN = process.argv.includes('--dry-run')
const BATCH_SIZE = 500 // Firestore hard limit per batch commit

/**
 * Maps any role value (including contributor roles) to the owning side.
 * Mirrors the getOwnerRole() function in src/lib/guestUtils.js.
 *
 * @param {string} role - Role string from the users collection
 * @returns {'hansen' | 'lavita' | null}
 */
function getOwnerRole(role) {
  if (role === 'hansen' || role === 'hContributor') return 'hansen'
  if (role === 'lavita' || role === 'lContributor') return 'lavita'
  return null
}

async function main() {
  console.log(DRY_RUN ? '[DRY RUN] No writes will be made.\n' : '[LIVE RUN] Writing to Firestore.\n')

  // --- Step 1: Build uid → ownerRole map from users collection ---
  console.log('Loading users collection...')
  const usersSnap = await db.collection('users').get()
  // Map of Firebase UID → normalized ownerRole ('hansen' or 'lavita')
  const uidToOwnerRole = {}
  usersSnap.forEach(doc => {
    const role = doc.data().role
    const ownerRole = getOwnerRole(role)
    if (ownerRole) {
      uidToOwnerRole[doc.id] = ownerRole
    } else {
      console.warn(`[WARN] users/${doc.id} has unrecognised role "${role}" — will be skipped if they own guests`)
    }
  })
  console.log(`  ${Object.keys(uidToOwnerRole).length} users loaded.\n`)

  // --- Step 2: Find all guests missing ownerRole ---
  // Firestore treats a missing field and a null field differently.
  // We check for both: documents where the field doesn't exist are returned
  // by the == null filter in the Admin SDK.
  console.log('Querying guests without ownerRole...')
  const guestsSnap = await db.collection('guests')
    .where('ownerRole', '==', null)
    .get()
  console.log(`  ${guestsSnap.size} legacy guest(s) found.\n`)

  if (guestsSnap.size === 0) {
    console.log('Nothing to do. All guests already have ownerRole.')
    process.exit(0)
  }

  // --- Step 3: Resolve ownerRole for each legacy guest ---
  const toUpdate = []   // { ref, ownerRole } for guests we can fix
  const warnings = []   // human-readable lines for the warnings file

  guestsSnap.forEach(doc => {
    const { name, ownerId } = doc.data()
    const ownerRole = uidToOwnerRole[ownerId]

    if (!ownerRole) {
      // ownerId not found in users collection — cannot safely assign a side
      const msg = `guest/${doc.id} (name: "${name}") — ownerId "${ownerId}" not found in users collection`
      console.warn(`[WARN] ${msg}`)
      warnings.push(msg)
    } else {
      toUpdate.push({ ref: doc.ref, ownerRole, name })
    }
  })

  console.log(`  ${toUpdate.length} guest(s) will be updated.`)
  console.log(`  ${warnings.length} guest(s) skipped (see warnings).\n`)

  // --- Step 4: Batch-write in chunks of BATCH_SIZE ---
  if (!DRY_RUN) {
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const chunk = toUpdate.slice(i, i + BATCH_SIZE)
      const batch = db.batch()
      chunk.forEach(({ ref, ownerRole }) => {
        // Only set the missing field — do not overwrite any other guest data
        batch.update(ref, { ownerRole })
      })
      await batch.commit()
      console.log(`  Committed batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} docs)`)
    }
    console.log('\nAll batches committed successfully.')
  } else {
    toUpdate.forEach(({ name, ownerRole }) => {
      console.log(`  [DRY RUN] Would set ownerRole="${ownerRole}" on guest "${name}"`)
    })
  }

  // --- Step 5: Save warnings to file ---
  const warningsPath = path.join(__dirname, 'backfill-warnings.md')
  if (warnings.length > 0) {
    const lines = [
      '# Backfill `ownerRole` — Warnings',
      '',
      `Run date: ${new Date().toISOString()}`,
      `Dry run: ${DRY_RUN}`,
      '',
      'The following guests could not be patched because their `ownerId` was',
      'not found in the `users` collection. Manual review required.',
      '',
      ...warnings.map(w => `- ${w}`),
      '',
    ]
    fs.writeFileSync(warningsPath, lines.join('\n'), 'utf8')
    console.log(`\n[WARN] ${warnings.length} warning(s) written to scripts/backfill-warnings.md`)
  } else {
    // Write a clean run note so there's always a record
    const lines = [
      '# Backfill `ownerRole` — Warnings',
      '',
      `Run date: ${new Date().toISOString()}`,
      `Dry run: ${DRY_RUN}`,
      '',
      'No warnings. All legacy guests were patched successfully.',
      '',
    ]
    fs.writeFileSync(warningsPath, lines.join('\n'), 'utf8')
    console.log('\nNo warnings. Clean run record written to scripts/backfill-warnings.md')
  }

  // Summary
  console.log('\n--- Summary ---')
  console.log(`  Found   : ${guestsSnap.size}`)
  console.log(`  Updated : ${DRY_RUN ? 0 : toUpdate.length} (dry run: ${DRY_RUN})`)
  console.log(`  Skipped : ${warnings.length}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Commit**

```bash
git add scripts/backfill-owner-role.js
git commit -m "chore: add backfill-owner-role migration script"
```

---

### Task 4: Dry run and verify

**Files:**
- Read: Firestore console (verification only)

- [ ] **Step 1: Ensure GOOGLE_APPLICATION_CREDENTIALS is set**

Get a service account key from Firebase Console → Project Settings → Service accounts → Generate new private key. Save it somewhere outside the repo (e.g. `~/serviceAccount.json`).

```bash
export GOOGLE_APPLICATION_CREDENTIALS=~/serviceAccount.json
```

- [ ] **Step 2: Run the dry run**

```bash
node scripts/backfill-owner-role.js --dry-run
```

Expected output (example):
```
[DRY RUN] No writes will be made.

Loading users collection...
  2 users loaded.

Querying guests without ownerRole...
  14 legacy guest(s) found.

  14 guest(s) will be updated.
  0 guest(s) skipped (see warnings).

  [DRY RUN] Would set ownerRole="hansen" on guest "Grandma Smith"
  [DRY RUN] Would set ownerRole="lavita" on guest "Uncle Joe"
  ...

No warnings. Clean run record written to scripts/backfill-warnings.md

--- Summary ---
  Found   : 14
  Updated : 0 (dry run: true)
  Skipped : 0
```

If you see `[WARN]` lines, note the guest names — those will need manual Firestore fixes. Zero warnings is the goal.

- [ ] **Step 3: Verify `scripts/backfill-warnings.md` was created**

```bash
cat scripts/backfill-warnings.md
```

Expected: file exists, shows dry-run date, "No warnings" or list of skipped guests.

---

### Task 5: Live run and post-run verification

- [ ] **Step 1: Run live**

```bash
GOOGLE_APPLICATION_CREDENTIALS=~/serviceAccount.json node scripts/backfill-owner-role.js
```

Expected output ends with:
```
All batches committed successfully.
No warnings. Clean run record written to scripts/backfill-warnings.md

--- Summary ---
  Found   : 14
  Updated : 14 (dry run: false)
  Skipped : 0
```

- [ ] **Step 2: Spot-check in Firestore console**

Open Firebase Console → Firestore → `guests` collection. Pick 2–3 guests that were created before May 18 2026 and confirm they now have `ownerRole: "hansen"` or `ownerRole: "lavita"` set correctly.

- [ ] **Step 3: Verify no guests remain without ownerRole**

Run dry-run again — it should now report `0 legacy guest(s) found`:

```bash
node scripts/backfill-owner-role.js --dry-run
```

Expected:
```
  0 legacy guest(s) found.

Nothing to do. All guests already have ownerRole.
```

- [ ] **Step 4: Commit the warnings file**

```bash
git add scripts/backfill-warnings.md
git commit -m "chore: add backfill-owner-role run record (no warnings)"
```

---

### Task 6: Add `scripts/backfill-warnings.md` reminder to CLAUDE.md

Now that the migration is done and the record is committed, note it for future context.

- [ ] **Step 1: Open CLAUDE.md and add a note under the Data Model section**

In `/Users/i354601/Documents/git/weddingApp/CLAUDE.md`, find the `### Data Model` section and append after the `guests` bullet:

```markdown
> **Migration note:** `ownerRole` was backfilled onto all legacy guests on 2026-06-04 via `scripts/backfill-owner-role.js`. The `??`-based fallback logic in GuestList/GuestEditSheet/CombinedList is now dead code and can be removed.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: note ownerRole backfill completed in CLAUDE.md"
```
