import { LEAD_STATUSES, STATUS_LABELS, type Lead, type LeadStatus } from '../types'

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: 'bg-sky-50 text-sky-700 border-sky-200',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  qualified: 'bg-violet-50 text-violet-700 border-violet-200',
  converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost: 'bg-slate-100 text-slate-600 border-slate-200',
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

interface Props {
  leads: Lead[]
  updatingIds: Set<string>
  onStatusChange: (lead: Lead, status: LeadStatus) => void
}

export function LeadTable({ leads, updatingIds, onStatusChange }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Phone</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3 font-medium">{lead.name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{lead.email}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{lead.phone}</td>
              <td className="px-4 py-3">
                <select
                  aria-label={`Status for ${lead.name}`}
                  value={lead.status}
                  disabled={updatingIds.has(lead.id)}
                  onChange={(e) => onStatusChange(lead, e.target.value as LeadStatus)}
                  className={`rounded-full border px-2 py-1 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 ${STATUS_STYLES[lead.status]}`}
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                <time dateTime={lead.createdAt}>{dateFormat.format(new Date(lead.createdAt))}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
