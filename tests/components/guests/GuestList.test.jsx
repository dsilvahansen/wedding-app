import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../src/hooks/useAuth.js', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, role: 'hansen' }),
}))
vi.mock('../../../src/hooks/useGuests.js', () => ({
  useGuests: () => ({
    guests: [
      { id: 'g1', name: 'Alice', ownerRole: 'hansen', tags: [], weight: 8,
        rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
      { id: 'g2', name: 'Bob', ownerRole: 'hansen', tags: [], weight: 5, archived: true,
        rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false } },
    ],
  }),
}))
vi.mock('../../../src/hooks/useTags.js', () => ({
  useTags: () => ({ tags: [] }),
}))
vi.mock('../../../src/hooks/useBulkSelect.js', () => ({
  useBulkSelect: () => ({
    selectionMode: false,
    selectedIds: new Set(),
    toggleSelectionMode: vi.fn(),
    toggleGuest: vi.fn(),
    applyBulkAction: vi.fn(),
    undoAvailable: false,
    undoBulkAction: vi.fn(),
  }),
}))
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(), serverTimestamp: vi.fn() }))
vi.mock('../../../src/firebase.js', () => ({ db: {} }))
vi.mock('../../../src/components/guests/ArchivedGuestSheet.jsx', () => ({
  default: ({ open }) => open ? <div>Archived Guests</div> : null,
}))

import GuestList from '../../../src/components/guests/GuestList.jsx'

describe('GuestList', () => {
  it('shows current user guests in My List', () => {
    render(<GuestList readOnly={false} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('shows partner guests in Their List (readOnly)', () => {
    render(<GuestList readOnly={true} />)
    // partner is lavita, no guests — shows empty state
    expect(screen.getByText(/no guests/i)).toBeInTheDocument()
  })

  it('shows count in header', () => {
    render(<GuestList readOnly={false} />)
    expect(screen.getByText(/my list \(1\)/i)).toBeInTheDocument()
  })

  it('hides archived guests from main list', () => {
    render(<GuestList readOnly={false} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.queryByText('Bob')).not.toBeInTheDocument()
  })

  it('excludes archived guests from headcount', () => {
    render(<GuestList readOnly={false} />)
    expect(screen.getByText(/my list \(1\)/i)).toBeInTheDocument()
  })

  it('shows Archived button when archived guests exist', () => {
    render(<GuestList readOnly={false} />)
    expect(screen.getByRole('button', { name: /archived \(1\)/i })).toBeInTheDocument()
  })

  it('does not show Archived button on partner list side', () => {
    render(<GuestList readOnly={true} />)
    expect(screen.queryByRole('button', { name: /archived/i })).not.toBeInTheDocument()
  })

  it('opens archived sheet when Archived button clicked', async () => {
    render(<GuestList readOnly={false} />)
    fireEvent.click(screen.getByRole('button', { name: /archived \(1\)/i }))
    expect(await screen.findByText(/archived guests/i)).toBeInTheDocument()
  })

  it('does not show Archive button when not in selection mode', () => {
    render(<GuestList readOnly={false} />)
    expect(screen.queryByRole('button', { name: /^archive$/i })).not.toBeInTheDocument()
  })
})
