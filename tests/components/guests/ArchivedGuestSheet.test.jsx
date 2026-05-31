import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/firestore', () => ({
  doc: vi.fn().mockReturnValue({}),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn().mockReturnValue('ts'),
}))
vi.mock('../../../src/firebase.js', () => ({ db: {} }))

import { updateDoc } from 'firebase/firestore'
import ArchivedGuestSheet from '../../../src/components/guests/ArchivedGuestSheet.jsx'

const tags = [{ id: 't1', name: 'Family', color: '#e8f4e8', weights: {} }]
const guests = [
  { id: 'g1', name: 'Alice', tags: ['t1'], weight: 8, archived: true, isGroup: false,
    rsvp: { hansen: {}, lavita: {}, confirmed: false } },
  { id: 'g2', name: 'Bob', tags: [], weight: 5, archived: true, isGroup: false,
    rsvp: { hansen: {}, lavita: {}, confirmed: false } },
]

describe('ArchivedGuestSheet', () => {
  beforeEach(() => { updateDoc.mockClear() })

  it('renders archived guest names', () => {
    render(<ArchivedGuestSheet guests={guests} tags={tags} open={true} onClose={() => {}} readOnly={false} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('shows empty state when no archived guests', () => {
    render(<ArchivedGuestSheet guests={[]} tags={tags} open={true} onClose={() => {}} readOnly={false} />)
    expect(screen.getByText(/no archived guests/i)).toBeInTheDocument()
  })

  it('enters selection mode when Select tapped', () => {
    render(<ArchivedGuestSheet guests={guests} tags={tags} open={true} onClose={() => {}} readOnly={false} />)
    fireEvent.click(screen.getByRole('button', { name: /select/i }))
    expect(screen.getAllByRole('checkbox').length).toBe(2)
  })

  it('calls updateDoc with archived:false when Unarchive applied to selected guests', async () => {
    render(<ArchivedGuestSheet guests={guests} tags={tags} open={true} onClose={() => {}} readOnly={false} />)
    fireEvent.click(screen.getByRole('button', { name: /select/i }))
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    fireEvent.click(screen.getByRole('button', { name: /unarchive/i }))
    await vi.waitFor(() => expect(updateDoc).toHaveBeenCalledOnce())
    expect(updateDoc).toHaveBeenCalledWith({}, expect.objectContaining({ archived: false }))
  })

  it('hides Select button in readOnly mode', () => {
    render(<ArchivedGuestSheet guests={guests} tags={tags} open={true} onClose={() => {}} readOnly={true} />)
    expect(screen.queryByRole('button', { name: /select/i })).not.toBeInTheDocument()
  })
})
