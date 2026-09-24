import { CheckCircle2, X } from 'lucide-react'

export interface Toast {
  id: number
  message: string
}

interface Props {
  toasts: Toast[]
  onDismiss: (id: number) => void
}

export function Toasts({ toasts, onDismiss }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"
        >
          <CheckCircle2 className="size-5 shrink-0 text-emerald-400" aria-hidden="true" />
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
            className="rounded p-0.5 text-slate-400 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
