/**
 * Pure utility functions for Excel import/export of guests and tags.
 * No React, no Firebase — all side-effect-free so they can be unit tested easily.
 *
 * Export flow:  buildWorkbook(guests, tags, userId) → downloadWorkbook(wb, filename)
 * Import flow:  parseWorkbookFromFile(file) → sheetDataToGuests / sheetDataToTags → Firestore writes
 * Sample flow:  buildSampleWorkbook() → downloadWorkbook(wb, 'wedding-guests-sample.xlsx')
 */

import * as XLSX from 'xlsx'
import { TAG_COLORS } from './tagUtils.js'
import { calcWeight } from './guestUtils.js'

// Column headers — order defines the Excel column order
const GUEST_HEADERS = [
  'Name', 'Owner', 'Tags', 'Group', 'Adults', 'Kids', 'Group Notes', 'Weight',
  'STD Sent (Hansen)', 'Invite Sent (Hansen)',
  'STD Sent (Lavita)', 'Invite Sent (Lavita)',
  'Confirmed', 'Archived',
]

const TAG_HEADERS = ['Name', 'Color', 'Weight']

// --- Helpers ---

function yesNo(val) {
  return val ? 'yes' : 'no'
}

/** Parse "yes"/"no"/blank → boolean. Returns [value, wasUnexpected] */
function parseYesNo(val) {
  const s = String(val ?? '').trim().toLowerCase()
  if (s === 'yes') return [true, false]
  if (s === 'no' || s === '') return [false, false]
  return [false, true] // unexpected value — coerce to false
}

function isValidHex(str) {
  return /^#[0-9a-fA-F]{6}$/.test(String(str ?? '').trim())
}

function isValidWeight(val) {
  const n = Number(val)
  return Number.isFinite(n) && n >= 1 && n <= 10
}

// --- Export: guests → sheet rows ---

/**
 * Convert guest documents to plain row objects for the Guests sheet.
 * @param {Array} guests - Guest documents from Firestore
 * @param {Array} tags - Tag documents from Firestore
 * @returns {Array} Row objects keyed by GUEST_HEADERS
 */
export function guestsToSheetData(guests, tags) {
  const tagMap = new Map(tags.map(t => [t.id, t.name]))

  return guests.map(g => {
    const tagNames = (g.tags ?? [])
      .map(id => tagMap.get(id))
      .filter(Boolean)
      .join(', ')

    return {
      'Name': g.name,
      'Owner': g.ownerRole,
      'Tags': tagNames,
      'Group': yesNo(g.isGroup),
      'Adults': g.isGroup ? (g.adultCount ?? '') : '',
      'Kids': g.isGroup ? (g.kidCount ?? '') : '',
      'Group Notes': g.groupNotes || '',
      'Weight': g.weight ?? 5,
      'STD Sent (Hansen)': yesNo(g.rsvp?.hansen?.saveTheDateSent),
      'Invite Sent (Hansen)': yesNo(g.rsvp?.hansen?.inviteSent),
      'STD Sent (Lavita)': yesNo(g.rsvp?.lavita?.saveTheDateSent),
      'Invite Sent (Lavita)': yesNo(g.rsvp?.lavita?.inviteSent),
      'Confirmed': yesNo(g.rsvp?.confirmed),
      'Archived': yesNo(g.archived),
    }
  })
}

// --- Export: tags → sheet rows ---

/**
 * Convert tag documents to plain row objects for the Tags sheet.
 * Weight shown is the current user's weight for each tag.
 * @param {Array} tags - Tag documents from Firestore
 * @param {string} userId - The logged-in user's Firebase UID
 * @returns {Array} Row objects keyed by TAG_HEADERS
 */
export function tagsToSheetData(tags, userId) {
  return tags.map(t => ({
    'Name': t.name,
    'Color': t.color || TAG_COLORS[0],
    'Weight': (t.weights && t.weights[userId]) ?? 5,
  }))
}

// --- Import: sheet rows → tag operations ---

