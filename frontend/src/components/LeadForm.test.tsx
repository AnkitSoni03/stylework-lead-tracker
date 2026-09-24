import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LeadForm } from './LeadForm'
import { jsonResponse, makeLead, mockFetch } from '../test/utils'

async function fillForm(name: string, email: string, phone: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Name'), name)
  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Phone'), phone)
  await user.click(screen.getByRole('button', { name: 'Add lead' }))
}

describe('LeadForm', () => {
  it('shows validation errors and does not call the API for invalid input', async () => {
    const fetchSpy = mockFetch(() => jsonResponse({}))
    render(<LeadForm onCreated={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Add lead' }))

    expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid phone number')).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('submits a valid lead, clears the form and notifies the parent', async () => {
    const created = makeLead()
    const fetchSpy = mockFetch(() => jsonResponse(created, 201))
    const onCreated = vi.fn()
    render(<LeadForm onCreated={onCreated} />)

    await fillForm('Priya Sharma', 'priya@example.com', '+91 98765 43210')

    expect(fetchSpy).toHaveBeenCalledOnce()
    const [url, init] = fetchSpy.mock.calls[0]
    expect(String(url)).toMatch(/\/api\/leads$/)
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      name: 'Priya Sharma',
      email: 'priya@example.com',
      phone: '+91 98765 43210',
    })
    expect(onCreated).toHaveBeenCalledWith(created)
    expect(screen.getByLabelText('Name')).toHaveValue('')
  })

  it('shows the server error when the email already exists', async () => {
    mockFetch(() => jsonResponse({ error: 'A lead with this email already exists' }, 409))
    const onCreated = vi.fn()
    render(<LeadForm onCreated={onCreated} />)

    await fillForm('Priya Sharma', 'priya@example.com', '9876543210')

    expect(await screen.findByRole('alert')).toHaveTextContent('A lead with this email already exists')
    expect(onCreated).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Email')).toHaveValue('priya@example.com')
  })

  it('maps server field errors onto the matching inputs', async () => {
    mockFetch(() =>
      jsonResponse(
        { error: 'Validation failed', details: [{ field: 'phone', message: 'Invalid phone number' }] },
        400,
      ),
    )
    render(<LeadForm onCreated={vi.fn()} />)

    await fillForm('Priya Sharma', 'priya@example.com', '9876543210')

    expect(await screen.findByText('Invalid phone number')).toBeInTheDocument()
    expect(screen.getByLabelText('Phone')).toHaveAttribute('aria-invalid', 'true')
  })
})
