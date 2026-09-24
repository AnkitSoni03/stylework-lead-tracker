import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { jsonResponse, makeLead, mockFetch } from './test/utils'
import type { Lead, LeadStatus } from './types'

const leads = [
  makeLead({ id: 'a', name: 'Amit Verma', email: 'amit@acme.com' }),
  makeLead({ id: 'b', name: 'Neha Gupta', email: 'neha@globex.com', status: 'contacted' }),
]

function statsFor(list: Lead[]) {
  const byStatus: Record<LeadStatus, number> = { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 }
  for (const l of list) byStatus[l.status]++
  return { total: list.length, byStatus }
}

function listResponse(list: Lead[]) {
  return jsonResponse({ data: list, total: list.length, page: 1, limit: 10 })
}

const isStats = (url: URL) => url.pathname.endsWith('/stats')

describe('App', () => {
  it('loads and lists leads', async () => {
    mockFetch((url) => (isStats(url) ? jsonResponse(statsFor(leads)) : listResponse(leads)))
    render(<App />)

    expect(await screen.findByText('Amit Verma')).toBeInTheDocument()
    expect(screen.getByText('Neha Gupta')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent('Showing 1–2 of 2')
  })

  it('shows pipeline counts and filters by status when a card is clicked', async () => {
    const fetchSpy = mockFetch((url) => (isStats(url) ? jsonResponse(statsFor(leads)) : listResponse(leads)))
    render(<App />)

    const summary = await screen.findByLabelText('Pipeline summary')
    const contactedCard = within(summary).getByRole('button', { name: /Contacted/ })
    await waitFor(() => expect(contactedCard).toHaveTextContent('1'))
    expect(within(summary).getByRole('button', { name: /All leads/ })).toHaveTextContent('2')

    await userEvent.click(contactedCard)

    expect(contactedCard).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Filter by status')).toHaveValue('contacted')
    await waitFor(() => {
      const lastList = fetchSpy.mock.calls.map(([u]) => new URL(String(u))).filter((u) => !isStats(u)).at(-1)
      expect(lastList?.searchParams.get('status')).toBe('contacted')
    })
  })

  it('shows an empty state when there are no leads', async () => {
    mockFetch((url) => (isStats(url) ? jsonResponse(statsFor([])) : listResponse([])))
    render(<App />)

    expect(await screen.findByText('No leads yet')).toBeInTheDocument()
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
      if (isStats(url)) return jsonResponse(statsFor(leads))
      const search = url.searchParams.get('search')
      return listResponse(search ? leads.filter((l) => l.name.toLowerCase().includes(search)) : leads)
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

  it('updates a lead status via PATCH and confirms with a toast', async () => {
    const fetchSpy = mockFetch((url, init) => {
      if (init?.method === 'PATCH') return jsonResponse({ ...leads[0], status: 'qualified' })
      return isStats(url) ? jsonResponse(statsFor(leads)) : listResponse(leads)
    })
    render(<App />)
    const select = await screen.findByLabelText('Status for Amit Verma')

    await userEvent.selectOptions(select, 'qualified')

    await waitFor(() => expect(select).toHaveValue('qualified'))
    const patchCall = fetchSpy.mock.calls.find(([, init]) => init?.method === 'PATCH')
    expect(String(patchCall?.[0])).toMatch(/\/api\/leads\/a\/status$/)
    expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({ status: 'qualified' })
    expect(await screen.findByText('Amit Verma moved to Qualified')).toBeInTheDocument()
  })

  it('rolls back the status and shows an error if the update fails', async () => {
    mockFetch((url, init) => {
      if (init?.method === 'PATCH') return jsonResponse({ error: 'Lead not found' }, 404)
      return isStats(url) ? jsonResponse(statsFor(leads)) : listResponse(leads)
    })
    render(<App />)
    const select = await screen.findByLabelText('Status for Amit Verma')

    await userEvent.selectOptions(select, 'lost')

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not update status: Lead not found')
    expect(select).toHaveValue('new')
  })

  it('adds a new lead from the modal and refreshes the list', async () => {
    let stored = [...leads]
    mockFetch(async (url, init) => {
      if (init?.method === 'POST') {
        const created = makeLead({ id: 'c', ...JSON.parse(String(init.body)) })
        stored = [created, ...stored]
        return jsonResponse(created, 201)
      }
      return isStats(url) ? jsonResponse(statsFor(stored)) : listResponse(stored)
    })
    render(<App />)
    await screen.findByText('Amit Verma')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'New lead' }))
    const dialog = screen.getByRole('dialog', { name: 'New lead' })
    expect(within(dialog).getByLabelText('Name')).toHaveFocus()

    await user.type(within(dialog).getByLabelText('Name'), 'Rohan Mehta')
    await user.type(within(dialog).getByLabelText('Email'), 'rohan@acme.com')
    await user.type(within(dialog).getByLabelText('Phone'), '9111111113')
    await user.click(within(dialog).getByRole('button', { name: 'Add lead' }))

    expect(await screen.findByText('Rohan Mehta')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Rohan Mehta was added')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent('Showing 1–3 of 3')
  })

  it('closes the modal with Escape', async () => {
    mockFetch((url) => (isStats(url) ? jsonResponse(statsFor(leads)) : listResponse(leads)))
    render(<App />)
    await screen.findByText('Amit Verma')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'New lead' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
