'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Inventory } from '@/types'
import { formatPrice, formatMileage, calculateStagnationDays, getStagnationColor } from '@/lib/utils'
import { computeFleetWeightedAvgCvr, isCvrBelowFleetAvg, CVR_TIER_PCT } from '@/lib/cvrPolicy'
import { Search, SlidersHorizontal, ArrowUpDown, Eye } from 'lucide-react'
import { Calendar, Gauge } from 'lucide-react'
import TablePagination from '@/components/ui/TablePagination'
import StatusChangeDropdown from './StatusChangeDropdown'

interface InventoryGridProps {
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

const SORT_LABELS: Record<SortOption, string> = {
  newest: '新着順',
  'price-low': '価格（安い順）',
  'price-high': '価格（高い順）',
  'stagnation-low': '在庫日数（少ない順）',
  'stagnation-high': '在庫日数（多い順）',
  'views-high': '閲覧数（多い順）',
  'views-low': '閲覧数（少ない順）',
  'cvr-high': 'CVR（高い順）',
  'cvr-low': 'CVR（低い順）— 要改善',
  'inquiries-high': '問い合わせ数（多い順）',
  priority: '優先度スコア（高い順）',
  'discount-opt': '推奨値下げ額（大きい順）',
  'discount-ai': 'AI推奨割引率（大きい順）',
}

export default function InventoryGrid({ inventories }: InventoryGridProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [publicationFilter, setPublicationFilter] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showFilters, setShowFilters] = useState(false)
  const makers = useMemo(
    () => Array.from(new Set(inventories.map((inv) => inv.maker).filter((m): m is string => !!m))).sort(),
    [inventories]
  )
  const [makerFilter, setMakerFilter] = useState<string>('all')

  const fleetAvgCvr = useMemo(() => computeFleetWeightedAvgCvr(inventories), [inventories])

  // Calculate stagnation, CVR and derived analytics for each vehicle
  const vehiclesWithData = useMemo(() => {
    return inventories.map(inv => {
      const stagnation_days = calculateStagnationDays(inv.published_date)
      const views = inv.detail_views || 0
      const cvr = views > 0 ? ((inv.email_inquiries || 0) / views) * 100 : 0
      const priority = stagnation_days * 1.0 + (5 - Math.min(cvr, 5)) * 10.0

      // Optimization discount suggestion (mirrors pricing / integrated logic)
      let optPct = 0
      if (stagnation_days >= 180) optPct = 15
      else if (stagnation_days >= 90) optPct = 10
      else if (stagnation_days >= 60) optPct = 5
      if (cvr < CVR_TIER_PCT.reward / 2 && views > 10) optPct = Math.max(optPct, 10)
      else if (views > 0 && isCvrBelowFleetAvg(cvr, fleetAvgCvr, true)) optPct = Math.max(optPct, 5)
      const discountAmountOpt = Math.floor((inv.price_body || 0) * optPct / 100)

      // AI discount suggestion
      let aiPct = 0
      if (stagnation_days >= 365) aiPct = 20
      else if (stagnation_days >= 240) aiPct = 18
      else if (stagnation_days >= 180) aiPct = 15
      else if (stagnation_days >= 120) aiPct = 12
      else if (stagnation_days >= 90) aiPct = 10
      else if (stagnation_days >= 60) aiPct = 6
      if (cvr === 0 && views >= 30) aiPct = Math.max(aiPct, 12)
      else if (cvr < CVR_TIER_PCT.reward / 2 && views >= 20) aiPct = Math.max(aiPct, 10)
      else if (cvr < CVR_TIER_PCT.reward && views >= 10) aiPct = Math.max(aiPct, 8)
      else if (views > 0 && isCvrBelowFleetAvg(cvr, fleetAvgCvr, true)) aiPct = Math.max(aiPct, 6)

      return {
        ...inv,
        stagnation_days,
        cvr,
        priority,
        discountAmountOpt,
        aiPct,
      }
    })
  }, [inventories, fleetAvgCvr])

  // Filter
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

      const matchesStatus = 
        statusFilter === 'all' || inv.status === statusFilter

      const matchesPublication = 
        publicationFilter === 'all' || inv.publication_status === publicationFilter

      const matchesStock = 
        stockFilter === 'all' || inv.stock_status === stockFilter

      const matchesMaker =
        makerFilter === 'all' || inv.maker === makerFilter

