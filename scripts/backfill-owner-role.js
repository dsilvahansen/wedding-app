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
 * 4. PATCH each doc (only the ownerRole field — no other data touched).
 * 5. Log results and save any warnings to scripts/backfill-warnings.md.
 *
 * Uses the Firestore REST API directly (no firebase-admin package needed).
 *
 * Usage
 * -----
 *   # Dry run — logs what would change, writes nothing:
 *   GOOGLE_APPLICATION_CREDENTIALS=../FOLDER/serviceAccount.json \
 *     node scripts/backfill-owner-role.js --dry-run
 *
 *   # Live run:
 *   GOOGLE_APPLICATION_CREDENTIALS=../FOLDER/serviceAccount.json \
 *     node scripts/backfill-owner-role.js
 */

const { getToken, firestoreGetCollection, firestoreQueryMissingField, firestorePatch } = require('./firebase-admin')
const fs = require('fs')
const path = require('path')

const DRY_RUN = process.argv.includes('--dry-run')

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

/** Read a Firestore string field value safely */
function str(fields, key) {
  return fields[key]?.stringValue ?? null
}

async function main() {
  console.log(DRY_RUN ? '[DRY RUN] No writes will be made.\n' : '[LIVE RUN] Writing to Firestore.\n')

  const token = await getToken()

  // --- Step 1: Build uid → ownerRole map from users collection ---
  console.log('Loading users collection...')
  const userDocs = await firestoreGetCollection('users', token)

  // Map of Firebase UID → normalized ownerRole ('hansen' or 'lavita')
  const uidToOwnerRole = {}
  for (const doc of userDocs) {
    const role = str(doc.fields, 'role')
    const ownerRole = getOwnerRole(role)
    if (ownerRole) {
      uidToOwnerRole[doc.id] = ownerRole
    } else {
      console.warn(`[WARN] users/${doc.id} has unrecognised role "${role}" — will be skipped if they own guests`)
    }
  }
  console.log(`  ${Object.keys(uidToOwnerRole).length} users loaded.\n`)

  // --- Step 2: Find all guests missing ownerRole ---
  // The == null query matches both missing fields and explicitly null fields.
  console.log('Querying guests without ownerRole...')
  const legacyGuests = await firestoreQueryMissingField('guests', 'ownerRole', token)
  console.log(`  ${legacyGuests.length} legacy guest(s) found.\n`)

  if (legacyGuests.length === 0) {
    console.log('Nothing to do. All guests already have ownerRole.')
    writeWarningsFile([], false)
    process.exit(0)
  }

  // --- Step 3: Resolve ownerRole for each legacy guest ---
  const toUpdate = []  // { name: doc.name, guestName, ownerRole } for guests we can fix
  const warnings = []  // human-readable lines for the warnings file

  for (const doc of legacyGuests) {
    const guestName = str(doc.fields, 'name') ?? '(unnamed)'
    const ownerId = str(doc.fields, 'ownerId')
    const ownerRole = ownerId ? uidToOwnerRole[ownerId] : null

    if (!ownerRole) {
      // ownerId not found in users collection — cannot safely assign a side
      const msg = `guest/${doc.id} (name: "${guestName}") — ownerId "${ownerId}" not found in users collection`
      console.warn(`[WARN] ${msg}`)
      warnings.push(msg)
    } else {
      toUpdate.push({ name: doc.name, guestName, ownerRole })
    }
  }

  console.log(`  ${toUpdate.length} guest(s) will be updated.`)
  console.log(`  ${warnings.length} guest(s) skipped (see warnings).\n`)

  // --- Step 4: Patch each guest doc (only the ownerRole field) ---
  if (!DRY_RUN) {
    let count = 0
    for (const { name, guestName, ownerRole } of toUpdate) {
      // firestorePatch uses updateMask so only ownerRole is written
      await firestorePatch(name, 'ownerRole', ownerRole, token)
      count++
      if (count % 20 === 0) console.log(`  ...patched ${count}/${toUpdate.length}`)
    }
    console.log(`\nAll ${toUpdate.length} guest(s) patched successfully.`)
  } else {
    for (const { guestName, ownerRole } of toUpdate) {
      console.log(`  [DRY RUN] Would set ownerRole="${ownerRole}" on guest "${guestName}"`)
    }
  }

  // --- Step 5: Save warnings to file ---
  writeWarningsFile(warnings, DRY_RUN)

  // Summary
  console.log('\n--- Summary ---')
  console.log(`  Found   : ${legacyGuests.length}`)
  console.log(`  Updated : ${DRY_RUN ? 0 : toUpdate.length} (dry run: ${DRY_RUN})`)
  console.log(`  Skipped : ${warnings.length}`)
}

function writeWarningsFile(warnings, dryRun) {
  const warningsPath = path.join(__dirname, 'backfill-warnings.md')
  const lines = [
    '# Backfill `ownerRole` — Run Record',
    '',
    `Run date: ${new Date().toISOString()}`,
    `Dry run: ${dryRun}`,
    '',
  ]

  if (warnings.length > 0) {
    lines.push(
      'The following guests could not be patched because their `ownerId` was',
      'not found in the `users` collection. Manual review required.',
      '',
      ...warnings.map(w => `- ${w}`),
      '',
    )
    console.log(`\n[WARN] ${warnings.length} warning(s) written to scripts/backfill-warnings.md`)
  } else {
    lines.push('No warnings. All legacy guests were patched successfully.', '')
    console.log('\nNo warnings. Clean run record written to scripts/backfill-warnings.md')
  }

  fs.writeFileSync(warningsPath, lines.join('\n'), 'utf8')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
