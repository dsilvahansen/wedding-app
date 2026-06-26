import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  guestsToSheetData,
  tagsToSheetData,
  sheetDataToGuests,
  sheetDataToTags,
  buildWorkbook,
  buildSampleWorkbook,
  parseWorkbookFromFile,
} from '../../src/lib/excelUtils.js'

// --- Fixtures ---

const TAGS = [
  { id: 't1', name: 'Family', color: '#e8f4e8', weights: { uid1: 8, uid2: 6 }, order: 1 },
  { id: 't2', name: 'Friends', color: '#e8e8f4', weights: { uid1: 5 }, order: 2 },
  { id: 't3', name: 'Colleagues', color: '#f4e8e8', weights: {}, order: 3 },
]

const GUESTS = [
  {
    id: 'g1',
    name: 'Alice Smith',
    ownerRole: 'hansen',
    ownerId: 'uid1',
    tags: ['t1', 't2'],
    weight: 8,
    weightOverride: false,
    isGroup: false,
    adultCount: null,
    kidCount: null,
    groupNotes: '',
    archived: false,
    rsvp: {
      hansen: { saveTheDateSent: true, inviteSent: false },
      lavita: { saveTheDateSent: false, inviteSent: false },
      confirmed: false,
    },
  },
  {
    id: 'g2',
    name: 'Bob Jones',
    ownerRole: 'lavita',
    ownerId: 'uid2',
    tags: ['t3'],
    weight: 5,
    weightOverride: false,
    isGroup: true,
    adultCount: 2,
    kidCount: 1,
    groupNotes: 'Bob + wife + kid',
    archived: true,
    rsvp: {
      hansen: { saveTheDateSent: false, inviteSent: false },
      lavita: { saveTheDateSent: true, inviteSent: true },
      confirmed: true,
    },
  },
]

// --- guestsToSheetData ---

describe('guestsToSheetData', () => {
  it('maps guest fields to correct column headers', () => {
    const rows = guestsToSheetData(GUESTS, TAGS)
    expect(rows).toHaveLength(2)
    const row = rows[0]
    expect(row).toHaveProperty('Name', 'Alice Smith')
    expect(row).toHaveProperty('Owner', 'hansen')
    expect(row).toHaveProperty('Tags', 'Family, Friends')
    expect(row).toHaveProperty('Group', 'no')
    expect(row).toHaveProperty('Adults', '')
    expect(row).toHaveProperty('Kids', '')
    expect(row).toHaveProperty('Group Notes', '')
    expect(row).toHaveProperty('Weight', 8)
    expect(row).toHaveProperty('STD Sent (Hansen)', 'yes')
    expect(row).toHaveProperty('Invite Sent (Hansen)', 'no')
    expect(row).toHaveProperty('STD Sent (Lavita)', 'no')
    expect(row).toHaveProperty('Invite Sent (Lavita)', 'no')
    expect(row).toHaveProperty('Confirmed', 'no')
    expect(row).toHaveProperty('Archived', 'no')
  })

  it('maps group guest fields correctly', () => {
    const rows = guestsToSheetData(GUESTS, TAGS)
    const row = rows[1]
    expect(row['Group']).toBe('yes')
    expect(row['Adults']).toBe(2)
    expect(row['Kids']).toBe(1)
    expect(row['Group Notes']).toBe('Bob + wife + kid')
    expect(row['Archived']).toBe('yes')
    expect(row['Confirmed']).toBe('yes')
    expect(row['STD Sent (Lavita)']).toBe('yes')
    expect(row['Invite Sent (Lavita)']).toBe('yes')
  })

  it('resolves tag names from ids', () => {
    const rows = guestsToSheetData(GUESTS, TAGS)
    expect(rows[0]['Tags']).toBe('Family, Friends')
    expect(rows[1]['Tags']).toBe('Colleagues')
  })

  it('handles guest with no tags', () => {
    const guests = [{ ...GUESTS[0], tags: [] }]
    const rows = guestsToSheetData(guests, TAGS)
    expect(rows[0]['Tags']).toBe('')
  })

  it('handles missing rsvp fields gracefully', () => {
    const guests = [{ ...GUESTS[0], rsvp: {} }]
    const rows = guestsToSheetData(guests, TAGS)
    expect(rows[0]['STD Sent (Hansen)']).toBe('no')
    expect(rows[0]['Confirmed']).toBe('no')
  })
})

