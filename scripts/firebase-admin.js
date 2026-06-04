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
