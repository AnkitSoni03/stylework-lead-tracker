import { Search } from 'lucide-react'
import { LEAD_STATUSES, STATUS_LABELS, type LeadStatus } from '../types'

interface Props {
  search: string
  status: LeadStatus | ''
  onSearchChange: (value: string) => void
  onStatusChange: (value: LeadStatus | '') => void
}

export function LeadFilters({ search, status, onSearchChange, onStatusChange }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          aria-label="Search leads"
          placeholder="Search by name, email or phone"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full rounded-lg border-0 py-2 pr-3 pl-9 text-sm text-slate-900 shadow-sm ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:ring-inset focus:outline-none"
        />
      </div>
      <select
        aria-label="Filter by status"
        value={status}
        onChange={(e) => onStatusChange(e.target.value as LeadStatus | '')}
        className="rounded-lg border-0 py-2 pr-8 pl-3 text-sm text-slate-900 shadow-sm ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-indigo-600 focus:outline-none sm:w-44"
      >
        <option value="">All statuses</option>
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  )
}
