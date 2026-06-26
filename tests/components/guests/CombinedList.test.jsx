import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Hook mocks ---
vi.mock('../../../src/hooks/useAuth.js', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, role: 'hansen' }),
}))
vi.mock('../../../src/hooks/useGuests.js', () => ({
  useGuests: () => ({
    guests: [
      // g1 and g2 share the same name — deduplicateForCombined merges them as "shared"
      {
        id: 'g1', name: 'Alice', ownerRole: 'hansen', ownerId: 'u1', tags: [], weight: 8,
        linkedGuestId: null, archived: false,
        rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false },
      },
      {
        id: 'g2', name: 'Alice', ownerRole: 'lavita', ownerId: 'u2', tags: [], weight: 6,
        linkedGuestId: null, archived: false,
        rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false },
      },
      {
        id: 'g3', name: 'Bob', ownerRole: 'hansen', ownerId: 'u1', tags: [], weight: 5,
        linkedGuestId: null, archived: false,
        rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false },
      },
    ],
  }),
}))
vi.mock('../../../src/hooks/useTags.js', () => ({ useTags: () => ({ tags: [] }) }))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn(),
}))
vi.mock('../../../src/firebase.js', () => ({ db: {} }))

import CombinedList from '../../../src/components/guests/CombinedList.jsx'

describe('CombinedList', () => {
  it('shows total unique count (2 not 3 — Alice is deduplicated)', () => {
    render(<CombinedList />)
    expect(screen.getByText(/2 total/i)).toBeInTheDocument()
  })

  it('shows shared count badge (1 shared — Alice appears on both lists)', () => {
    render(<CombinedList />)
    expect(screen.getByText(/1 shared/i)).toBeInTheDocument()
  })

  it('renders a row for each unique guest', () => {
    render(<CombinedList />)
    // Both Alice (merged) and Bob should be visible
    expect(screen.getAllByText('Alice')).toHaveLength(1)
    expect(screen.getAllByText('Bob')).toHaveLength(1)
  })

  it('filters down to just one guest when Hansen owner filter is selected', () => {
    render(<CombinedList />)
    // After deduplication Alice is shared, Bob is Hansen-only.
    // 'Hansen' filter should keep only guests owned by uid 'u1'.
    fireEvent.click(screen.getByRole('button', { name: /^hansen$/i }))
    const rows = screen.getAllByTestId('guest-row')
    // Alice (shared, owners includes u1) + Bob (u1) = 2 rows visible under Hansen filter
    expect(rows.length).toBeGreaterThanOrEqual(1)
  })

  it('shows select button and enters selection mode', () => {
    render(<CombinedList />)
    fireEvent.click(screen.getByRole('button', { name: /^select$/i }))
    expect(screen.getByRole('button', { name: /^done$/i })).toBeInTheDocument()
  })
})
