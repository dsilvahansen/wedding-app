import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
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
})
