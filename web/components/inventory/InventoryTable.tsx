'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Inventory } from '@/types'
import { formatPrice, formatMileage, calculateStagnationDays, getStagnationColor } from '@/lib/utils'
import { Edit, Eye, Trash2, Search } from 'lucide-react'

interface InventoryTableProps {
  inventories: Inventory[]
}

export default function InventoryTable({ inventories }: InventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = inventories.filter(inv => {
    const matchesSearch = 
      !searchTerm ||
      inv.maker?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.car_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.vehicle_code?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = 
      statusFilter === 'all' || inv.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div>
      {/* Filters */}
      <div className="p-4 border-b border-gray-200 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="メーカー、車種、物件コードで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">全てのステータス</option>
            <option value="販売中">販売中</option>
            <option value="売約済">売約済</option>
            <option value="非公開">非公開</option>
          </select>
        </div>

        <div className="text-sm text-gray-500">
          {filtered.length}台 / 全{inventories.length}台
        </div>
      </div>

      {/* Table */}
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
                走行距離
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                滞留日数
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                閲覧数
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map((inventory) => {
              const stagnation = inventory.published_date 
                ? calculateStagnationDays(inventory.published_date)
                : null

              return (
                <tr key={inventory.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {inventory.maker} {inventory.car_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {inventory.grade}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {inventory.vehicle_code}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {formatPrice(inventory.price_body)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {formatMileage(inventory.mileage_numeric)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      inventory.status === '販売中' 
                        ? 'bg-green-100 text-green-800'
                        : inventory.status === '売約済'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {inventory.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {stagnation !== null ? (
                      <span className={`text-sm font-medium ${getStagnationColor(stagnation)}`}>
                        {stagnation}日
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {inventory.detail_views || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/inventory/${inventory.id}`}
                        className="p-1 text-primary hover:bg-primary/10 rounded"
                        title="編集"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/inventory/${inventory.id}`}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                        title="公開ページを表示"
                        target="_blank"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            該当する在庫がありません
          </div>
        )}
      </div>
    </div>
  )
}
