import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/firestore', () => ({
  doc: vi.fn().mockReturnValue({}),
  updateDoc: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../../src/firebase.js', () => ({ db: {} }))

import { doc as docFn, updateDoc } from 'firebase/firestore'
import GuestTagAssignSheet from '../../../src/components/guests/GuestTagAssignSheet.jsx'

const tag = { id: 'tag1', name: 'Family' }
const guests = [
  { id: 'g1', name: 'Alice', tags: ['tag1'], isGroup: false },
  { id: 'g2', name: 'Bob', tags: [], isGroup: false },
  { id: 'g3', name: 'Charlie', tags: ['tag1', 'tag2'], isGroup: true, adultCount: 2, kidCount: 1 },
]

describe('GuestTagAssignSheet', () => {
  beforeEach(() => { updateDoc.mockClear(); docFn.mockClear() })

  it('renders all guest names', () => {
    render(<GuestTagAssignSheet tag={tag} guests={guests} open={true} onClose={() => {}} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  it('pre-checks guests already in tag', () => {
    render(<GuestTagAssignSheet tag={tag} guests={guests} open={true} onClose={() => {}} />)
    const checkboxes = screen.getAllByRole('checkbox')
    // Alice (g1) has tag1 → checked
    expect(checkboxes[0].checked).toBe(true)
    // Bob (g2) does not → unchecked
    expect(checkboxes[1].checked).toBe(false)
    // Charlie (g3) has tag1 → checked
    expect(checkboxes[2].checked).toBe(true)
  })

  it('shows group headcount for group guests', () => {
    render(<GuestTagAssignSheet tag={tag} guests={guests} open={true} onClose={() => {}} />)
    expect(screen.getByText(/3 people/i)).toBeInTheDocument()
  })

  it('toggling a checkbox changes its checked state', () => {
    render(<GuestTagAssignSheet tag={tag} guests={guests} open={true} onClose={() => {}} />)
    const checkboxes = screen.getAllByRole('checkbox')
    // Bob was unchecked, click to check
    fireEvent.click(checkboxes[1])
    expect(checkboxes[1].checked).toBe(true)
  })

  it('save calls updateDoc only for changed guests', async () => {
    render(<GuestTagAssignSheet tag={tag} guests={guests} open={true} onClose={() => {}} />)
    const checkboxes = screen.getAllByRole('checkbox')
    // Toggle Bob: add tag1
    fireEvent.click(checkboxes[1])
    // Toggle Alice: remove tag1
    fireEvent.click(checkboxes[0])
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await vi.waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(2))
    // Bob: tags should now include tag1
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { tags: ['tag1'] }
    )
    // Alice: tags should not include tag1
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { tags: [] }
    )
  })

  it('save does not call updateDoc if nothing changed', async () => {
    render(<GuestTagAssignSheet tag={tag} guests={guests} open={true} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await new Promise(r => setTimeout(r, 50))
    expect(updateDoc).not.toHaveBeenCalled()
  })
})
