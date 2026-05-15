import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import GuestRow from '../../../src/components/ui/GuestRow.jsx'

const guest = {
  id: 'g1',
  name: 'John Smith',
  tags: ['t1'],
  weight: 8,
  rsvp: {
    hansen: { saveTheDateSent: false, inviteSent: false },
    lavita: { saveTheDateSent: false, inviteSent: false },
    confirmed: false,
  },
  ownerId: 'u1',
}
const tags = [{ id: 't1', name: 'Family', color: '#e8f4e8', createdByInitial: 'H', weights: {} }]

describe('GuestRow', () => {
  it('renders guest name', () => {
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} />)
    expect(screen.getByText('John Smith')).toBeInTheDocument()
  })

  it('renders weight', () => {
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} />)
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('calls onRsvpToggle with guest id and field when RSVP icon clicked', () => {
    const onRsvpToggle = vi.fn()
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={onRsvpToggle} onEdit={() => {}} />)
    fireEvent.click(screen.getByTitle('Save the date'))
    expect(onRsvpToggle).toHaveBeenCalledWith('g1', 'saveTheDateSent')
  })

  it('does not call onEdit when readOnly is true', () => {
    const onEdit = vi.fn()
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={true} onRsvpToggle={() => {}} onEdit={onEdit} />)
    fireEvent.click(screen.getByText('John Smith'))
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('renders name with headcount for group guest', () => {
    const groupGuest = {
      ...guest,
      name: 'Smith family',
      isGroup: true,
      adultCount: 2,
      kidCount: 1,
    }
    render(<GuestRow guest={groupGuest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} />)
    expect(screen.getByText('Smith family')).toBeInTheDocument()
    expect(screen.getByText('(3)')).toBeInTheDocument()
  })

  it('does not render count for non-group guest', () => {
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} />)
    expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument()
  })
})
