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
    // selected guests (Alice, Charlie) are sorted to top
    expect(checkboxes[0].checked).toBe(true)  // Alice or Charlie
    expect(checkboxes[1].checked).toBe(true)  // Alice or Charlie
    expect(checkboxes[2].checked).toBe(false) // Bob
  })

  it('shows group headcount for group guests', () => {
    render(<GuestTagAssignSheet tag={tag} guests={guests} open={true} onClose={() => {}} />)
    expect(screen.getByText(/3 people/i)).toBeInTheDocument()
  })

  it('toggling a checkbox changes its checked state', () => {
    render(<GuestTagAssignSheet tag={tag} guests={guests} open={true} onClose={() => {}} />)
    // Bob is unselected and sorted to bottom (index 2)
    const checkboxes = screen.getAllByRole('checkbox')
    const bobCheckbox = checkboxes[2]
    expect(bobCheckbox.checked).toBe(false)
    fireEvent.click(bobCheckbox)
    expect(bobCheckbox.checked).toBe(true)
  })

  it('filters guests by search input', () => {
    render(<GuestTagAssignSheet tag={tag} guests={guests} open={true} onClose={() => {}} />)
    const searchInput = screen.getByPlaceholderText(/search guests/i)
    fireEvent.change(searchInput, { target: { value: 'ali' } })
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.queryByText('Bob')).not.toBeInTheDocument()
    expect(screen.queryByText('Charlie')).not.toBeInTheDocument()
  })

  it('shows selected guests before unselected', () => {
    render(<GuestTagAssignSheet tag={tag} guests={guests} open={true} onClose={() => {}} />)
    const names = screen.getAllByRole('checkbox').map(cb => cb.closest('label').textContent.trim())
    // Alice and Charlie (selected) come before Bob (unselected)
    expect(names.indexOf('Bob')).toBeGreaterThan(names.indexOf('Alice'))
    expect(names.indexOf('Bob')).toBeGreaterThan(names.indexOf('Charlie'))
  })

  it('save calls updateDoc only for changed guests', async () => {
    render(<GuestTagAssignSheet tag={tag} guests={guests} open={true} onClose={() => {}} />)
    // Toggle Bob (unselected, at index 2): add tag1
    fireEvent.click(screen.getByText('Bob').closest('label').querySelector('input'))
    // Toggle Alice (selected, at index 0): remove tag1
    fireEvent.click(screen.getByText('Alice').closest('label').querySelector('input'))
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
    await Promise.resolve()
    expect(updateDoc).not.toHaveBeenCalled()
  })
})
