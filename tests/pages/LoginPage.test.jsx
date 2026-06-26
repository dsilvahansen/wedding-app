import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

// --- AuthContext mock ---
// The factory is called once, so we expose the mock functions via the module-level
// object so tests can override them via mockImplementation / mockRejectedValue etc.
const mockAuth = {
  login: vi.fn(),
  user: null,
  loading: false,
}

vi.mock('../../src/contexts/AuthContext.jsx', () => ({
  useAuthContext: () => mockAuth,
}))

// LoginPage redirects to '/' when already logged in; MemoryRouter is needed for <Navigate>.
import LoginPage from '../../src/pages/LoginPage.jsx'

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockAuth.login = vi.fn()
    mockAuth.user = null
    mockAuth.loading = false
  })

  it('renders email and password inputs', () => {
    renderLogin()
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
  })

  it('renders the Sign In button', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('updates email and password state on input', () => {
    renderLogin()
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'h@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'pass123' } })
    expect(screen.getByPlaceholderText(/email/i).value).toBe('h@test.com')
    expect(screen.getByPlaceholderText(/password/i).value).toBe('pass123')
  })

  it('calls login with email and password on form submit', async () => {
    mockAuth.login = vi.fn().mockResolvedValue({})
    renderLogin()
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'h@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'pass123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(mockAuth.login).toHaveBeenCalledWith('h@test.com', 'pass123'))
  })

  it('shows error message when login fails', async () => {
    mockAuth.login = vi.fn().mockRejectedValue(new Error('auth/wrong-password'))
    renderLogin()
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'bad@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument())
  })

  it('clears error on the next submit attempt', async () => {
    // Assign a single mock that fails first, then resolves
    mockAuth.login = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({})

    renderLogin()
    // Fill fields so form can submit
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'bad@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrong' } })

    // First submit → error should appear
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => screen.getByText(/invalid email or password/i))

    // Second submit → handleSubmit calls setError('') first, clearing the error
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(screen.queryByText(/invalid email or password/i)).not.toBeInTheDocument())
  })
})
