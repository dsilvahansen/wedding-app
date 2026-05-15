import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TagPill from '../../../src/components/ui/TagPill.jsx'

describe('TagPill', () => {
  it('renders tag name', () => {
    render(<TagPill tag={{ id: 't1', name: 'Family', color: '#e8f4e8', createdByInitial: 'H' }} />)
    expect(screen.getByText('Family')).toBeInTheDocument()
  })

  it('shows H/L superscript', () => {
    render(<TagPill tag={{ id: 't1', name: 'Family', color: '#e8f4e8', createdByInitial: 'H' }} />)
    expect(screen.getByText('H')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<TagPill tag={{ id: 't1', name: 'Family', color: '#e8f4e8', createdByInitial: 'H' }} onClick={onClick} />)
    fireEvent.click(screen.getByText('Family').closest('button'))
    expect(onClick).toHaveBeenCalled()
  })

  it('applies selected style when selected is true', () => {
    const { container } = render(<TagPill tag={{ id: 't1', name: 'Family', color: '#e8f4e8', createdByInitial: 'H' }} selected={true} />)
    const btn = container.querySelector('button')
    expect(btn.style.backgroundColor).toBe('rgb(155, 89, 182)')
  })
})
