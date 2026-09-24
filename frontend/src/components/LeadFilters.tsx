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
      <input
        type="search"
        aria-label="Search leads"
        placeholder="Search by name, email or phone"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <select
        aria-label="Filter by status"
        value={status}
        onChange={(e) => onStatusChange(e.target.value as LeadStatus | '')}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
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
