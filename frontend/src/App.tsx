import { useEffect, useState } from 'react'
import { listLeads, updateLeadStatus } from './api'
import { LeadFilters } from './components/LeadFilters'
import { LeadForm } from './components/LeadForm'
import { LeadTable } from './components/LeadTable'
import { Pagination } from './components/Pagination'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import type { Lead, LeadStatus } from './types'

const PAGE_SIZE = 10

// Each result is tagged with the query that produced it, so "loading" can be
// derived (result key !== current query key) instead of set inside the effect.
interface LoadedPage {
  key: string
  leads: Lead[]
  total: number
}

interface LoadError {
  key: string
  message: string
}

export default function App() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<LeadStatus | ''>('')
  const [reloadKey, setReloadKey] = useState(0)
  const [result, setResult] = useState<LoadedPage | null>(null)
  const [loadError, setLoadError] = useState<LoadError | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())

  const debouncedSearch = useDebouncedValue(search.trim())
  const queryKey = JSON.stringify([debouncedSearch, status, page, reloadKey])

  useEffect(() => {
    const controller = new AbortController()

    listLeads(
      { search: debouncedSearch, status: status || undefined, page, limit: PAGE_SIZE },
      controller.signal,
    )
      .then((res) => setResult({ key: queryKey, leads: res.data, total: res.total }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setLoadError({
          key: queryKey,
          message: err instanceof Error ? err.message : 'Failed to load leads',
        })
      })

    return () => controller.abort()
  }, [debouncedSearch, status, page, reloadKey, queryKey])

  const leads = result?.leads ?? []
  const total = result?.total ?? 0
  const currentLoadError = loadError?.key === queryKey ? loadError.message : null
  const loading = result?.key !== queryKey && currentLoadError === null
  const error = actionError ?? currentLoadError
  const hasFilters = debouncedSearch !== '' || status !== ''

  // Any change to the search or filter starts again from the first page
  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleStatusFilterChange(value: LeadStatus | '') {
    setStatus(value)
    setPage(1)
  }

  function handleCreated() {
    setSearch('')
    setStatus('')
    setPage(1)
    setActionError(null)
    setReloadKey((k) => k + 1)
  }

  function replaceLead(id: string, patch: Partial<Lead>) {
    setResult((r) =>
      r && { ...r, leads: r.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)) },
    )
  }

  async function handleStatusChange(lead: Lead, next: LeadStatus) {
    const previous = lead.status
    setActionError(null)
    setUpdatingIds((ids) => new Set(ids).add(lead.id))
    // Optimistic update, rolled back if the request fails
    replaceLead(lead.id, { status: next })

    try {
      const updated = await updateLeadStatus(lead.id, next)
      replaceLead(lead.id, updated)
    } catch (err) {
      replaceLead(lead.id, { status: previous })
      setActionError(
        err instanceof Error ? `Could not update status: ${err.message}` : 'Could not update status',
      )
    } finally {
      setUpdatingIds((ids) => {
        const copy = new Set(ids)
        copy.delete(lead.id)
        return copy
      })
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <h1 className="text-xl font-semibold">Lead Tracker</h1>
          <p className="text-sm text-slate-500">Capture leads and track them through your pipeline.</p>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        <LeadForm onCreated={handleCreated} />

        <section aria-labelledby="leads-heading" className="flex flex-col gap-3">
          <h2 id="leads-heading" className="text-base font-semibold">
            Leads
          </h2>
          <LeadFilters
            search={search}
            status={status}
            onSearchChange={handleSearchChange}
            onStatusChange={handleStatusFilterChange}
          />

          {error && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading && result === null ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading leads…</p>
          ) : leads.length === 0 ? (
            !currentLoadError && (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white py-8 text-center text-sm text-slate-500">
                {hasFilters ? 'No leads match your search.' : 'No leads yet. Add your first lead above.'}
              </p>
            )
          ) : (
            <div className={loading ? 'opacity-60 transition-opacity' : undefined} aria-busy={loading}>
              <LeadTable leads={leads} updatingIds={updatingIds} onStatusChange={handleStatusChange} />
            </div>
          )}

          {total > 0 && <Pagination page={page} limit={PAGE_SIZE} total={total} onPageChange={setPage} />}
        </section>
      </main>
    </div>
  )
}
