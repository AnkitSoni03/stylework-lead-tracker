import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { jsonResponse, makeLead, mockFetch } from './test/utils'

const leads = [
  makeLead({ id: 'a', name: 'Amit Verma', email: 'amit@acme.com' }),
  makeLead({ id: 'b', name: 'Neha Gupta', email: 'neha@globex.com', status: 'contacted' }),
]

describe('App', () => {
  it('loads and lists leads', async () => {
    mockFetch(() => jsonResponse({ data: leads, total: 2, page: 1, limit: 10 }))
    render(<App />)

    expect(await screen.findByText('Amit Verma')).toBeInTheDocument()
    expect(screen.getByText('Neha Gupta')).toBeInTheDocument()
    expect(screen.getByText('Showing 1–2 of 2')).toBeInTheDocument()
  })

  it('shows an empty state when there are no leads', async () => {
    mockFetch(() => jsonResponse({ data: [], total: 0, page: 1, limit: 10 }))
    render(<App />)

    expect(await screen.findByText('No leads yet. Add your first lead above.')).toBeInTheDocument()
  })

  it('shows an error when the API is unreachable', async () => {
    mockFetch(() => {
      throw new TypeError('Failed to fetch')
    })
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server')
  })

  it('sends the search term and status filter to the API', async () => {
    const fetchSpy = mockFetch((url) => {
      const search = url.searchParams.get('search')
      const data = search ? leads.filter((l) => l.name.toLowerCase().includes(search)) : leads
      return jsonResponse({ data, total: data.length, page: 1, limit: 10 })
    })
    render(<App />)
    await screen.findByText('Amit Verma')

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Search leads'), 'neha')
    await waitFor(() => expect(screen.queryByText('Amit Verma')).not.toBeInTheDocument())
    expect(screen.getByText('Neha Gupta')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Filter by status'), 'contacted')
    await waitFor(() => {
      const lastUrl = new URL(String(fetchSpy.mock.lastCall?.[0]))
      expect(lastUrl.searchParams.get('status')).toBe('contacted')
      expect(lastUrl.searchParams.get('search')).toBe('neha')
    })
  })

  it('updates a lead status via PATCH', async () => {
    const fetchSpy = mockFetch((_url, init) => {
      if (init?.method === 'PATCH') {
        return jsonResponse({ ...leads[0], status: 'qualified' })
      }
      return jsonResponse({ data: leads, total: 2, page: 1, limit: 10 })
    })
    render(<App />)
    const select = await screen.findByLabelText('Status for Amit Verma')

    await userEvent.selectOptions(select, 'qualified')

    await waitFor(() => expect(select).toHaveValue('qualified'))
    const patchCall = fetchSpy.mock.calls.find(([, init]) => init?.method === 'PATCH')
    expect(String(patchCall?.[0])).toMatch(/\/api\/leads\/a\/status$/)
    expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({ status: 'qualified' })
  })

  it('rolls back the status and shows an error if the update fails', async () => {
    mockFetch((_url, init) => {
      if (init?.method === 'PATCH') return jsonResponse({ error: 'Lead not found' }, 404)
      return jsonResponse({ data: leads, total: 2, page: 1, limit: 10 })
    })
    render(<App />)
    const select = await screen.findByLabelText('Status for Amit Verma')

    await userEvent.selectOptions(select, 'lost')

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not update status: Lead not found')
    expect(select).toHaveValue('new')
  })

  it('adds a new lead and refreshes the list', async () => {
    let stored = [...leads]
    mockFetch(async (_url, init) => {
      if (init?.method === 'POST') {
        const created = makeLead({ id: 'c', ...JSON.parse(String(init.body)) })
        stored = [created, ...stored]
        return jsonResponse(created, 201)
      }
      return jsonResponse({ data: stored, total: stored.length, page: 1, limit: 10 })
    })
    render(<App />)
    await screen.findByText('Amit Verma')

    const user = userEvent.setup()
    const form = screen.getByRole('form', { name: 'Add lead' })
    await user.type(within(form).getByLabelText('Name'), 'Rohan Mehta')
    await user.type(within(form).getByLabelText('Email'), 'rohan@acme.com')
    await user.type(within(form).getByLabelText('Phone'), '9111111113')
    await user.click(within(form).getByRole('button', { name: 'Add lead' }))

    expect(await screen.findByText('Rohan Mehta')).toBeInTheDocument()
    expect(screen.getByText('Showing 1–3 of 3')).toBeInTheDocument()
  })
})
