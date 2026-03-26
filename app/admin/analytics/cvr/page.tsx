import { createClient } from '@/lib/supabase/server'
import { VISIBLE_ON_SALE_MATCH } from '@/lib/inventoryMetrics'
import { calculateCVR, getCVRColor, formatPrice, formatNumber } from '@/lib/utils'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'
import Link from 'next/link'
import CVRPoorBulkTable from '@/components/analytics/CVRPoorBulkTable'
import CVRTableWithPagination from '@/components/analytics/CVRTableWithPagination'

async function getCVRData() {
  const supabase = await createClient()

  const { data: inventories } = await supabase
    .from('inventories')
    .select('*')
    .match(VISIBLE_ON_SALE_MATCH)
    .order('detail_views', { ascending: false })

  const allInventories = inventories || []
  
  const vehicles = allInventories
    .filter((v: any) => v.detail_views && v.detail_views > 0)
    .map((v: any) => ({
      ...v,
      cvr: calculateCVR(v.email_inquiries, v.detail_views)
    }))

  // Categorize by CVR
  const excellent = vehicles.filter(v => v.cvr >= 5)
  const good = vehicles.filter(v => v.cvr >= 2 && v.cvr < 5)
  const poor = vehicles.filter(v => v.cvr > 0 && v.cvr < 2)
  const noData = allInventories.filter((v: any) => !v.detail_views || v.detail_views === 0)

  const avgCVR = vehicles.length > 0
    ? vehicles.reduce((sum, v) => sum + v.cvr, 0) / vehicles.length
    : 0

  return {
    vehicles,
    excellent,
    good,
    poor,
    noData,
    avgCVR,
    total: vehicles.length
  }
}

export default async function CVRAnalysisPage() {
  const { vehicles, excellent, good, poor, noData, avgCVR, total } = await getCVRData()

  const categories = [
    { key: 'excellent', label: '優秀 (≥5%)', vehicles: excellent, color: 'text-green-600', bgColor: 'bg-green-100', icon: TrendingUp },
    { key: 'good', label: '良好 (2-5%)', vehicles: good, color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Activity },
    { key: 'poor', label: '要改善 (<2%)', vehicles: poor, color: 'text-red-600', bgColor: 'bg-red-100', icon: TrendingDown },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CVR分析</h1>
        <p className="text-gray-500 mt-1">
          掲載有・在庫有の車両のみ。コンバージョン率（問い合わせ率）の詳細分析
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">平均CVR</div>
          <div className="text-3xl font-bold text-gray-900">
            {avgCVR.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-500 mt-2">
            掲載有・在庫有のうち閲覧数あり{total}台から算出
          </div>
        </div>

        {categories.map((cat) => (
          <div key={cat.key} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-500">{cat.label}</div>
              <cat.icon className={`w-5 h-5 ${cat.color}`} />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {cat.vehicles.length}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {total > 0 ? Math.round((cat.vehicles.length / total) * 100) : 0}%
            </div>
          </div>
        ))}
      </div>

      {/* Top Performers (Excellent) */}
      {excellent.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-green-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">高CVR車両</h2>
                <p className="text-sm text-gray-500">CVR 5%以上の優秀な車両</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <CVRTableWithPagination vehicles={excellent} unitLabel="台" />
          </div>
        </div>
      )}

      {/* Good Performers */}
      {good.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">良好な車両</h2>
                <p className="text-sm text-gray-500">CVR 2%以上5%未満の車両</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <CVRTableWithPagination vehicles={good} unitLabel="台" />
          </div>
        </div>
      )}

      {/* Poor Performers */}
      {poor.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-6 h-6 text-red-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">改善が必要な車両</h2>
                <p className="text-sm text-gray-500">CVR 2%未満の車両 - 価格見直しや情報追加を検討</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <CVRPoorBulkTable rows={poor as any} />
          </div>
        </div>
      )}

      {total === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">CVRデータがありません</p>
          <p className="text-sm text-gray-400 mt-2">閲覧数のある車両が表示されます</p>
        </div>
      )}
    </div>
  )
}