      return matchesSearch && matchesStatus && matchesPublication && matchesStock && matchesMaker
    })
  }, [vehiclesWithData, searchTerm, statusFilter, publicationFilter, stockFilter, makerFilter])

  // Sort
  const sorted = useMemo(() => {
    const items = [...filtered]
    switch (sortBy) {
      case 'newest':
        return items.sort((a, b) => new Date(b.inserted_at || 0).getTime() - new Date(a.inserted_at || 0).getTime())
      case 'price-low':
        return items.sort((a, b) => (a.price_body || 0) - (b.price_body || 0))
      case 'price-high':
        return items.sort((a, b) => (b.price_body || 0) - (a.price_body || 0))
      case 'stagnation-low':
        return items.sort((a, b) => a.stagnation_days - b.stagnation_days)
      case 'stagnation-high':
        return items.sort((a, b) => b.stagnation_days - a.stagnation_days)
      case 'views-high':
        return items.sort((a, b) => (b.detail_views || 0) - (a.detail_views || 0))
      case 'views-low':
        return items.sort((a, b) => (a.detail_views || 0) - (b.detail_views || 0))
      case 'cvr-high':
        return items.sort((a, b) => b.cvr - a.cvr)
      case 'cvr-low':
        // Only vehicles with actual views; no-view vehicles go to the end
        return items.sort((a, b) => {
          const aHas = (a.detail_views || 0) > 0
          const bHas = (b.detail_views || 0) > 0
          if (aHas && !bHas) return -1
          if (!aHas && bHas) return 1
          return a.cvr - b.cvr
        })
      case 'inquiries-high':
        return items.sort((a, b) => (b.email_inquiries || 0) - (a.email_inquiries || 0))
      case 'priority':
        return items.sort((a, b) => b.priority - a.priority)
      case 'discount-opt':
        return items.sort((a, b) => b.discountAmountOpt - a.discountAmountOpt)
      case 'discount-ai':
        return items.sort((a, b) => b.aiPct - a.aiPct)
      default:
        return items
    }
  }, [filtered, sortBy])

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(24)

  // Reset to page 1 whenever filters/sort change
  useEffect(() => { setPage(1) }, [searchTerm, statusFilter, publicationFilter, stockFilter, makerFilter, sortBy, pageSize])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paginated = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize]
  )

  // Get stagnation badge color and label
  const getStagnationBadge = (days: number) => {
    if (days === 0) return { color: 'bg-gray-100 text-gray-600 border-gray-200', label: '未掲載', icon: '⚪' }
    if (days <= 30) return { color: 'bg-green-100 text-green-700 border-green-200', label: '新着', icon: '🟢' }
    if (days <= 60) return { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: '注視', icon: '🟡' }
    if (days <= 90) return { color: 'bg-orange-100 text-orange-700 border-orange-200', label: '注意', icon: '🟠' }
    if (days <= 180) return { color: 'bg-red-100 text-red-700 border-red-200', label: '警告', icon: '🔴' }
    return { color: 'bg-purple-100 text-purple-700 border-purple-200', label: '緊急', icon: '🟣' }
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white rounded-lg border p-4 space-y-4">

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="メーカー、車名、グレード、物件コード、色などで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Sort always visible */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
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

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            フィルター
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                掲載状態
              </label>
              <select
                value={publicationFilter}
                onChange={(e) => setPublicationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="掲載">掲載中のみ</option>
                <option value="非掲載">非掲載のみ</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                在庫有無
              </label>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="あり">在庫あり</option>
                <option value="なし">在庫なし</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ステータス
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全てのステータス</option>
                <option value="販売中">販売中</option>
                <option value="売約済">売約済</option>
                <option value="非公開">非公開</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メーカー
              </label>
              <select
                value={makerFilter}
                onChange={(e) => setMakerFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全てのメーカー</option>
                {makers.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

          </div>
        )}

        <div className="flex items-center justify-between text-sm flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-gray-600 font-medium">
              {sorted.length > 0
                ? `${(page - 1) * pageSize + 1}〜${Math.min(page * pageSize, sorted.length)}台目 / 絞込${sorted.length}台（全${inventories.length}台）`
                : `0台 / 全${inventories.length}台`}
            </span>
            <span className="text-blue-600">
              📢 掲載: {inventories.filter(v => v.publication_status === '掲載').length}台
            </span>
            <span className="text-gray-600">
              📋 非掲載: {inventories.filter(v => v.publication_status === '非掲載').length}台
            </span>
            <span className="text-green-600">
              ✓ 在庫あり: {inventories.filter(v => v.stock_status === 'あり').length}台
            </span>
            <span className="text-red-600">
              ✗ 在庫なし: {inventories.filter(v => v.stock_status === 'なし').length}台
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>表示数:</span>
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-xs"
            >
              <option value={12}>12台</option>
              <option value={24}>24台</option>
              <option value={48}>48台</option>
              <option value={96}>96台</option>
            </select>
            <span>並び: {SORT_LABELS[sortBy]}</span>
          </div>
        </div>

         {/* Legend */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">掲載状態</h3>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span>📢 掲載中 - カーセンサーに公開中</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gray-500"></div>
                <span>📋 非掲載 - 在庫のみ管理</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">在庫有無</h3>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-600"></div>
                <span>✓ 在庫あり - 実在庫保有</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-600"></div>
                <span>✗ 在庫なし - 取り寄せ等</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">滞留日数の色分け</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span>未掲載</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>0-30日 (新着)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>31-60日 (注視)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>61-90日 (注意)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>91-180日 (警告)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span>181日以上 (緊急)</span>
            </div>
          </div>
        </div>
      </div>

      </div>

      {/* Grid View - E-commerce Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paginated.map((vehicle) => {
          const stagnationBadge = getStagnationBadge(vehicle.stagnation_days)
          
          return (
            <Link
              key={vehicle.id}
              href={`/admin/inventory/${vehicle.id}`}
              className="bg-white rounded-lg border hover:shadow-lg transition-all duration-200 overflow-hidden group"
            >
              {/* Vehicle Image */}
              <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                {vehicle.main_image_url ? (
                  <img
                    src={vehicle.main_image_url}
                    alt={`${vehicle.maker} ${vehicle.car_name}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <Car className="w-16 h-16 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">画像なし</p>
                    </div>
                  </div>
                )}
                
                {/* Stagnation Badge - Top Left */}
                <div className="absolute top-2 left-2">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border shadow-sm backdrop-blur-sm ${stagnationBadge.color}`}>
                    {stagnationBadge.icon} {stagnationBadge.label}
                    {vehicle.stagnation_days > 0 && ` ${vehicle.stagnation_days}日`}
                  </div>
                </div>

                {/* Status Badges - Top Right */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                  <div className={`px-2 py-1 rounded text-xs font-medium backdrop-blur-sm ${
                    vehicle.publication_status === '掲載' ? 'bg-blue-500/90 text-white' :
                    'bg-gray-500/90 text-white'
                  }`}>
                    {vehicle.publication_status === '掲載' ? '📢 掲載中' : '📋 非掲載'}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium backdrop-blur-sm ${
                    vehicle.stock_status === 'あり' ? 'bg-green-600/90 text-white' :
                    'bg-red-600/90 text-white'
                  }`}>
                    {vehicle.stock_status === 'あり' ? '✓ 在庫あり' : '✗ 在庫なし'}
                  </div>
                  {vehicle.status && (
                    <div className={`px-2 py-1 rounded text-xs font-medium backdrop-blur-sm ${
                      vehicle.status === '販売中' ? 'bg-emerald-500/90 text-white' :
                      vehicle.status === '売約済' ? 'bg-rose-500/90 text-white' :
                      'bg-slate-500/90 text-white'
                    }`}>
                      {vehicle.status}
                    </div>
                  )}
                </div>

                {/* Views Badge - Bottom Right */}
                {vehicle.detail_views && vehicle.detail_views > 0 && (
                  <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {vehicle.detail_views}
                  </div>
                )}
              </div>

              {/* Vehicle Info */}
              <div className="p-4 space-y-3">
                {/* Title */}
                <div>
                  <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors line-clamp-1">
                    {vehicle.maker} {vehicle.car_name}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-1">
                    {vehicle.grade || '—'}
                  </p>
                </div>

                {/* Price - Prominent */}
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatPrice(vehicle.price_body)}
                  </span>
                  {vehicle.price_total && vehicle.price_total !== vehicle.price_body && (
                    <span className="text-sm text-gray-500">
                      (総額: {formatPrice(vehicle.price_total)})
                    </span>
                  )}
                </div>

                {/* Key Specs */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Calendar className="w-3 h-3" />
                    <span>{vehicle.year_display || vehicle.year || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Gauge className="w-3 h-3" />
                    <span>{formatMileage(vehicle.mileage)}</span>
                  </div>
                </div>

                {/* CVR Indicator */}
                {vehicle.cvr > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-gray-500">CVR</span>
                    <span className={`text-sm font-semibold ${
                      vehicle.cvr >= 5 ? 'text-green-600' :
                      vehicle.cvr >= 2 ? 'text-blue-600' :
                      'text-red-600'
                    }`}>
                      {vehicle.cvr.toFixed(2)}%
                    </span>
                  </div>
                )}

                {/* Vehicle Code */}
                {vehicle.vehicle_code && (
                  <div className="text-xs text-gray-500 truncate">
                    🔖 {vehicle.vehicle_code}
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Empty State */}
      {sorted.length === 0 && (
        <div className="bg-white rounded-lg border p-12 text-center">
          <div className="text-gray-400 mb-4">
            <Search className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">該当する車両が見つかりません</p>
            <p className="text-sm mt-2">検索条件を変更してください</p>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalItems={sorted.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
          unitLabel="台"
        />
      )}

     
    </div>
  )
}

function Car({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  )
}
