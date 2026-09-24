import type { LeadStatus } from '../types'

interface StatusMeta {
  /** Small coloured dot used in cards and pills */
  dot: string
  /** Pill background / text / border */
  pill: string
  /** Accent for the active stats card */
  ring: string
}

export const STATUS_META: Record<LeadStatus, StatusMeta> = {
  new: { dot: 'bg-sky-500', pill: 'bg-sky-50 text-sky-700 ring-sky-600/20', ring: 'ring-sky-500' },
  contacted: {
    dot: 'bg-amber-500',
    pill: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    ring: 'ring-amber-500',
  },
  qualified: {
    dot: 'bg-violet-500',
    pill: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    ring: 'ring-violet-500',
  },
  converted: {
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    ring: 'ring-emerald-500',
  },
  lost: { dot: 'bg-rose-500', pill: 'bg-rose-50 text-rose-700 ring-rose-600/20', ring: 'ring-rose-500' },
}
