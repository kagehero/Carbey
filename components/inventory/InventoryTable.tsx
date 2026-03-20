'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Inventory } from '@/types'
import { formatPrice, formatMileage, calculateStagnationDays, getStagnationColor, getNoStagnationReason } from '@/lib/utils'
import { Edit, Eye, Search, AlertCircle, ArrowUpDown } from 'lucide-react'

interface InventoryTableProps {
  inventories: Inventory[]
}

type SortOption =
  | 'newest'
  | 'price-low' | 'price-high'
  | 'stagnation-low' | 'stagnation-high'
  | 'views-high' | 'views-low'
  | 'cvr-high' | 'cvr-low'
  | 'inquiries-high'
  | 'priority'
  | 'discount-opt' | 'discount-ai'

export default function InventoryTable({ inventories }: InventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const makers = useMemo(
    () => Array.from(new Set(inventories.map((inv) => inv.maker).filter((m): m is string => !!m))).sort(),
    [inventories]
  )
  const [makerFilter, setMakerFilter] = useState<string>('all')

  const vehiclesWithData = useMemo(() => {
    return inventories.map(inv => {
      const stagnation_days = calculateStagnationDays(inv.published_date)
      const views = inv.detail_views || 0
      const cvr = views > 0 ? ((inv.email_inquiries || 0) / views) * 100 : 0
      const priority = stagnation_days * 1.0 + (5 - Math.min(cvr, 5)) * 10.0

      let optPct = 0
      if (stagnation_days >= 180) optPct = 15
      else if (stagnation_days >= 90) optPct = 10
      else if (stagnation_days >= 60) optPct = 5
      if (cvr < 1 && views > 10) optPct = Math.max(optPct, 10)
      else if (cvr < 2 && cvr > 0) optPct = Math.max(optPct, 5)
      const discountAmountOpt = Math.floor((inv.price_body || 0) * optPct / 100)

      let aiPct = 0
      if (stagnation_days >= 365) aiPct = 20
      else if (stagnation_days >= 240) aiPct = 18
      else if (stagnation_days >= 180) aiPct = 15
      else if (stagnation_days >= 120) aiPct = 12
      else if (stagnation_days >= 90) aiPct = 10
      else if (stagnation_days >= 60) aiPct = 6
      if (cvr === 0 && views >= 30) aiPct = Math.max(aiPct, 12)
      else if (cvr < 0.5 && views >= 20) aiPct = Math.max(aiPct, 10)
      else if (cvr < 1 && views >= 10) aiPct = Math.max(aiPct, 8)
      else if (cvr < 2 && cvr > 0) aiPct = Math.max(aiPct, 6)

      return { ...inv, stagnation_days, cvr, priority, discountAmountOpt, aiPct }
    })
  }, [inventories])

  const filtered = useMemo(() => {
    return vehiclesWithData.filter(inv => {
      const searchLower = searchTerm.toLowerCase()
      const searchableText = [
        inv.maker,
        inv.car_name,
        inv.grade,
        inv.grade_notes,
        inv.vehicle_code,
        inv.management_number,
        inv.vin,
        inv.year_display,
        inv.color,
        inv.mileage_display,
        inv.comment1,
        inv.comment2,
      ]
        .filter(Boolean)
        .map(String)
        .join(' ')
        .toLowerCase()
      const matchesSearch = !searchTerm || searchableText.includes(searchLower)
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter
      const matchesMaker = makerFilter === 'all' || inv.maker === makerFilter
      return matchesSearch && matchesStatus && matchesMaker
    })
  }, [vehiclesWithData, searchTerm, statusFilter, makerFilter])

  const sorted = useMemo(() => {
    const items = [...filtered]
    switch (sortBy) {
      case 'newest': return items.sort((a, b) => new Date(b.inserted_at || 0).getTime() - new Date(a.inserted_at || 0).getTime())
      case 'price-low': return items.sort((a, b) => (a.price_body || 0) - (b.price_body || 0))
      case 'price-high': return items.sort((a, b) => (b.price_body || 0) - (a.price_body || 0))
      case 'stagnation-low': return items.sort((a, b) => a.stagnation_days - b.stagnation_days)
      case 'stagnation-high': return items.sort((a, b) => b.stagnation_days - a.stagnation_days)
      case 'views-high': return items.sort((a, b) => (b.detail_views || 0) - (a.detail_views || 0))
      case 'views-low': return items.sort((a, b) => (a.detail_views || 0) - (b.detail_views || 0))
      case 'cvr-high': return items.sort((a, b) => b.cvr - a.cvr)
      case 'cvr-low': return items.sort((a, b) => {
        const aHas = (a.detail_views || 0) > 0
        const bHas = (b.detail_views || 0) > 0
        if (aHas && !bHas) return -1
        if (!aHas && bHas) return 1
        return a.cvr - b.cvr
      })
      case 'inquiries-high': return items.sort((a, b) => (b.email_inquiries || 0) - (a.email_inquiries || 0))
      case 'priority': return items.sort((a, b) => b.priority - a.priority)
      case 'discount-opt': return items.sort((a, b) => b.discountAmountOpt - a.discountAmountOpt)
      case 'discount-ai': return items.sort((a, b) => b.aiPct - a.aiPct)
      default: return items
    }
  }, [filtered, sortBy])

  return (
    <div>
      {/* Filters */}
      <div className="p-4 border-b border-gray-200 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="メーカー、車名、グレード、物件コード、色などで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="all">全てのステータス</option>
              <option value="販売中">販売中</option>
              <option value="売約済">売約済</option>
              <option value="非公開">非公開</option>
            </select>
            <select
              value={makerFilter}
              onChange={(e) => setMakerFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="all">全てのメーカー</option>
              {makers.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm"
            >
              <optgroup label="基本">
                <option value="newest">新着順</option>
              </optgroup>
              <optgroup label="在庫日数">
                <option value="stagnation-high">在庫日数（多い順）</option>
                <option value="stagnation-low">在庫日数（少ない順）</option>
              </optgroup>
              <optgroup label="価格">
                <option value="price-high">価格（高い順）</option>
                <option value="price-low">価格（安い順）</option>
              </optgroup>
              <optgroup label="分析連動">
                <option value="priority">優先度スコア（高い順）</option>
                <option value="cvr-low">CVR（低い順）— 要改善</option>
                <option value="cvr-high">CVR（高い順）</option>
                <option value="inquiries-high">問い合わせ数（多い順）</option>
                <option value="views-high">閲覧数（多い順）</option>
                <option value="views-low">閲覧数（少ない順）</option>
                <option value="discount-opt">推奨値下げ額（大きい順）</option>
                <option value="discount-ai">AI推奨割引率（大きい順）</option>
              </optgroup>
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          {sorted.length}台 / 全{inventories.length}台
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
                閲覧 / 問合
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CVR
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sorted.map((inventory) => {
              const stagnation = inventory.published_date ? inventory.stagnation_days : null
              const noStagnationReason = getNoStagnationReason(
                inventory.published_date,
                inventory.publication_status,
                inventory.status
              )

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
                      <div className="flex items-center gap-1 group relative">
                        <span className="text-sm text-gray-400">-</span>
                        <AlertCircle className="w-4 h-4 text-gray-400 cursor-help" />
                        
                        {/* Tooltip */}
                        <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                          <div className="font-semibold mb-1">滞留日数が表示されない理由：</div>
                          <div>{noStagnationReason}</div>
                          <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {inventory.detail_views || 0} / {inventory.email_inquiries || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(inventory.detail_views || 0) > 0 ? (
                      <span className={`text-sm font-medium ${
                        inventory.cvr >= 5 ? 'text-green-600' :
                        inventory.cvr >= 2 ? 'text-blue-600' :
                        inventory.cvr > 0 ? 'text-red-600' : 'text-gray-400'
                      }`}>
                        {inventory.cvr.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-gray-300 text-sm">—</span>
                    )}
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

        {sorted.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            該当する在庫がありません
          </div>
        )}
      </div>
    </div>
  )
}
