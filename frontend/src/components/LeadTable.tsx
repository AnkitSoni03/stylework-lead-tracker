import { LEAD_STATUSES, STATUS_LABELS, type Lead, type LeadStatus } from '../types'
import { STATUS_META } from '../lib/status'
import { avatarColor, formatDateTime, initials, timeAgo } from '../lib/format'

interface Props {
  leads: Lead[]
  updatingIds: Set<string>
  onStatusChange: (lead: Lead, status: LeadStatus) => void
}

const th = 'py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase'

export function LeadTable({ leads, updatingIds, onStatusChange }: Props) {
  return (
    <table className="min-w-full divide-y divide-slate-200">
      <thead className="bg-slate-50/80">
        <tr>
          <th scope="col" className={`${th} pr-2 pl-4 sm:pr-4 sm:pl-6`}>
            Lead
          </th>
          <th scope="col" className={`${th} hidden px-4 md:table-cell`}>
            Phone
          </th>
          <th scope="col" className={`${th} pr-4 pl-2 sm:px-4`}>
            Status
          </th>
          <th scope="col" className={`${th} hidden pr-6 pl-4 sm:table-cell`}>
            Created
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {leads.map((lead) => (
          <tr key={lead.id} className="transition-colors hover:bg-slate-50/70">
            {/* w-full + max-w-0 lets this column absorb spare width and truncate on narrow screens */}
            <td className="w-full max-w-0 py-3 pr-2 pl-4 sm:pr-4 sm:pl-6">
              <div className="flex items-center gap-3">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColor(lead.name)}`}
                  aria-hidden="true"
                >
                  {initials(lead.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{lead.name}</p>
                  <p className="truncate text-sm text-slate-500">{lead.email}</p>
                  <p className="truncate text-xs text-slate-500 md:hidden">{lead.phone}</p>
                </div>
              </div>
            </td>
            <td className="hidden px-4 py-3 text-sm whitespace-nowrap text-slate-600 tabular-nums md:table-cell">
              {lead.phone}
            </td>
            <td className="py-3 pr-4 pl-2 sm:px-4">
              <StatusSelect
                lead={lead}
                disabled={updatingIds.has(lead.id)}
                onChange={(s) => onStatusChange(lead, s)}
              />
            </td>
            <td className="hidden py-3 pr-6 pl-4 text-sm whitespace-nowrap text-slate-500 sm:table-cell">
              <time dateTime={lead.createdAt} title={formatDateTime(lead.createdAt)}>
                {timeAgo(lead.createdAt)}
              </time>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function StatusSelect({
  lead,
  disabled,
  onChange,
}: {
  lead: Lead
  disabled: boolean
  onChange: (status: LeadStatus) => void
}) {
  const meta = STATUS_META[lead.status]
  return (
    <div className="relative inline-flex items-center">
      <span className={`pointer-events-none absolute left-2.5 size-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      <select
        aria-label={`Status for ${lead.name}`}
        value={lead.status}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as LeadStatus)}
        className={`cursor-pointer appearance-none rounded-full border-0 py-1 pr-3 pl-6 text-xs font-medium ring-1 ring-inset focus:ring-2 focus:ring-indigo-600 focus:outline-none disabled:cursor-wait disabled:opacity-60 ${meta.pill}`}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  )
}

export function LeadTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-slate-100" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 px-6 py-4">
          <div className="size-9 rounded-full bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 rounded bg-slate-100" />
            <div className="h-3 w-56 rounded bg-slate-100" />
          </div>
          <div className="h-6 w-24 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  )
}
