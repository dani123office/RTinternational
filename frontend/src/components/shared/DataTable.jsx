import { useMemo, useState } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

const ITEMS_PER_PAGE = 10

export default function DataTable({ columns, data, searchKey, onRowClick, pageSize = ITEMS_PER_PAGE }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    if (!search || !searchKey) return data
    const q = search.toLowerCase()
    return data.filter((row) => {
      const val = typeof searchKey === 'function' ? searchKey(row) : row[searchKey]
      return String(val || '').toLowerCase().includes(q)
    })
  }, [data, search, searchKey])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <div>
      {searchKey && (
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-1.5 border border-slate-200 max-w-xs mb-4">
          <Search size={16} color="#94a3b8" />
          <input
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="border-none outline-none flex-1 text-[0.82rem] text-slate-900 bg-transparent pl-1.5"
          />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.82rem]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              {columns.map((col, i) => (
                <th key={i} className="text-left px-4 py-3 text-slate-500 font-medium" style={col.width ? { width: col.width } : undefined}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-slate-400">No data found</td>
              </tr>
            ) : (
              paginated.map((row, ri) => (
                <tr
                  key={row.id || ri}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-slate-50 transition-colors duration-150 ${
                    onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''
                  }`}
                >
                  {columns.map((col, ci) => (
                    <td key={ci} className="px-4 py-3 text-slate-600" style={col.width ? { width: col.width } : undefined}>
                      {col.cell ? col.cell(row) : col.accessor ? row[col.accessor] : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-slate-100">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[0.78rem] disabled:text-slate-200 disabled:cursor-default text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span className="text-[0.78rem] text-slate-500">Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[0.78rem] disabled:text-slate-200 disabled:cursor-default text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
