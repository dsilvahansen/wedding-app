import { describe, it, expect } from 'vitest'
import {
  calcWeight,
  findDuplicates,
  deduplicateForCombined,
  sortGuests,
} from '../../src/lib/guestUtils.js'

const mockTags = [
  { id: 't1', name: 'Family', weights: { u1: 9, u2: 8 } },
  { id: 't2', name: 'Friends', weights: { u1: 6, u2: 7 } },
]

describe('calcWeight', () => {
  it('returns max tag weight for user', () => {
    expect(calcWeight(['t1', 't2'], 'u1', mockTags, false, null)).toBe(9)
  })

  it('returns override weight when weightOverride is true', () => {
    expect(calcWeight(['t1'], 'u1', mockTags, true, 3)).toBe(3)
  })

  it('returns 5 when no tags selected', () => {
    expect(calcWeight([], 'u1', mockTags, false, null)).toBe(5)
  })

  it('returns max tag weight when weightOverride is true but overrideValue is undefined', () => {
    expect(calcWeight(['t1'], 'u1', mockTags, true, undefined)).toBe(9)
  })
})

describe('findDuplicates', () => {
  it('returns guests with same name (case-insensitive) from different owners', () => {
    const guests = [
      { id: 'g1', name: 'John Smith', ownerId: 'u1' },
      { id: 'g2', name: 'john smith', ownerId: 'u2' },
      { id: 'g3', name: 'Jane Doe', ownerId: 'u1' },
    ]
    const result = findDuplicates('John Smith', 'u1', guests)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('g2')
  })

  it('does not flag same owner as duplicate', () => {
    const guests = [
      { id: 'g1', name: 'John Smith', ownerId: 'u1' },
    ]
    expect(findDuplicates('John Smith', 'u1', guests)).toHaveLength(0)
  })
})

describe('deduplicateForCombined', () => {
  it('merges exact-name guests from different owners into one entry', () => {
    const guests = [
      { id: 'g1', name: 'John Smith', ownerId: 'u1', tags: ['t1'], weight: 9, linkedGuestId: null, rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
      { id: 'g2', name: 'John Smith', ownerId: 'u2', tags: ['t2'], weight: 7, linkedGuestId: null, rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
    ]
    const result = deduplicateForCombined(guests)
    expect(result).toHaveLength(1)
    expect(result[0].shared).toBe(true)
    expect(result[0].weight).toBe(9)
  })

  it('keeps unique guests as separate entries', () => {
    const guests = [
      { id: 'g1', name: 'Alice', ownerId: 'u1', tags: [], weight: 5, linkedGuestId: null, rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
      { id: 'g2', name: 'Bob', ownerId: 'u2', tags: [], weight: 5, linkedGuestId: null, rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
    ]
    const result = deduplicateForCombined(guests)
    expect(result).toHaveLength(2)
    expect(result.every(g => !g.shared)).toBe(true)
  })

  it('merges guests with linkedGuestId pointing to each other into one shared entry', () => {
    const guests = [
      { id: 'g1', name: 'Alice', ownerId: 'u1', tags: ['t1'], weight: 9, linkedGuestId: 'g2', rsvp: { confirmed: false } },
      { id: 'g2', name: 'Alice', ownerId: 'u2', tags: ['t2'], weight: 7, linkedGuestId: 'g1', rsvp: { confirmed: true } },
    ]
    const result = deduplicateForCombined(guests)
    expect(result).toHaveLength(1)
    expect(result[0].shared).toBe(true)
    expect(result[0].weight).toBe(9)
    expect(result[0].rsvp.confirmed).toBe(true)
  })
})

describe('sortGuests', () => {
  it('sorts by weight descending by default', () => {
    const guests = [{ weight: 3 }, { weight: 9 }, { weight: 6 }]
    expect(sortGuests(guests, 'weight').map(g => g.weight)).toEqual([9, 6, 3])
  })

  it('sorts by name A-Z', () => {
    const guests = [{ name: 'Zara', weight: 5 }, { name: 'Alice', weight: 5 }]
    expect(sortGuests(guests, 'name')[0].name).toBe('Alice')
  })
})
