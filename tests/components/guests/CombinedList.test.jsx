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
      { id: 'g2', name: 'Alice', ownerId: 'u2', tags: [], weight: 6, linkedGuestId: null,
        rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
      { id: 'g3', name: 'Bob', ownerId: 'u1', tags: [], weight: 5, linkedGuestId: null,
        rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
    ],
  }),
}))
vi.mock('../../../src/hooks/useTags.js', () => ({ useTags: () => ({ tags: [] }) }))
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), updateDoc: vi.fn(), serverTimestamp: vi.fn() }))
vi.mock('../../../src/firebase.js', () => ({ db: {} }))

import CombinedList from '../../../src/components/guests/CombinedList.jsx'

describe('CombinedList', () => {
  it('shows total unique count (2 not 3)', () => {
    render(<CombinedList />)
    expect(screen.getByText(/2 total/i)).toBeInTheDocument()
  })

  it('shows shared count badge', () => {
    render(<CombinedList />)
    expect(screen.getByText(/1 shared/i)).toBeInTheDocument()
  })
})
