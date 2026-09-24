interface Props {
  page: number
  limit: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, limit, total, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  const button =
    'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between text-sm text-slate-600">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex gap-2">
        <button className={button} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </button>
        <button className={button} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </button>
      </div>
    </nav>
  )
}
