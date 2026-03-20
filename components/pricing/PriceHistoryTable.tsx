"use client"

import { useState, useMemo, useEffect } from "react"
import { formatPrice } from "@/lib/utils"
import TablePagination from "@/components/ui/TablePagination"

type HistoryItem = {
  id: string
  changed_at: string
  old_price: number
  new_price: number
  price_diff: number
  price_diff_pct: number
  inventories?: { maker: string | null; car_name: string | null }
}

type Props = {
  histories: HistoryItem[]
}

export default function PriceHistoryTable({ histories }: Props) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(24)
  useEffect(() => setPage(1), [pageSize, histories.length])
  const totalPages = Math.max(1, Math.ceil(histories.length / pageSize))
  const paginated = useMemo(
    () => histories.slice((page - 1) * pageSize, page * pageSize),
    [histories, page, pageSize]
  )

  if (histories.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">変更日時</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">車両</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">変更前</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">変更後</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">差額</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">変更率</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginated.map((history) => (
              <tr key={history.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(history.changed_at).toLocaleString("ja-JP")}
                </td>
                <td className="px-6 py-4 text-sm">
                  {history.inventories?.maker} {history.inventories?.car_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatPrice(history.old_price)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatPrice(history.new_price)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`text-sm font-medium ${
                      history.price_diff < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {history.price_diff > 0 ? "+" : ""}
                    {formatPrice(Math.abs(history.price_diff))}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`text-sm font-medium ${
                      history.price_diff_pct < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {history.price_diff_pct > 0 ? "+" : ""}
                    {history.price_diff_pct?.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalItems={histories.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
          unitLabel="件"
        />
      )}
    </div>
  )
}