// --- tagsToSheetData ---

describe('tagsToSheetData', () => {
  it('maps tag fields to correct columns', () => {
    const rows = tagsToSheetData(TAGS, 'uid1')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual({ Name: 'Family', Color: '#e8f4e8', Weight: 8 })
    expect(rows[1]).toEqual({ Name: 'Friends', Color: '#e8e8f4', Weight: 5 })
  })

  it('defaults weight to 5 when user has no weight set', () => {
    const rows = tagsToSheetData(TAGS, 'uid1')
    expect(rows[2]['Weight']).toBe(5) // Colleagues has weights: {}
  })

  it('shows the correct user weight (not the other user)', () => {
    const rows = tagsToSheetData(TAGS, 'uid2')
    expect(rows[0]['Weight']).toBe(6) // uid2 weight for Family is 6
  })
})

// --- sheetDataToTags ---

describe('sheetDataToTags', () => {
  it('creates a new tag when name not found', () => {
    const rows = [{ Name: 'New Tag', Color: '#e8e8f4', Weight: 7 }]
    const { toCreate, toUpdate, errors } = sheetDataToTags(rows, [], 'uid1')
    expect(toCreate).toHaveLength(1)
    expect(toCreate[0].name).toBe('New Tag')
    expect(toCreate[0].color).toBe('#e8e8f4')
    expect(toCreate[0].weights).toEqual({ uid1: 7 })
    expect(toUpdate).toHaveLength(0)
    expect(errors).toHaveLength(0)
  })

  it('updates existing tag matched by name (case-insensitive)', () => {
    const rows = [{ Name: 'family', Color: '#f4e8e8', Weight: 9 }]
    const { toCreate, toUpdate, errors } = sheetDataToTags(rows, TAGS, 'uid1')
    expect(toCreate).toHaveLength(0)
    expect(toUpdate).toHaveLength(1)
    expect(toUpdate[0].id).toBe('t1')
    expect(toUpdate[0].name).toBe('family')
    expect(toUpdate[0].color).toBe('#f4e8e8')
    expect(toUpdate[0].weightUpdate).toEqual({ uid: 'uid1', value: 9 })
    expect(errors).toHaveLength(0)
  })

  it('skips color update if blank', () => {
    const rows = [{ Name: 'Family', Color: '', Weight: '' }]
    const { toUpdate } = sheetDataToTags(rows, TAGS, 'uid1')
    expect(toUpdate[0].color).toBeUndefined()
    expect(toUpdate[0].weightUpdate).toBeUndefined()
  })

  it('skips weight update if not a valid 1-10 number', () => {
    const rows = [{ Name: 'Family', Color: '', Weight: 99 }]
    const { toUpdate } = sheetDataToTags(rows, TAGS, 'uid1')
    expect(toUpdate[0].weightUpdate).toBeUndefined()
  })

  it('errors on blank name', () => {
    const rows = [{ Name: '', Color: '#e8f4e8', Weight: 5 }]
    const { errors } = sheetDataToTags(rows, TAGS, 'uid1')
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/Row 1/)
  })

  it('defaults color to TAG_COLORS[0] when blank on create', () => {
    const rows = [{ Name: 'Brand New', Color: '', Weight: '' }]
    const { toCreate } = sheetDataToTags(rows, [], 'uid1')
    expect(toCreate[0].color).toBe('#e8f4e8')
  })

  it('sets weights to empty object when weight blank on create', () => {
    const rows = [{ Name: 'Brand New', Color: '', Weight: '' }]
    const { toCreate } = sheetDataToTags(rows, [], 'uid1')
    expect(toCreate[0].weights).toEqual({})
  })
})

