import { LEAD_STATUSES, STATUS_LABELS, type LeadStats, type LeadStatus } from '../types'
import { STATUS_META } from '../lib/status'

interface Props {
  stats: LeadStats | null
  active: LeadStatus | ''
  onSelect: (status: LeadStatus | '') => void
}

export function StatsCards({ stats, active, onSelect }: Props) {
  const cards: { key: LeadStatus | ''; label: string; count: number | undefined; dot?: string }[] = [
    { key: '', label: 'All leads', count: stats?.total },
    ...LEAD_STATUSES.map((s) => ({
      key: s,
      label: STATUS_LABELS[s],
      count: stats?.byStatus[s],
      dot: STATUS_META[s].dot,
    })),
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Pipeline summary">
      {cards.map((card) => {
        const isActive = active === card.key
        return (
          <button
            key={card.key || 'all'}
            type="button"
            onClick={() => onSelect(card.key)}
            aria-pressed={isActive}
            className={`rounded-xl bg-white p-4 text-left shadow-sm ring-1 transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isActive
                ? `ring-2 ${card.key ? STATUS_META[card.key].ring : 'ring-indigo-500'}`
                : 'ring-slate-200'
            }`}
          >
            <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
              {card.dot && <span className={`size-2 rounded-full ${card.dot}`} aria-hidden="true" />}
              {card.label}
            </span>
            <span className="mt-1 block text-2xl font-semibold tabular-nums text-slate-900">
              {card.count ?? <span className="inline-block h-7 w-8 animate-pulse rounded bg-slate-100" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}
