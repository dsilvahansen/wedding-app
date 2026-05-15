import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addDoc } from 'firebase/firestore'

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
  collection: vi.fn(() => 'collection-ref'),
  addDoc: vi.fn().mockResolvedValue({ id: 'new-guest' }),
  serverTimestamp: vi.fn(() => 'ts'),
}))
vi.mock('../../../src/firebase.js', () => ({ db: {} }))

import AddGuest from '../../../src/components/guests/AddGuest.jsx'

describe('AddGuest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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

  it('shows Family / Group toggle', () => {
    render(<AddGuest />)
    expect(screen.getByText(/family \/ group/i)).toBeInTheDocument()
  })

  it('does not show counters when toggle is off', () => {
    render(<AddGuest />)
    expect(screen.queryByText('Adults')).not.toBeInTheDocument()
    expect(screen.queryByText('Kids')).not.toBeInTheDocument()
  })

  it('shows counters and notes when toggle is turned on', () => {
    render(<AddGuest />)
    fireEvent.click(screen.getByRole('checkbox', { name: /family \/ group/i }))
    expect(screen.getByText('Adults')).toBeInTheDocument()
    expect(screen.getByText('Kids')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/e\.g\. john, jane/i)).toBeInTheDocument()
  })

  it('increments adult count with plus button', () => {
    render(<AddGuest />)
    fireEvent.click(screen.getByRole('checkbox', { name: /family \/ group/i }))
    const plusButtons = screen.getAllByRole('button', { name: '+' })
    fireEvent.click(plusButtons[0]) // adults +
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('does not decrement adults below 1', () => {
    render(<AddGuest />)
    fireEvent.click(screen.getByRole('checkbox', { name: /family \/ group/i }))
    const minusButtons = screen.getAllByRole('button', { name: '−' })
    fireEvent.click(minusButtons[0]) // adults −
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('saves isGroup fields when toggle is on', async () => {
    render(<AddGuest />)
    fireEvent.change(screen.getByPlaceholderText(/guest name/i), { target: { value: 'Smith family' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /family \/ group/i }))
    // increment adults to 2
    const plusButtons = screen.getAllByRole('button', { name: '+' })
    fireEvent.click(plusButtons[0])
    fireEvent.click(screen.getByText(/save \+ add next/i))
    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isGroup: true,
          adultCount: 2,
          kidCount: 0,
          groupNotes: '',
        })
      )
    })
  })

  it('does not save group fields when toggle is off', async () => {
    render(<AddGuest />)
    fireEvent.change(screen.getByPlaceholderText(/guest name/i), { target: { value: 'Alice' } })
    fireEvent.click(screen.getByText(/save \+ add next/i))
    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.not.objectContaining({ isGroup: true })
      )
    })
  })
})
