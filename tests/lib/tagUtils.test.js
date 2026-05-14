import { describe, it, expect } from 'vitest'
import { TAG_COLORS, getTagColor, getTagWeight } from '../../src/lib/tagUtils.js'

describe('TAG_COLORS', () => {
  it('is a non-empty array of hex colors', () => {
    expect(Array.isArray(TAG_COLORS)).toBe(true)
    expect(TAG_COLORS.length).toBeGreaterThan(0)
    expect(TAG_COLORS[0]).toMatch(/^#[0-9a-fA-F]{6}$/)
  })
})

describe('getTagColor', () => {
  it('returns color string for a tag', () => {
    const tag = { color: '#e8f4e8' }
    expect(getTagColor(tag)).toBe('#e8f4e8')
  })

  it('returns default color when tag has no color', () => {
    expect(getTagColor({})).toBe(TAG_COLORS[0])
  })
})

describe('getTagWeight', () => {
  it('returns the user-specific weight for a tag', () => {
    const tag = { weights: { u1: 7, u2: 4 } }
    expect(getTagWeight(tag, 'u1')).toBe(7)
  })

  it('returns 5 when user has no weight set', () => {
    const tag = { weights: {} }
    expect(getTagWeight(tag, 'u1')).toBe(5)
  })
})
