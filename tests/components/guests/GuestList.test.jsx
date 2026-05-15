import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../src/hooks/useAuth.js', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, role: 'hansen' }),
}))
vi.mock('../../../src/hooks/useGuests.js', () => ({
  useGuests: () => ({
    guests: [
      { id: 'g1', name: 'Alice', ownerId: 'u1', tags: [], weight: 8, linkedGuestId: null,
        rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
    ],
  }),
}))
vi.mock('../../../src/hooks/useTags.js', () => ({
  useTags: () => ({ tags: [] }),
}))
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(), serverTimestamp: vi.fn() }))
vi.mock('../../../src/firebase.js', () => ({ db: {} }))

import GuestList from '../../../src/components/guests/GuestList.jsx'

describe('GuestList', () => {
  it('shows current user guests in My List', () => {
    render(<GuestList readOnly={false} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('shows partner guests in Their List (readOnly)', () => {
    render(<GuestList readOnly={true} />)
    // partner is lavita (u2), no guests — shows empty state
    expect(screen.getByText(/no guests/i)).toBeInTheDocument()
  })

  it('shows count in header', () => {
    render(<GuestList readOnly={false} />)
    expect(screen.getByText(/my list \(1\)/i)).toBeInTheDocument()
  })
})
