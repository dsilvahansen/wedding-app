import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/hooks/useAuth.js', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, role: 'hansen' }),
}))
vi.mock('../../../src/hooks/useGuests.js', () => ({
  useGuests: () => ({ guests: [] }),
}))
vi.mock('../../../src/hooks/useTags.js', () => ({
  useTags: () => ({ tags: [{ id: 't1', name: 'Family', color: '#e8f4e8', createdByInitial: 'H', weights: { u1: 9 } }] }),
}))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: 'new-guest' }),
  serverTimestamp: vi.fn(() => 'ts'),
}))
vi.mock('../../../src/firebase.js', () => ({ db: {} }))

import AddGuest from '../../../src/components/guests/AddGuest.jsx'

describe('AddGuest', () => {
  it('renders name input', () => {
    render(<AddGuest />)
    expect(screen.getByPlaceholderText(/guest name/i)).toBeInTheDocument()
  })

  it('renders tag pills', () => {
    render(<AddGuest />)
    expect(screen.getByText('Family')).toBeInTheDocument()
  })

  it('shows Save + Add Next button', () => {
    render(<AddGuest />)
    expect(screen.getByText(/save \+ add next/i)).toBeInTheDocument()
  })
})
