'use client'

import { Package, TrendingUp, AlertCircle, DollarSign, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface DashboardStatsProps {
  initialStats: {
    total: number
    onSale: number
    sold: number
    unpublished: number
    published: number
    notPublished: number
    inStock: number
    outOfStock: number
    avgStagnation: number
    avgCVR: string
    discountCount: number
  }
}

export default function DashboardStats({ initialStats }: DashboardStatsProps) {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const kpis = [
    {
      label: '在庫総数',
      value: initialStats.total,
      subValue: `掲載: ${initialStats.published}台 | 非掲載: ${initialStats.notPublished}台`,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: '販売中',
      value: initialStats.onSale,
      subValue: `在庫総数${initialStats.total}台のうち掲載中`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: '平均滞留日数',
      value: `${initialStats.avgStagnation}日`,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      label: '値下げ検討対象',
      value: initialStats.discountCount,
      icon: DollarSign,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-500 mt-1">在庫状況と分析データの概要</p>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xl">
            「販売中」およびダッシュボード分析は掲載有・在庫有で統一。在庫総数は在庫ありの全台数です。
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          更新
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-500">{kpi.label}</p>
                <p className="text-3xl font-bold text-slate-800 mt-2 tabular-nums">
                  {kpi.value}
                </p>
                {'subValue' in kpi && (
                  <p className="text-xs text-slate-400 mt-1">
                    {kpi.subValue}
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-xl ${kpi.bgColor}`}>
                <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
