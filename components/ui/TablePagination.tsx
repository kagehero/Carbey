"use client"

/**
 * Reusable table pagination component. Use for all data tables.
 *
 * Usage:
 *   const [page, setPage] = useState(1)
 *   const [pageSize, setPageSize] = useState(24)
 *   const paginated = items.slice((page - 1) * pageSize, page * pageSize)
 *   // render table with paginated, then:
 *   <TablePagination page={page} totalPages={...} totalItems={...} pageSize={pageSize}
 *     onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1) }} unitLabel="台" />
 */
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

type Props = {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  unitLabel?: string
}

const DEFAULT_PAGE_SIZES = [12, 24, 48, 96]

export default function TablePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  unitLabel = "件",
}: Props) {
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
    .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("ellipsis")
      acc.push(p)
      return acc
    }, [])

  return (
    <div className="bg-white rounded-lg border px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-4 flex-wrap">
        <p className="text-sm text-gray-600">
        <span className="font-medium">{start}</span>〜
        <span className="font-medium">{end}</span>
        {unitLabel} ／ 全
        <span className="font-medium">{totalItems}</span>
        {unitLabel}（{page} / {totalPages}ページ）
        </p>
        {onPageSizeChange && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>表示数:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-xs"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                  {unitLabel}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="p-1.5 rounded border border-gray-300 disabled:opacity-30 hover:bg-gray-50 disabled:cursor-not-allowed"
          title="最初のページ"
        >
          <ChevronsLeft className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-1.5 rounded border border-gray-300 disabled:opacity-30 hover:bg-gray-50 disabled:cursor-not-allowed"
          title="前のページ"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>

        {pageNumbers.map((item, idx) =>
          item === "ellipsis" ? (
            <span key={`e${idx}`} className="px-2 text-gray-400 text-sm">
              …
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item as number)}
              className={`min-w-[32px] h-8 px-2 rounded border text-sm font-medium transition-colors ${
                page === item
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="p-1.5 rounded border border-gray-300 disabled:opacity-30 hover:bg-gray-50 disabled:cursor-not-allowed"
          title="次のページ"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className="p-1.5 rounded border border-gray-300 disabled:opacity-30 hover:bg-gray-50 disabled:cursor-not-allowed"
          title="最後のページ"
        >
          <ChevronsRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  )
}
