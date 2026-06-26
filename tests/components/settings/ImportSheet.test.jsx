import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Firebase mocks ---
vi.mock('../../../src/firebase.js', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn().mockReturnValue({}),
  doc: vi.fn().mockReturnValue({ id: 'new-id' }),
  writeBatch: vi.fn().mockReturnValue({
    set: vi.fn(),
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  }),
  serverTimestamp: vi.fn().mockReturnValue('ts'),
}))

// --- BottomSheet passthrough ---
vi.mock('../../../src/components/ui/BottomSheet.jsx', () => ({
  default: ({ open, children, title }) => open ? <div><h2>{title}</h2>{children}</div> : null,
}))

// --- excelUtils mocks ---
// parseWorkbookFromFile: returns a fixture; tests can override this per-case.
let parseResult = {
  guestRows: [{ Name: 'Alice', Owner: 'hansen', Tags: '', Group: 'no', Adults: '', Kids: '', 'Group Notes': '', 'STD Sent (Hansen)': 'no', 'Invite Sent (Hansen)': 'no', 'STD Sent (Lavita)': 'no', 'Invite Sent (Lavita)': 'no', Confirmed: 'no', Archived: 'no' }],
  tagRows: [],
}
vi.mock('../../../src/lib/excelUtils.js', () => ({
  parseWorkbookFromFile: vi.fn(() => Promise.resolve(parseResult)),
  sheetDataToGuests: vi.fn(() => ({
    toAdd: [{ name: 'Alice', ownerRole: 'hansen', tags: [], rsvp: { hansen: {}, lavita: {}, confirmed: false } }],
    toUpdate: [],
    errors: [],
    warnings: [],
  })),
  sheetDataToTags: vi.fn(() => ({ toCreate: [], toUpdate: [], errors: [] })),
}))

import ImportSheet from '../../../src/components/settings/ImportSheet.jsx'
import { writeBatch } from 'firebase/firestore'

const defaultFile = new File(['data'], 'import.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
const defaultProps = {
  file: defaultFile,
  guests: [],
  tags: [],
  userId: 'u1',
  onClose: vi.fn(),
  onSuccess: vi.fn(),
}

describe('ImportSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    defaultProps.onClose = vi.fn()
    defaultProps.onSuccess = vi.fn()
  })

  it('shows "Parsing file…" before parse completes', async () => {
    // Delay resolution so we can catch the loading state
    const { parseWorkbookFromFile } = await import('../../../src/lib/excelUtils.js')
    parseWorkbookFromFile.mockReturnValueOnce(new Promise(() => {})) // never resolves

    render(<ImportSheet {...defaultProps} />)
    expect(screen.getByText(/parsing file/i)).toBeInTheDocument()
  })

  it('renders preview with Add/Update/Errors sections after parse', async () => {
    render(<ImportSheet {...defaultProps} />)
    // Wait for the useEffect to fire and preview to appear
    await waitFor(() => expect(screen.getByText('Tags')).toBeInTheDocument())
    expect(screen.getByText('Guests')).toBeInTheDocument()
    // Add, Update, Errors labels appear in both Tags and Guests sections
    expect(screen.getAllByText('Add').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Update').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Errors').length).toBeGreaterThan(0)
  })

  it('shows count 1 for Add in Guests section', async () => {
    render(<ImportSheet {...defaultProps} />)
    await waitFor(() => screen.getByText(/guests/i))
    // The Add card shows a large "1" count
    const counts = screen.getAllByText('1')
    expect(counts.length).toBeGreaterThan(0)
  })

  it('calls onClose when Cancel is clicked', async () => {
    render(<ImportSheet {...defaultProps} />)
    await waitFor(() => screen.getByRole('button', { name: /cancel/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('calls writeBatch().commit() and onSuccess when Confirm Import is clicked', async () => {
    render(<ImportSheet {...defaultProps} />)
    await waitFor(() => screen.getByRole('button', { name: /confirm import/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirm import/i }))
    await waitFor(() => expect(defaultProps.onSuccess).toHaveBeenCalledWith({
      added: 1,
      updated: 0,
      tagsCreated: 0,
      tagsUpdated: 0,
    }))
  })

  it('disables Confirm Import when there are no changes to apply', async () => {
    const { sheetDataToGuests, sheetDataToTags } = await import('../../../src/lib/excelUtils.js')
    // Return empty preview — nothing to do
    sheetDataToGuests.mockReturnValueOnce({ toAdd: [], toUpdate: [], errors: [], warnings: [] })
    sheetDataToTags.mockReturnValueOnce({ toCreate: [], toUpdate: [], errors: [] })

    render(<ImportSheet {...defaultProps} />)
    await waitFor(() => screen.getByRole('button', { name: /confirm import/i }))
    expect(screen.getByRole('button', { name: /confirm import/i })).toBeDisabled()
  })

  it('shows parse error message when file parsing fails', async () => {
    const { parseWorkbookFromFile } = await import('../../../src/lib/excelUtils.js')
    parseWorkbookFromFile.mockRejectedValueOnce(new Error('Corrupt file'))

    render(<ImportSheet {...defaultProps} />)
    await waitFor(() => expect(screen.getByText(/corrupt file/i)).toBeInTheDocument())
  })
})
