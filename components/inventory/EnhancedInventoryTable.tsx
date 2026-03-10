'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Inventory } from '@/types'
import { formatPrice, formatMileage, calculateStagnationDays, getStagnationColor, getNoStagnationReason } from '@/lib/utils'
import { Edit, Eye, Search, AlertCircle, Image as ImageIcon, TrendingUp, TrendingDown, Calendar, Gauge } from 'lucide-react'
import StatusChangeDropdown from './StatusChangeDropdown'

interface InventoryTableProps {
  inventories: Inventory[]
}

export default function InventoryTable({ inventories }: InventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'stagnation' | 'price' | 'date'>('stagnation')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Filter inventories
  const filtered = inventories.filter(inv => {
    const matchesSearch = 
      inv.maker?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.car_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.grade?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Sort inventories
  const sorted = [...filtered].sort((a, b) => {
    let comparison = 0
    
    switch(sortBy) {
      case 'stagnation':
        const stagnationA = calculateStagnationDays(a.published_date)
        const stagnationB = calculateStagnationDays(b.published_date)
        comparison = stagnationA - stagnationB
        break
      case 'price':
        comparison = (a.price_body || 0) - (b.price_body || 0)
        break
      case 'date':
        comparison = new Date(a.inserted_at || 0).getTime() - new Date(b.inserted_at || 0).getTime()
        break
    }

    return sortOrder === 'asc' ? comparison : -comparison
  })

  // Get category badge color
  const getCategoryColor = (maker: string | null) => {
    if (!maker) return 'bg-gray-100 text-gray-800'
    
    const makerLower = maker.toLowerCase()
    if (makerLower.includes('トヨタ') || makerLower.includes('toyota')) 
      return 'bg-red-50 text-red-700 border-red-200'
    if (makerLower.includes('ホンダ') || makerLower.includes('honda')) 
      return 'bg-blue-50 text-blue-700 border-blue-200'
    if (makerLower.includes('日産') || makerLower.includes('nissan')) 
      return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    if (makerLower.includes('マツダ') || makerLower.includes('mazda')) 
      return 'bg-purple-50 text-purple-700 border-purple-200'
    if (makerLower.includes('スバル') || makerLower.includes('subaru')) 
      return 'bg-cyan-50 text-cyan-700 border-cyan-200'
    
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  // Get price trend indicator
  const getPriceTrend = (price: number | null) => {
    if (!price) return null
    if (price > 3000000) return { icon: TrendingUp, color: 'text-green-600', label: '高価格帯' }
    if (price < 1000000) return { icon: TrendingDown, color: 'text-orange-600', label: '低価格帯' }
    return null
  }

  return (
    <div className="space-y-4">
      {/* Enhanced Search and Filters */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="メーカー、車名、グレードで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">全てのステータス</option>
            <option value="販売中">販売中</option>
            <option value="売約済">売約済</option>
            <option value="非公開">非公開</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="stagnation">滞留日数順</option>
            <option value="price">価格順</option>
            <option value="date">登録日順</option>
          </select>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            {sortOrder === 'asc' ? '↑ 昇順' : '↓ 降順'}
          </button>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600">
          {sorted.length} 件の車両 {filtered.length !== inventories.length && `(${inventories.length}件中)`}
        </div>
      </div>

      {/* Colorful Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map((inv) => {
          const stagnation = calculateStagnationDays(inv.published_date)
          const noStagnationReason = getNoStagnationReason(inv.published_date, inv.publication_status, inv.status)
          const priceTrend = getPriceTrend(inv.price_body)
          
          return (
            <div 
              key={inv.id} 
              className="bg-white rounded-lg border-2 hover:border-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
            >
              {/* Image Thumbnail */}
              <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200">
                {inv.image_url ? (
                  <img 
                    src={inv.image_url} 
                    alt={`${inv.maker} ${inv.car_name}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-gray-300" />
                  </div>
                )}
                
                {/* Status Badge on Image */}
                <div className="absolute top-2 left-2">
                  <StatusChangeDropdown vehicleId={inv.id} currentStatus={inv.status || '販売中'} />
                </div>

                {/* Stagnation Badge */}
                {stagnation > 0 && (
                  <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold ${
                    stagnation >= 180 ? 'bg-red-500 text-white' :
                    stagnation >= 60 ? 'bg-orange-500 text-white' :
                    stagnation >= 30 ? 'bg-yellow-500 text-white' :
                    'bg-green-500 text-white'
                  }`}>
                    {stagnation}日
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                {/* Maker Badge */}
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(inv.maker)}`}>
                    {inv.maker || 'メーカー不明'}
                  </span>
                  {priceTrend && (
                    <span className={`flex items-center gap-1 text-xs font-medium ${priceTrend.color}`}>
                      <priceTrend.icon className="w-3 h-3" />
                      {priceTrend.label}
                    </span>
                  )}
                </div>

                {/* Vehicle Name */}
                <Link href={`/admin/inventory/${inv.id}`}>
                  <h3 className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1">
                    {inv.car_name || '車名不明'}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-1">
                    {inv.grade || 'グレード不明'}
                  </p>
                </Link>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      年式
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {inv.year || '-'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Gauge className="w-3 h-3" />
                      走行距離
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatMileage(inv.mileage)}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="pt-2 border-t">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatPrice(inv.price_body)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Link
                    href={`/admin/inventory/${inv.id}`}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    詳細
                  </Link>
                  <Link
                    href={`/admin/inventory/${inv.id}/edit`}
                    className="flex-1 px-3 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Edit className="w-4 h-4" />
                    編集
                  </Link>
                </div>

                {/* Stagnation Warning */}
                {noStagnationReason && (
                  <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span className="text-amber-800">{noStagnationReason}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* No Results */}
      {sorted.length === 0 && (
        <div className="bg-white rounded-lg border p-12 text-center">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">条件に一致する車両が見つかりませんでした</p>
        </div>
      )}
    </div>
  )
}
