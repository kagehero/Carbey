'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { formatPrice, getStagnationColor } from '@/lib/utils'
import { getCVRColor } from '@/lib/cvrPolicy'
import { ExternalLink } from 'lucide-react'
import TablePagination from '@/components/ui/TablePagination'

interface Vehicle {
  id: string
  maker: string | null
  car_name: string | null
  price_body: number | null
  stagnation: number
  cvr: number
  score: number
}

interface PriorityTableProps {
  vehicles: Vehicle[]
  /** 在庫加重平均CVR（%）。指定時は区分色が一致 */
  fleetAvgCvr?: number
}

export default function PriorityTable({ vehicles, fleetAvgCvr }: PriorityTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(24)
  useEffect(() => setPage(1), [pageSize, vehicles.length])
  const totalPages = Math.max(1, Math.ceil(vehicles.length / pageSize))
  const paginated = useMemo(
    () => vehicles.slice((page - 1) * pageSize, page * pageSize),
    [vehicles, page, pageSize]
  )

  if (vehicles.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        データがありません
      </div>
    )
  }

  return (
    <div className="space-y-4">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              順位
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              車両
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              価格
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              滞留日数
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              CVR
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              優先度スコア
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              価格最適化
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {paginated.map((vehicle, idx) => (
            <tr key={vehicle.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-medium text-gray-900">
                  #{(page - 1) * pageSize + idx + 1}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {vehicle.maker} {vehicle.car_name}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-900">
                  {formatPrice(vehicle.price_body)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`text-sm font-medium ${getStagnationColor(vehicle.stagnation)}`}>
                  {vehicle.stagnation}日
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`text-sm font-medium ${getCVRColor(vehicle.cvr, fleetAvgCvr)}`}>
                  {vehicle.cvr.toFixed(2)}%
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-bold text-gray-900">
                  {vehicle.score.toFixed(1)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <Link
                  href={`/admin/inventory/${vehicle.id}`}
                  className="text-primary hover:text-primary/80 inline-flex items-center gap-1"
                >
                  詳細 <ExternalLink className="w-3 h-3" />
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <Link
                  href={`/admin/analytics/pricing?highlight=${vehicle.id}`}
                  className="text-orange-600 hover:text-orange-700 font-medium inline-flex items-center gap-1"
                >
                  見直しへ
                </Link>
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
        totalItems={vehicles.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        unitLabel="台"
      />
    )}
    </div>
  )
}