/**
 * Parse Tags sheet rows into create/update operations.
 * @param {Array} rows - Raw row objects from the Tags sheet
 * @param {Array} existingTags - Current tag documents from Firestore
 * @param {string} userId - The logged-in user's Firebase UID
 * @returns {{ toCreate, toUpdate, errors }}
 */
export function sheetDataToTags(rows, existingTags, userId) {
  const existingByName = new Map(existingTags.map(t => [t.name.trim().toLowerCase(), t]))
  const maxOrder = existingTags.reduce((m, t) => Math.max(m, t.order ?? 0), 0)

  const toCreate = []
  const toUpdate = []
  const errors = []

  rows.forEach((row, i) => {
    const rowNum = i + 1
    const name = String(row['Name'] ?? '').trim()

    if (!name) {
      errors.push(`Row ${rowNum}: missing name`)
      return
    }

    const colorRaw = String(row['Color'] ?? '').trim()
    const weightRaw = row['Weight']
    const color = isValidHex(colorRaw) ? colorRaw : undefined
    const weightUpdate = isValidWeight(weightRaw)
      ? { uid: userId, value: Number(weightRaw) }
      : undefined

    const existing = existingByName.get(name.toLowerCase())
    if (existing) {
      toUpdate.push({
        id: existing.id,
        name,
        ...(color !== undefined && { color }),
        ...(weightUpdate !== undefined && { weightUpdate }),
      })
    } else {
      toCreate.push({
        name,
        color: color ?? TAG_COLORS[0],
        weights: weightUpdate ? { [userId]: weightUpdate.value } : {},
        order: maxOrder + toCreate.length + 1,
      })
    }
  })

  return { toCreate, toUpdate, errors }
}

// --- Import: sheet rows → guest operations ---

/**
 * Parse Guests sheet rows into add/update operations.
 * Tag names are resolved to IDs using existingTags (which should already include
 * any newly created tags from the Tags sheet before calling this).
 * @param {Array} rows - Raw row objects from the Guests sheet
 * @param {Array} existingGuests - Current guest documents from Firestore
 * @param {Array} existingTags - Current (+ newly created) tag documents
 * @returns {{ toAdd, toUpdate, errors, warnings }}
 */
export function sheetDataToGuests(rows, existingGuests, existingTags) {
  const existingByName = new Map(existingGuests.map(g => [g.name.trim().toLowerCase(), g]))
  const tagByName = new Map(existingTags.map(t => [t.name.trim().toLowerCase(), t]))

  const toAdd = []
  const toUpdate = []
  const errors = []
  const warnings = []

  rows.forEach((row, i) => {
    const rowNum = i + 1
    const name = String(row['Name'] ?? '').trim()

    if (!name) {
      errors.push(`Row ${rowNum}: missing name`)
      return
    }

    const ownerRaw = String(row['Owner'] ?? '').trim().toLowerCase()
    if (ownerRaw && ownerRaw !== 'hansen' && ownerRaw !== 'lavita') {
      errors.push(`Row ${rowNum}: invalid owner "${row['Owner']}" — must be "hansen" or "lavita"`)
      return
    }

    // Parse booleans, collecting warnings for unexpected values
    function parseBool(key) {
      const [val, unexpected] = parseYesNo(row[key])
      if (unexpected) warnings.push(`Row ${rowNum}: unexpected value "${row[key]}" for "${key}" — treated as "no"`)
      return val
    }

    const [isGroup, isGroupUnexpected] = parseYesNo(row['Group'])
    if (isGroupUnexpected) warnings.push(`Row ${rowNum}: unexpected value "${row['Group']}" for "Group" — treated as "no"`)

    // Resolve tag names → IDs
    const tagNames = String(row['Tags'] ?? '').split(',').map(s => s.trim()).filter(Boolean)
    const tags = tagNames.map(n => tagByName.get(n.toLowerCase())).filter(Boolean).map(t => t.id)

    const rsvp = {
      hansen: {
        saveTheDateSent: parseBool('STD Sent (Hansen)'),
        inviteSent: parseBool('Invite Sent (Hansen)'),
      },
      lavita: {
        saveTheDateSent: parseBool('STD Sent (Lavita)'),
        inviteSent: parseBool('Invite Sent (Lavita)'),
      },
      confirmed: parseBool('Confirmed'),
    }

    const existing = existingByName.get(name.toLowerCase())
    if (existing) {
      // Update: preserve ownerRole, ownerId, linkedGuestId, weightOverride, createdAt
      toUpdate.push({
        id: existing.id,
        ownerId: existing.ownerId,
        ownerRole: existing.ownerRole,
        linkedGuestId: existing.linkedGuestId,
        weightOverride: existing.weightOverride,
        name,
        tags,
        isGroup,
        adultCount: isGroup ? (Number(row['Adults']) || 0) : null,
        kidCount: isGroup ? (Number(row['Kids']) || 0) : null,
        groupNotes: String(row['Group Notes'] ?? '').trim(),
        rsvp,
        archived: parseBool('Archived'),
      })
    } else {
      toAdd.push({
        name,
        ownerRole: ownerRaw || 'hansen',
        tags,
        isGroup,
        adultCount: isGroup ? (Number(row['Adults']) || 0) : null,
        kidCount: isGroup ? (Number(row['Kids']) || 0) : null,
        groupNotes: String(row['Group Notes'] ?? '').trim(),
        rsvp,
        archived: parseBool('Archived'),
        weightOverride: false,
      })
    }
  })

  return { toAdd, toUpdate, errors, warnings }
}