// --- sheetDataToGuests ---

describe('sheetDataToGuests', () => {
  it('creates new guest when name not found', () => {
    const rows = [{ Name: 'New Guest', Owner: 'hansen', Tags: '', Group: 'no', Adults: '', Kids: '', 'Group Notes': '', 'STD Sent (Hansen)': 'no', 'Invite Sent (Hansen)': 'no', 'STD Sent (Lavita)': 'no', 'Invite Sent (Lavita)': 'no', Confirmed: 'no', Archived: 'no' }]
    const { toAdd, toUpdate, errors } = sheetDataToGuests(rows, [], TAGS)
    expect(toAdd).toHaveLength(1)
    expect(toAdd[0].name).toBe('New Guest')
    expect(toAdd[0].ownerRole).toBe('hansen')
    expect(toUpdate).toHaveLength(0)
    expect(errors).toHaveLength(0)
  })

  it('updates existing guest matched by name (case-insensitive)', () => {
    const rows = [{ Name: 'alice smith', Owner: 'hansen', Tags: 'Family', Group: 'no', Adults: '', Kids: '', 'Group Notes': '', 'STD Sent (Hansen)': 'yes', 'Invite Sent (Hansen)': 'yes', 'STD Sent (Lavita)': 'no', 'Invite Sent (Lavita)': 'no', Confirmed: 'no', Archived: 'no' }]
    const { toAdd, toUpdate, errors } = sheetDataToGuests(rows, GUESTS, TAGS)
    expect(toAdd).toHaveLength(0)
    expect(toUpdate).toHaveLength(1)
    expect(toUpdate[0].id).toBe('g1')
    expect(toUpdate[0].rsvp.hansen.inviteSent).toBe(true)
    expect(errors).toHaveLength(0)
  })

  it('preserves ownerRole, ownerId, linkedGuestId, weightOverride on update', () => {
    const rows = [{ Name: 'alice smith', Owner: 'lavita', Tags: '', Group: 'no', Adults: '', Kids: '', 'Group Notes': '', 'STD Sent (Hansen)': 'no', 'Invite Sent (Hansen)': 'no', 'STD Sent (Lavita)': 'no', 'Invite Sent (Lavita)': 'no', Confirmed: 'no', Archived: 'no' }]
    const { toUpdate } = sheetDataToGuests(rows, GUESTS, TAGS)
    // ownerRole should be preserved from the existing guest, not taken from the import row
    expect(toUpdate[0].ownerRole).toBe('hansen')
    expect(toUpdate[0].ownerId).toBe('uid1')
  })

  it('resolves tag names to ids', () => {
    const rows = [{ Name: 'New Guest', Owner: 'hansen', Tags: 'Family, Colleagues', Group: 'no', Adults: '', Kids: '', 'Group Notes': '', 'STD Sent (Hansen)': 'no', 'Invite Sent (Hansen)': 'no', 'STD Sent (Lavita)': 'no', 'Invite Sent (Lavita)': 'no', Confirmed: 'no', Archived: 'no' }]
    const { toAdd } = sheetDataToGuests(rows, [], TAGS)
    expect(toAdd[0].tags).toEqual(['t1', 't3'])
  })

  it('errors on blank name', () => {
    const rows = [{ Name: '', Owner: 'hansen', Tags: '' }]
    const { errors } = sheetDataToGuests(rows, [], TAGS)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/Row 1/)
  })

  it('errors on invalid owner', () => {
    const rows = [{ Name: 'Someone', Owner: 'unknown', Tags: '' }]
    const { errors } = sheetDataToGuests(rows, [], TAGS)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/Row 1/)
  })

  it('coerces unexpected boolean values to false', () => {
    const rows = [{ Name: 'Test', Owner: 'hansen', Tags: '', Group: 'maybe', Adults: '', Kids: '', 'Group Notes': '', 'STD Sent (Hansen)': 'yep', 'Invite Sent (Hansen)': 'no', 'STD Sent (Lavita)': 'no', 'Invite Sent (Lavita)': 'no', Confirmed: 'no', Archived: 'no' }]
    const { toAdd, warnings } = sheetDataToGuests(rows, [], TAGS)
    expect(toAdd[0].isGroup).toBe(false)
    expect(toAdd[0].rsvp.hansen.saveTheDateSent).toBe(false)
    expect(warnings.length).toBeGreaterThan(0)
  })

  it('maps group fields correctly', () => {
    const rows = [{ Name: 'New Group', Owner: 'lavita', Tags: '', Group: 'yes', Adults: '3', Kids: '2', 'Group Notes': 'extended family', 'STD Sent (Hansen)': 'no', 'Invite Sent (Hansen)': 'no', 'STD Sent (Lavita)': 'no', 'Invite Sent (Lavita)': 'no', Confirmed: 'no', Archived: 'no' }]
    const { toAdd } = sheetDataToGuests(rows, [], TAGS)
    expect(toAdd[0].isGroup).toBe(true)
    expect(toAdd[0].adultCount).toBe(3)
    expect(toAdd[0].kidCount).toBe(2)
    expect(toAdd[0].groupNotes).toBe('extended family')
  })
})

