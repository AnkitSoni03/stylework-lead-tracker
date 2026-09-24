import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Plus, SearchX, UsersRound } from 'lucide-react'
import { getLeadStats, listLeads, updateLeadStatus } from './api'
import { LeadFilters } from './components/LeadFilters'
import { LeadForm } from './components/LeadForm'
import { LeadTable, LeadTableSkeleton } from './components/LeadTable'
import { Modal } from './components/Modal'
import { Pagination } from './components/Pagination'
import { StatsCards } from './components/StatsCards'
import { Toasts, type Toast } from './components/Toasts'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { STATUS_LABELS, type Lead, type LeadStats, type LeadStatus } from './types'

const PAGE_SIZE = 10
const TOAST_MS = 3500

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
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [statsKey, setStatsKey] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

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

  // Pipeline counts are secondary information: failures are ignored and the
  // cards simply keep their placeholders.
  useEffect(() => {
    const controller = new AbortController()
    getLeadStats(controller.signal)
      .then(setStats)
      .catch(() => {})
    return () => controller.abort()
  }, [statsKey])

  const leads = result?.leads ?? []
  const total = result?.total ?? 0
  const currentLoadError = loadError?.key === queryKey ? loadError.message : null
  const loading = result?.key !== queryKey && currentLoadError === null
  const error = actionError ?? currentLoadError
  const hasFilters = debouncedSearch !== '' || status !== ''

  const dismissToast = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (message: string) => {
      const id = ++toastId.current
      setToasts((ts) => [...ts, { id, message }])
      setTimeout(() => dismissToast(id), TOAST_MS)
    },
    [dismissToast],
  )

  const closeForm = useCallback(() => setFormOpen(false), [])

  // Any change to the search or filter starts again from the first page
  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleStatusFilterChange(value: LeadStatus | '') {
    setStatus(value)
    setPage(1)
  }

  function clearFilters() {
    setSearch('')
    setStatus('')
    setPage(1)
  }

  function handleCreated(lead: Lead) {
    setFormOpen(false)
    clearFilters()
    setActionError(null)
    setReloadKey((k) => k + 1)
    setStatsKey((k) => k + 1)
    notify(`${lead.name} was added`)
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
      setStatsKey((k) => k + 1)
      notify(`${lead.name} moved to ${STATUS_LABELS[next]}`)
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
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <UsersRound className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-base leading-tight font-semibold text-slate-900">Lead Tracker</p>
              <p className="text-xs text-slate-500">Stylework</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <Plus className="size-4" aria-hidden="true" />
            New lead
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Leads</h1>
          <p className="mt-1 text-sm text-slate-500">
            Capture new leads and move them through your sales pipeline.
          </p>
        </div>

        <StatsCards stats={stats} active={status} onSelect={handleStatusFilterChange} />

        <section
          aria-labelledby="leads-heading"
          className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200"
        >
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 id="leads-heading" className="text-sm font-semibold text-slate-900">
                All leads
              </h2>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Clear filters
                </button>
              )}
            </div>
            <LeadFilters
              search={search}
              status={status}
              onSearchChange={handleSearchChange}
              onStatusChange={handleStatusFilterChange}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 border-b border-rose-100 bg-rose-50 px-6 py-3 text-sm text-rose-700"
            >
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

          {loading && result === null ? (
            <LeadTableSkeleton />
          ) : leads.length === 0 ? (
            !currentLoadError && <EmptyState filtered={hasFilters} onAdd={() => setFormOpen(true)} onClear={clearFilters} />
          ) : (
            <div
              className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`}
              aria-busy={loading}
            >
              <LeadTable leads={leads} updatingIds={updatingIds} onStatusChange={handleStatusChange} />
            </div>
          )}

          {total > 0 && <Pagination page={page} limit={PAGE_SIZE} total={total} onPageChange={setPage} />}
        </section>
      </main>

      <Modal
        open={formOpen}
        title="New lead"
        description="Add a contact to the top of your pipeline."
        onClose={closeForm}
      >
        <LeadForm onCreated={handleCreated} onCancel={closeForm} />
      </Modal>

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

function EmptyState({
  filtered,
  onAdd,
  onClear,
}: {
  filtered: boolean
  onAdd: () => void
  onClear: () => void
}) {
  const Icon = filtered ? SearchX : UsersRound
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <p className="mt-4 text-sm font-medium text-slate-900">
        {filtered ? 'No leads match your search.' : 'No leads yet'}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {filtered ? 'Try a different name, email or phone, or clear the filters.' : 'Add your first lead to start building your pipeline.'}
      </p>
      <button
        type="button"
        onClick={filtered ? onClear : onAdd}
        className="mt-5 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
      >
        {filtered ? 'Clear filters' : (
          <>
            <Plus className="size-4" aria-hidden="true" />
            New lead
          </>
        )}
      </button>
    </div>
  )
}
