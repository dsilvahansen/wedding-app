import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders guest name', () => {
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} />)
    expect(screen.getByText('John Smith')).toBeInTheDocument()
  })

  it('renders weight', () => {
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} />)
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('calls onRsvpToggle with guest id and field when RSVP dot clicked', () => {
    const onRsvpToggle = vi.fn()
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={onRsvpToggle} onEdit={() => {}} />)
    fireEvent.click(screen.getByTitle('STD'))
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

  it('shows checkbox and read-only status dots in selectionMode', () => {
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} selectionMode={true} selected={false} />)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    // Status dots are present but disabled in select mode
    expect(screen.getByTitle('STD')).toBeDisabled()
  })

  it('checkbox is checked when selected=true', () => {
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} selectionMode={true} selected={true} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('calls onEdit when row clicked in selectionMode', () => {
    const onEdit = vi.fn()
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={onEdit} selectionMode={true} selected={false} />)
    fireEvent.click(screen.getByText('John Smith'))
    expect(onEdit).toHaveBeenCalled()
  })

  it('calls onLongPress after 500ms hold', async () => {
    const onLongPress = vi.fn()
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} onLongPress={onLongPress} />)
    const row = screen.getByText('John Smith').closest('div[data-testid="guest-row"]')
    fireEvent.mouseDown(row)
    await vi.advanceTimersByTimeAsync(500)
    expect(onLongPress).toHaveBeenCalled()
  })

  it('does not call onLongPress if released before 500ms', async () => {
    const onLongPress = vi.fn()
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} onLongPress={onLongPress} />)
    const row = screen.getByText('John Smith').closest('div[data-testid="guest-row"]')
    fireEvent.mouseDown(row)
    await vi.advanceTimersByTimeAsync(200)
    fireEvent.mouseUp(row)
    await vi.advanceTimersByTimeAsync(500)
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('calls onLongPress after 500ms touch hold', async () => {
    const onLongPress = vi.fn()
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} onLongPress={onLongPress} />)
    const row = screen.getByText('John Smith').closest('div[data-testid="guest-row"]')
    fireEvent.touchStart(row, { touches: [{}] })
    await vi.advanceTimersByTimeAsync(500)
    expect(onLongPress).toHaveBeenCalled()
  })

  it('does not call onLongPress if touch released before 500ms', async () => {
    const onLongPress = vi.fn()
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} onLongPress={onLongPress} />)
    const row = screen.getByText('John Smith').closest('div[data-testid="guest-row"]')
    fireEvent.touchStart(row, { touches: [{}] })
    await vi.advanceTimersByTimeAsync(200)
    fireEvent.touchEnd(row)
    await vi.advanceTimersByTimeAsync(500)
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('cancels long-press on touchcancel', async () => {
    const onLongPress = vi.fn()
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={() => {}} onLongPress={onLongPress} />)
    const row = screen.getByText('John Smith').closest('div[data-testid="guest-row"]')
    fireEvent.touchStart(row, { touches: [{}] })
    await vi.advanceTimersByTimeAsync(200)
    fireEvent.touchCancel(row)
    await vi.advanceTimersByTimeAsync(500)
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('does not call onEdit when long-press activated', async () => {
    const onEdit = vi.fn()
    const onLongPress = vi.fn()
    render(<GuestRow guest={guest} tags={tags} currentRole="hansen" readOnly={false} onRsvpToggle={() => {}} onEdit={onEdit} onLongPress={onLongPress} />)
    const row = screen.getByText('John Smith').closest('div[data-testid="guest-row"]')
    fireEvent.mouseDown(row)
    await vi.advanceTimersByTimeAsync(500)
    fireEvent.click(row)
    expect(onLongPress).toHaveBeenCalled()
    expect(onEdit).not.toHaveBeenCalled()
  })
})