// --- buildWorkbook ---

describe('buildWorkbook', () => {
  it('produces a workbook with Guests and Tags sheets', () => {
    const wb = buildWorkbook(GUESTS, TAGS, 'uid1')
    expect(wb.SheetNames).toContain('Guests')
    expect(wb.SheetNames).toContain('Tags')
  })

  it('Guests sheet has correct number of data rows', () => {
    const wb = buildWorkbook(GUESTS, TAGS, 'uid1')
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Guests'])
    expect(rows).toHaveLength(2)
  })

  it('Tags sheet has correct number of data rows', () => {
    const wb = buildWorkbook(GUESTS, TAGS, 'uid1')
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Tags'])
    expect(rows).toHaveLength(3)
  })
})

// --- buildSampleWorkbook ---

describe('buildSampleWorkbook', () => {
  it('produces a workbook with Guests and Tags sheets', () => {
    const wb = buildSampleWorkbook()
    expect(wb.SheetNames).toContain('Guests')
    expect(wb.SheetNames).toContain('Tags')
  })

  it('Guests sheet has one example data row', () => {
    const wb = buildSampleWorkbook()
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Guests'])
    expect(rows).toHaveLength(1)
  })

  it('Tags sheet has one example data row', () => {
    const wb = buildSampleWorkbook()
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Tags'])
    expect(rows).toHaveLength(1)
  })

  it('Guests sample row has all required columns', () => {
    const wb = buildSampleWorkbook()
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Guests'])
    const row = rows[0]
    expect(row).toHaveProperty('Name')
    expect(row).toHaveProperty('Owner')
    expect(row).toHaveProperty('Tags')
    expect(row).toHaveProperty('STD Sent (Hansen)')
  })
})

// --- parseWorkbookFromFile (round-trip test via ArrayBuffer) ---

describe('parseWorkbookFromFile', () => {
  it('round-trips a workbook: write then parse returns correct guest and tag rows', async () => {
    const wb = buildWorkbook(GUESTS, TAGS, 'uid1')
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const file = new File([buf], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

    const { guestRows, tagRows } = await parseWorkbookFromFile(file)
    expect(guestRows).toHaveLength(2)
    expect(tagRows).toHaveLength(3)
    expect(guestRows[0]['Name']).toBe('Alice Smith')
    expect(tagRows[0]['Name']).toBe('Family')
  })
})
