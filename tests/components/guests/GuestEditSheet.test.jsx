import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Firebase mocks ---
vi.mock('firebase/firestore', () => ({
  doc: vi.fn().mockReturnValue({}),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn().mockReturnValue('ts'),
}))
vi.mock('../../../src/firebase.js', () => ({ db: {} }))

import { updateDoc, deleteDoc } from 'firebase/firestore'
import GuestEditSheet from '../../../src/components/guests/GuestEditSheet.jsx'

// --- Fixtures ---
const tags = [
  { id: 't1', name: 'Family', color: '#e8f4e8', weights: {} },
  { id: 't2', name: 'Friends', color: '#e8e8f4', weights: {} },
]

const guest = {
  id: 'g1',
  name: 'Alice',
  tags: ['t1'],
  weight: 8,
  archived: false,
  isGroup: false,
  ownerRole: 'hansen',
  weightOverride: false,
  rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false },
}

const archivedGuest = { ...guest, archived: true }

function renderSheet(props = {}) {
  return render(
    <GuestEditSheet
      guest={guest}
      tags={tags}
      userId="u1"
      role="hansen"
      open={true}
      onClose={vi.fn()}
      {...props}
    />
  )
}

describe('GuestEditSheet', () => {
  beforeEach(() => { updateDoc.mockClear(); deleteDoc.mockClear() })

  // --- Name editing ---

  it('renders current guest name in the input', () => {
    renderSheet()
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument()
  })

  it('saves updated name to Firestore on Save', async () => {
    renderSheet()
    const input = screen.getByDisplayValue('Alice')
    fireEvent.change(input, { target: { value: 'Alice Smith' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(updateDoc).toHaveBeenCalledWith({}, expect.objectContaining({ name: 'Alice Smith' })))
  })

  // --- Tag selection ---

  it('shows tags with the pre-selected tag visually distinct', () => {
    renderSheet()
    // Family is the selected tag; it should appear first (sorted to front)
    const pills = screen.getAllByText(/Family|Friends/)
    expect(pills[0].textContent).toBe('Family')
  })

  // --- RSVP toggles ---

  it('toggles saveTheDateSent on the Hansen row and writes to Firestore', async () => {
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /saveTheDateSent/i }))
    await waitFor(() =>
      expect(updateDoc).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ rsvp: expect.objectContaining({ hansen: expect.objectContaining({ saveTheDateSent: true }) }) })
      )
    )
  })

  it('shows unarchive prompt after RSVP toggle on archived guest', async () => {
    renderSheet({ guest: archivedGuest })
    fireEvent.click(screen.getByRole('button', { name: /saveTheDateSent/i }))
    await waitFor(() => expect(screen.getByText(/unarchive them\?/i)).toBeInTheDocument())
  })

  it('calls updateDoc with archived:false when Unarchive is clicked', async () => {
    renderSheet({ guest: archivedGuest })
    fireEvent.click(screen.getByRole('button', { name: /saveTheDateSent/i }))
    await waitFor(() => screen.getByText(/unarchive them/i))
    fireEvent.click(screen.getByRole('button', { name: /^unarchive$/i }))
    await waitFor(() => expect(updateDoc).toHaveBeenCalledWith({}, expect.objectContaining({ archived: false })))
  })

  it('does not show unarchive prompt for non-archived guest', async () => {
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /saveTheDateSent/i }))
    await waitFor(() => expect(updateDoc).toHaveBeenCalled())
    expect(screen.queryByText(/unarchive/i)).not.toBeInTheDocument()
  })

  // --- Group toggle ---

  it('shows adult/kid steppers when Family / Group is toggled on', () => {
    renderSheet()
    // The toggle button renders the Family/Group row
    fireEvent.click(screen.getByText(/Family \/ Group/i))
    expect(screen.getByText('Adults')).toBeInTheDocument()
    expect(screen.getByText('Kids')).toBeInTheDocument()
  })

  // --- Weight override ---

  it('reveals weight input when Edit is clicked', () => {
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  it('resets weight override when reset is clicked', async () => {
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
  })

  // --- Delete ---

  it('calls deleteDoc when Delete guest is confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /delete guest/i }))
    await waitFor(() => expect(deleteDoc).toHaveBeenCalled())
  })

  it('does not call deleteDoc when Delete is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /delete guest/i }))
    await waitFor(() => expect(deleteDoc).not.toHaveBeenCalled())
  })
})
