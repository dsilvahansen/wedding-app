/**
 * Lightweight Firestore REST client for migration scripts.
 * Uses Node's built-in https module — no firebase-admin package needed.
 *
 * Auth: reads a service account JSON key to mint a Google OAuth token.
 * Set GOOGLE_APPLICATION_CREDENTIALS to the path of your service account key:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/serviceAccount.json node scripts/foo.js
 *
 * Service account keys are never committed to the repo.
 *
 * Exports:
 *   getToken()                         → OAuth access token string
 *   firestoreGet(path)                 → fetch a document or collection
 *   firestoreQuery(collectionPath, filters) → structured query
 *   firestorePatch(docPath, fields)    → update specific fields on a doc
 */

const https = require('https')
const fs = require('fs')
const crypto = require('crypto')

// --- Load service account ---
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!keyPath) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS env var is not set.')
  process.exit(1)
}
const serviceAccount = JSON.parse(fs.readFileSync(keyPath.replace(/^~/, process.env.HOME), 'utf8'))
const PROJECT_ID = serviceAccount.project_id

// --- JWT / token helpers ---

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Mint a short-lived Google OAuth2 access token using the service account key.
 * Tokens are valid for 1 hour; this mints a fresh one each call (fine for scripts).
 */
async function getToken() {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const claim = base64url(Buffer.from(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })))
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(`${header}.${claim}`)
  const sig = base64url(sign.sign(serviceAccount.private_key))
  const jwt = `${header}.${claim}.${sig}`

  const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  const data = await request('POST', 'oauth2.googleapis.com', '/token', body, {
    'Content-Type': 'application/x-www-form-urlencoded',
  })
  return JSON.parse(data).access_token
}

// --- HTTP helper ---

function request(method, host, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const bodyBuf = body ? Buffer.from(body) : null
    const req = https.request({
      method, host, path,
      headers: {
        'Content-Length': bodyBuf ? bodyBuf.length : 0,
        ...extraHeaders,
      },
    }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks).toString()))
    })
    req.on('error', reject)
    if (bodyBuf) req.write(bodyBuf)
    req.end()
  })
}

const BASE = `/v1/projects/${PROJECT_ID}/databases/(default)/documents`

/**
 * GET a Firestore collection (all docs, no filtering).
 * Returns array of { id, fields } objects.
 */
async function firestoreGetCollection(collectionPath, token) {
  const docs = []
  let pageToken = null
  do {
    const qs = pageToken ? `?pageToken=${pageToken}` : ''
    const raw = await request('GET', 'firestore.googleapis.com', `${BASE}/${collectionPath}${qs}`, null, {
      Authorization: `Bearer ${token}`,
    })
    const parsed = JSON.parse(raw)
    for (const doc of (parsed.documents || [])) {
      const id = doc.name.split('/').pop()
      docs.push({ id, fields: doc.fields || {}, name: doc.name })
    }
    pageToken = parsed.nextPageToken
  } while (pageToken)
  return docs
}

/**
 * Run a Firestore structured query to find docs where a field == null (missing).
 * Returns array of { id, fields, name } objects.
 */
async function firestoreQueryMissingField(collectionPath, fieldName, token) {
  const body = JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: collectionPath }],
      where: {
        fieldFilter: {
          field: { fieldPath: fieldName },
          op: 'EQUAL',
          value: { nullValue: 'NULL_VALUE' },
        },
      },
    },
  })
  const raw = await request(
    'POST',
    'firestore.googleapis.com',
    `/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    body,
    { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  )
  const results = JSON.parse(raw)
  return results
    .filter(r => r.document)
    .map(r => ({
      id: r.document.name.split('/').pop(),
      fields: r.document.fields || {},
      name: r.document.name,
    }))
}

/**
 * PATCH a single Firestore document, updating only the specified field.
 * Uses updateMask so no other fields are touched.
 */
async function firestorePatch(docName, fieldName, stringValue, token) {
  const body = JSON.stringify({
    fields: { [fieldName]: { stringValue } },
  })
  const path = `/v1/${docName}?updateMask.fieldPaths=${fieldName}`
  await request('PATCH', 'firestore.googleapis.com', path, body, {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  })
}

module.exports = { getToken, firestoreGetCollection, firestoreQueryMissingField, firestorePatch, PROJECT_ID }
