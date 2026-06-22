import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/firestore', () => ({
  doc: vi.fn().mockReturnValue({}),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn().mockReturnValue('ts'),
}))
vi.mock('../../../src/firebase.js', () => ({ db: {} }))

import { updateDoc } from 'firebase/firestore'
import GuestEditSheet from '../../../src/components/guests/GuestEditSheet.jsx'

const tags = []
const archivedGuest = {
  id: 'g1',
  name: 'Alice',
  tags: [],
  weight: 8,
  archived: true,
  isGroup: false,
  ownerRole: 'hansen',
  rsvp: { hansen: { saveTheDateSent: false, inviteSent: false }, lavita: { saveTheDateSent: false, inviteSent: false }, confirmed: false },
}
const activeGuest = { ...archivedGuest, archived: false }

describe('GuestEditSheet RSVP on archived guest', () => {
  beforeEach(() => { updateDoc.mockClear() })

  it('shows unarchive prompt after RSVP toggle on archived guest', async () => {
    render(<GuestEditSheet guest={archivedGuest} tags={tags} userId="u1" role="hansen" open={true} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /saveTheDateSent/i }))
    await waitFor(() => expect(screen.getByText(/unarchive them\?/i)).toBeInTheDocument())
  })

  it('calls updateDoc with archived:false when Unarchive clicked', async () => {
    render(<GuestEditSheet guest={archivedGuest} tags={tags} userId="u1" role="hansen" open={true} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /saveTheDateSent/i }))
    await waitFor(() => screen.getByText(/unarchive them/i))
    fireEvent.click(screen.getByRole('button', { name: /^unarchive$/i }))
    await waitFor(() => expect(updateDoc).toHaveBeenCalledWith({}, expect.objectContaining({ archived: false })))
  })

  it('does not show unarchive prompt for non-archived guest', async () => {
    render(<GuestEditSheet guest={activeGuest} tags={tags} userId="u1" role="hansen" open={true} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /saveTheDateSent/i }))
    await waitFor(() => expect(updateDoc).toHaveBeenCalled())
    expect(screen.queryByText(/unarchive/i)).not.toBeInTheDocument()
  })
})
