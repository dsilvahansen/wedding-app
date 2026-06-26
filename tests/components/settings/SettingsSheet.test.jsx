import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Module mocks ---
vi.mock('../../../src/lib/excelUtils.js', () => ({
  buildWorkbook: vi.fn().mockReturnValue({}),
  buildSampleWorkbook: vi.fn().mockReturnValue({}),
  downloadWorkbook: vi.fn(),
}))
vi.mock('../../../src/components/ui/BottomSheet.jsx', () => ({
  default: ({ open, children, title }) => open ? <div><h2>{title}</h2>{children}</div> : null,
}))
vi.mock('../../../src/lib/guestUtils.js', () => ({
  isContributor: vi.fn(role => role === 'hContributor' || role === 'lContributor'),
}))

import SettingsSheet from '../../../src/components/settings/SettingsSheet.jsx'
import { downloadWorkbook, buildWorkbook, buildSampleWorkbook } from '../../../src/lib/excelUtils.js'

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  guests: [],
  tags: [],
  userId: 'u1',
  role: 'hansen',
  onImportFile: vi.fn(),
}

describe('SettingsSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    defaultProps.onClose = vi.fn()
    defaultProps.onImportFile = vi.fn()
  })

  it('renders Export Excel button', () => {
    render(<SettingsSheet {...defaultProps} />)
    expect(screen.getByRole('button', { name: /export excel/i })).toBeInTheDocument()
  })

  it('renders Import Excel button for owner roles', () => {
    render(<SettingsSheet {...defaultProps} role="hansen" />)
    expect(screen.getByRole('button', { name: /import excel/i })).toBeInTheDocument()
  })

  it('hides Import Excel button for contributor roles', () => {
    render(<SettingsSheet {...defaultProps} role="hContributor" />)
    expect(screen.queryByRole('button', { name: /import excel/i })).not.toBeInTheDocument()
  })

  it('renders Download Sample Template button', () => {
    render(<SettingsSheet {...defaultProps} />)
    expect(screen.getByRole('button', { name: /sample template/i })).toBeInTheDocument()
  })

  it('calls downloadWorkbook and onClose when Export Excel is clicked', () => {
    render(<SettingsSheet {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /export excel/i }))
    expect(buildWorkbook).toHaveBeenCalled()
    expect(downloadWorkbook).toHaveBeenCalled()
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('calls buildSampleWorkbook and downloadWorkbook for sample download', () => {
    render(<SettingsSheet {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /sample template/i }))
    expect(buildSampleWorkbook).toHaveBeenCalled()
    expect(downloadWorkbook).toHaveBeenCalledWith(expect.anything(), 'wedding-guests-sample.xlsx')
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('does not render when open=false', () => {
    render(<SettingsSheet {...defaultProps} open={false} />)
    expect(screen.queryByText(/export excel/i)).not.toBeInTheDocument()
  })
})
