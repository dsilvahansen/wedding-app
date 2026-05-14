import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RsvpIcons from '../../../src/components/ui/RsvpIcons.jsx'

const baseRsvp = {
  hansen: { saveTheDateSent: true, inviteSent: false },
  lavita: { saveTheDateSent: false, inviteSent: false },
  confirmed: false,
}

describe('RsvpIcons', () => {
  it('renders 3 icons', () => {
    render(<RsvpIcons rsvp={baseRsvp} currentRole="hansen" readOnly={true} onToggle={() => {}} />)
    expect(screen.getByTitle('Save the date')).toBeInTheDocument()
    expect(screen.getByTitle('Invite')).toBeInTheDocument()
    expect(screen.getByTitle('Confirmed')).toBeInTheDocument()
  })

  it('calls onToggle with correct field when save-the-date icon clicked', () => {
    const onToggle = vi.fn()
    render(<RsvpIcons rsvp={baseRsvp} currentRole="hansen" readOnly={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByTitle('Save the date'))
    expect(onToggle).toHaveBeenCalledWith('saveTheDateSent')
  })

  it('calls onToggle with confirmed when confirmed icon clicked', () => {
    const onToggle = vi.fn()
    render(<RsvpIcons rsvp={baseRsvp} currentRole="hansen" readOnly={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByTitle('Confirmed'))
    expect(onToggle).toHaveBeenCalledWith('confirmed')
  })
})
