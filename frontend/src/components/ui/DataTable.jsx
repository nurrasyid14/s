import { useState } from 'react'
import { ChevronUp, ChevronDown, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * DataTable — reusable, sortable, searchable table
 * @param {Array}     columns - [{ key, label, render?, sortable? }]
 * @param {Array}     data    - array of row objects
 * @param {boolean}   loading
 * @param {number}    total   - total records (for pagination)
 * @param {number}    page
 * @param {number}    limit
 * @param {function}  onPageChange
 * @param {string}    searchValue
 * @param {function}  onSearchChange
 * @param {node}      filterSlot   - extra filter controls (optional)
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  total = 0,
  page = 1,
  limit = 10,
  onPageChange,
  searchValue = '',
  onSearchChange,
  filterSlot,
  emptyTitle,
  emptyDesc,
}) {
  const { t } = useTranslation()
  const [sortKey,   setSortKey]   = useState(null)
  const [sortDir,   setSortDir]   = useState('asc')

  const totalPages = Math.ceil(total / limit)

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const va = a[sortKey], vb = b[sortKey]
        if (va == null) return 1
        if (vb == null) return -1
        const cmp = va < vb ? -1 : va > vb ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
    : data

  return (
    <div className="animate-fade-in">
      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {onSearchChange && (
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={searchValue}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={t('complaints.search_placeholder')}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-smooth"
            />
          </div>
        )}
        {filterSlot && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={15} className="text-[var(--color-text-muted)]" />
            {filterSlot}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wider whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:text-[var(--color-text)] transition-colors select-none' : ''}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && sortKey === col.key && (
                        sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)]">
                    {columns.map(col => (
                      <td key={col.key} className="px-4 py-3.5">
                        <div className="skeleton h-4 w-full rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              )}
              {!loading && sorted.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16 text-center">
                    <div className="text-4xl mb-3">📭</div>
                    <div className="font-semibold text-[var(--color-text)]">{emptyTitle || t('common.empty_state')}</div>
                    <div className="text-sm text-[var(--color-text-muted)] mt-1">{emptyDesc || t('common.empty_desc')}</div>
                  </td>
                </tr>
              )}
              {!loading && sorted.map((row, i) => (
                <tr key={row.id || i} className="border-b border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3.5 text-[var(--color-text)] whitespace-nowrap">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
            <span className="text-xs text-[var(--color-text-muted)]">
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)} / {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange?.(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded hover:bg-[var(--color-card-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} className="text-[var(--color-text-muted)]" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i
                if (p < 1 || p > totalPages) return null
                return (
                  <button
                    key={p}
                    onClick={() => onPageChange?.(p)}
                    className={`w-8 h-8 rounded text-xs font-medium transition-colors ${p === page ? 'bg-blue-600 text-white' : 'hover:bg-[var(--color-card-hover)] text-[var(--color-text-muted)]'}`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => onPageChange?.(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded hover:bg-[var(--color-card-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} className="text-[var(--color-text-muted)]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
