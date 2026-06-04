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
