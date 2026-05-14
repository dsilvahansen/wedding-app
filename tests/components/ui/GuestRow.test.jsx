import { render, screen } from '@testing-library/react'
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
})
