import type { ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: ReactNode
  render?: (item: T, index: number) => ReactNode
  className?: string
  headerClassName?: string
}

export interface PaginationConfig {
  page: number
  pageSize: number
  total: number
  onPageChange: (newPage: number) => void
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T, index: number) => string
  loading?: boolean
  emptyMessage?: ReactNode
  onRowClick?: (item: T) => void
  pagination?: PaginationConfig
  ariaLabel?: string
}

/**
 * Shared generic DataTable component adhering to NFTopia design aesthetics.
 * Provides accessible, responsive tabular views with loading states, empty messaging,
 * row click callbacks, and pagination controls.
 */
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = 'No records found.',
  onRowClick,
  pagination,
  ariaLabel,
}: DataTableProps<T>) {
  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
    : 1
  const currentPage = pagination ? pagination.page : 1

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/40 shadow-lg">
        <table aria-label={ariaLabel} className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-3 font-semibold ${col.headerClassName || col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-slate-400"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg
                      className="h-5 w-5 animate-spin text-cyan-400"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    <span>Loading data…</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => {
                const key = keyExtractor(item, index)
                const isClickable = typeof onRowClick === 'function'

                return (
                  <tr
                    key={key}
                    onClick={() => isClickable && onRowClick(item)}
                    className={[
                      'transition-colors',
                      isClickable
                        ? 'cursor-pointer hover:bg-white/[0.04]'
                        : 'hover:bg-white/[0.02]',
                    ].join(' ')}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-slate-300 ${col.className || ''}`}
                      >
                        {col.render
                          ? col.render(item, index)
                          : ((item as Record<string, unknown>)[col.key] as ReactNode)}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total > 0 && !loading && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1 text-xs text-slate-400">
          <div>
            Showing{' '}
            <span className="font-medium text-slate-200">
              {(currentPage - 1) * pagination.pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-medium text-slate-200">
              {Math.min(currentPage * pagination.pageSize, pagination.total)}
            </span>{' '}
            of{' '}
            <span className="font-medium text-slate-200">{pagination.total}</span>{' '}
            results
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => pagination.onPageChange(currentPage - 1)}
              className="rounded-lg border border-white/10 bg-slate-800/80 px-2.5 py-1 text-slate-200 transition hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800/80"
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="px-2 py-1 text-slate-300 font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => pagination.onPageChange(currentPage + 1)}
              className="rounded-lg border border-white/10 bg-slate-800/80 px-2.5 py-1 text-slate-200 transition hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800/80"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
