import { render, screen, fireEvent } from '@testing-library/react'
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
    tags: [
      { id: 't1', name: 'Family', color: '#e8f4e8', createdByInitial: 'H', weights: { u1: 9 }, order: 1 },
      { id: 't2', name: 'Work', color: '#e8e8f4', createdByInitial: 'H', weights: { u1: 5 }, order: 2 },
    ],
  }),
}))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  collection: vi.fn(),
  addDoc: vi.fn(),
  writeBatch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn().mockResolvedValue() })),
}))
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

  it('shows drag handle for each tag', () => {
    render(<TagsManager />)
    const handles = screen.getAllByLabelText('drag handle')
    expect(handles).toHaveLength(2)
  })

  it('shows assign guests button for each tag', () => {
    render(<TagsManager />)
    const buttons = screen.getAllByLabelText(/assign guests/i)
    expect(buttons).toHaveLength(2)
  })

  it('opens GuestTagAssignSheet when assign button clicked', () => {
    render(<TagsManager />)
    const [firstAssignBtn] = screen.getAllByLabelText(/assign guests/i)
    fireEvent.click(firstAssignBtn)
    expect(screen.getByText(/assign to/i)).toBeInTheDocument()
  })
})