// --- Workbook builders ---

/**
 * Build a SheetJS workbook with real guest and tag data.
 * @param {Array} guests
 * @param {Array} tags
 * @param {string} userId - For tag weight column
 * @returns {XLSX.WorkBook}
 */
export function buildWorkbook(guests, tags, userId) {
  const guestRows = guestsToSheetData(guests, tags)
  const tagRows = tagsToSheetData(tags, userId)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(guestRows, { header: GUEST_HEADERS }), 'Guests')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tagRows, { header: TAG_HEADERS }), 'Tags')
  return wb
}

/**
 * Build a sample workbook with headers and one example row per sheet.
 * Used for the "Download Sample" button.
 * @returns {XLSX.WorkBook}
 */
export function buildSampleWorkbook() {
  const guestSample = [{
    'Name': 'John Smith',
    'Owner': 'hansen',
    'Tags': 'Family, Friends',
    'Group': 'no',
    'Adults': '',
    'Kids': '',
    'Group Notes': '',
    'Weight': '',
    'STD Sent (Hansen)': 'no',
    'Invite Sent (Hansen)': 'no',
    'STD Sent (Lavita)': 'no',
    'Invite Sent (Lavita)': 'no',
    'Confirmed': 'no',
    'Archived': 'no',
  }]

  const tagSample = [{
    'Name': 'Family',
    'Color': '#e8f4e8',
    'Weight': '7',
  }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(guestSample, { header: GUEST_HEADERS }), 'Guests')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tagSample, { header: TAG_HEADERS }), 'Tags')
  return wb
}

// --- File I/O ---

/**
 * Trigger a browser download of a SheetJS workbook.
 * @param {XLSX.WorkBook} workbook
 * @param {string} filename
 */
export function downloadWorkbook(workbook, filename) {
  const buf = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Parse an Excel File object into guest and tag row arrays.
 * @param {File} file
 * @returns {Promise<{ guestRows: Array, tagRows: Array }>}
 */
export function parseWorkbookFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', raw: false })
        const guestSheet = wb.Sheets['Guests'] ?? wb.Sheets[wb.SheetNames[0]]
        const tagSheet = wb.Sheets['Tags'] ?? wb.Sheets[wb.SheetNames[1]]
        const guestRows = guestSheet ? XLSX.utils.sheet_to_json(guestSheet, { defval: '' }) : []
        const tagRows = tagSheet ? XLSX.utils.sheet_to_json(tagSheet, { defval: '' }) : []
        resolve({ guestRows, tagRows })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}
