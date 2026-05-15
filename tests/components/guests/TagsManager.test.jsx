import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../src/hooks/useAuth.js', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, role: 'hansen' }),
}))
vi.mock('../../../src/hooks/useGuests.js', () => ({
  useGuests: () => ({
    guests: [
      { id: 'g1', tags: ['t1'], ownerId: 'u1', weight: 5, rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
    ],
  }),
}))
vi.mock('../../../src/hooks/useTags.js', () => ({
  useTags: () => ({
    tags: [{ id: 't1', name: 'Family', color: '#e8f4e8', createdByInitial: 'H', weights: { u1: 9 } }],
  }),
}))
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(), collection: vi.fn(), addDoc: vi.fn() }))
vi.mock('../../../src/firebase.js', () => ({ db: {} }))

import TagsManager from '../../../src/components/guests/TagsManager.jsx'

describe('TagsManager', () => {
  it('shows tag name', () => {
    render(<TagsManager />)
    expect(screen.getByText('Family')).toBeInTheDocument()
  })

  it('shows guest count for tag', () => {
    render(<TagsManager />)
    expect(screen.getByText(/1 guest/i)).toBeInTheDocument()
  })

  it('shows weight for current user', () => {
    render(<TagsManager />)
    expect(screen.getByText('w: 9')).toBeInTheDocument()
  })
})
