"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { formatPrice, formatNumber } from "@/lib/utils"
import { getCVRColor } from "@/lib/cvrPolicy"
import TablePagination from "@/components/ui/TablePagination"

type Vehicle = {
  id: string
  maker: string | null
  car_name: string | null
  grade: string | null
  price_body: number | null
  detail_views: number | null
  email_inquiries: number | null
  cvr: number
}

type Props = {
  vehicles: Vehicle[]
  unitLabel?: string
  fleetAvgCvr?: number
}

export default function CVRTableWithPagination({ vehicles, unitLabel = "台", fleetAvgCvr }: Props) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(24)
  useEffect(() => setPage(1), [vehicles.length, pageSize])

  const totalPages = Math.max(1, Math.ceil(vehicles.length / pageSize))
  const paginated = useMemo(
    () => vehicles.slice((page - 1) * pageSize, page * pageSize),
    [vehicles, page, pageSize]
  )

  if (vehicles.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">順位</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">車両</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">価格</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">閲覧数</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">問合せ数</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CVR</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginated.map((vehicle, idx) => (
              <tr key={vehicle.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  #{(page - 1) * pageSize + idx + 1}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {vehicle.maker} {vehicle.car_name}
                  </div>
                  <div className="text-xs text-gray-500">{vehicle.grade}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatPrice(vehicle.price_body)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(vehicle.detail_views)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(vehicle.email_inquiries)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm font-medium ${getCVRColor(vehicle.cvr, fleetAvgCvr)}`}>
                    {vehicle.cvr.toFixed(2)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link href={`/admin/inventory/${vehicle.id}`} className="text-primary hover:text-primary/80">
                    詳細
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
          unitLabel={unitLabel}
        />
      )}
    </div>
  )
}
