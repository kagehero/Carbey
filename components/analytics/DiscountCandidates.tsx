'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { formatPrice, calculateStagnationDays, calculateCVR } from '@/lib/utils'
import { computeFleetWeightedAvgCvr, isCvrBelowFleetAvg } from '@/lib/cvrPolicy'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import { Inventory } from '@/types'
import TablePagination from '@/components/ui/TablePagination'

interface DiscountCandidatesProps {
  vehicles: Inventory[]
}

export default function DiscountCandidates({ vehicles }: DiscountCandidatesProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(24)
  useEffect(() => setPage(1), [pageSize, vehicles.length])
  const totalPages = Math.max(1, Math.ceil(vehicles.length / pageSize))
  const paginated = useMemo(
    () => vehicles.slice((page - 1) * pageSize, page * pageSize),
    [vehicles, page, pageSize]
  )
  const fleetAvg = useMemo(() => computeFleetWeightedAvgCvr(vehicles), [vehicles])

  if (vehicles.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        値下げ検討対象の車両はありません
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
              理由
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {paginated.map((vehicle) => {
            const stagnation = calculateStagnationDays(vehicle.published_date!)
            const cvr = calculateCVR(vehicle.email_inquiries, vehicle.detail_views)
            const reasons = []
            if (stagnation >= 60) reasons.push('滞留60日以上')
            if ((vehicle.detail_views || 0) > 0 && isCvrBelowFleetAvg(cvr, fleetAvg, true))
              reasons.push('CVR 在庫平均未満')

            return (
              <tr key={vehicle.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {vehicle.maker} {vehicle.car_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {vehicle.grade}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {formatPrice(vehicle.price_body)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-orange-600">
                    {stagnation}日
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-red-600">
                    {cvr.toFixed(2)}%
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-gray-600">
                      {reasons.join(', ')}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link
                    href={`/admin/inventory/${vehicle.id}`}
                    className="text-primary hover:text-primary/80 inline-flex items-center gap-1"
                  >
                    編集 <ExternalLink className="w-3 h-3" />
                  </Link>
                </td>
              </tr>
            )
          })}
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
