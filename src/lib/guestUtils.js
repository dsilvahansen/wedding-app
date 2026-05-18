/**
 * Calculate effective weight for a guest.
 * Returns override if set, otherwise max tag weight for userId, or 5 if no tags.
 */
export function calcWeight(tagIds, userId, tags, weightOverride, overrideValue) {
  if (weightOverride && overrideValue != null) return overrideValue
  if (!tagIds || tagIds.length === 0) return 5
  const weights = tagIds
    .map(id => tags.find(t => t.id === id))
    .filter(Boolean)
    .map(t => (t.weights && t.weights[userId]) ?? 5)
  return weights.length > 0 ? Math.max(...weights) : 5
}

/**
 * Find guests in allGuests with the same name (case-insensitive)
 * that belong to a different owner than currentUserId.
 */
export function findDuplicates(name, currentUserId, allGuests) {
  const normalized = name.trim().toLowerCase()
  return allGuests.filter(
    g => g.name?.trim().toLowerCase() === normalized && g.ownerId !== currentUserId
  )
}

/**
 * Merge guest list for Combined view.
 * Guests with same name (case-insensitive) from different owners, or
 * manually linked guests, are merged into one entry with shared=true.
 */
export function deduplicateForCombined(guests) {
  const seen = new Map() // normalizedName -> combined entry
  const result = []

  for (const guest of guests) {
    const key = guest.linkedGuestId
      ? `linked:${[guest.id, guest.linkedGuestId].sort().join('-')}`
      : guest.name.trim().toLowerCase()

    if (seen.has(key)) {
      const existing = seen.get(key)
      existing.shared = true
      existing.weight = Math.max(existing.weight, guest.weight)
      existing.owners.push(guest.ownerId)
      existing.allTags = [...existing.allTags, ...(guest.tags ?? []).map(t => ({ tagId: t, ownerId: guest.ownerId }))]
      existing.rsvp.confirmed = existing.rsvp.confirmed || guest.rsvp?.confirmed
    } else {
      const entry = {
        ...guest,
        shared: false,
        owners: [guest.ownerId],
        allTags: (guest.tags ?? []).map(t => ({ tagId: t, ownerId: guest.ownerId })),
      }
      seen.set(key, entry)
      result.push(entry)
    }
  }

  return result
}

/**
 * Sort guests array by 'weight' (desc) or 'name' (asc).
 */
export function sortGuests(guests, sortBy = 'weight') {
  return [...guests].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    return b.weight - a.weight
  })
}

export function getTotalHeadcount(guest) {
  if (!guest.isGroup) return 1
  return (guest.adultCount ?? 0) + (guest.kidCount ?? 0)
}

/**
 * Returns the owning side ('hansen' or 'lavita') for any role.
 * Contributors map to their associated side.
 */
export function getOwnerRole(role) {
  if (role === 'hansen' || role === 'hContributor') return 'hansen'
  if (role === 'lavita' || role === 'lContributor') return 'lavita'
  throw new Error(`getOwnerRole: unknown role "${role}"`)
}

/**
 * Returns true if the role is a contributor (not a primary owner).
 */
export function isContributor(role) {
  return role === 'hContributor' || role === 'lContributor'
}
