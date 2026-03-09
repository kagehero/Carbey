import { createClient } from '@/lib/supabase/server'
import { calculateCVR, getCVRColor, formatPrice, formatNumber } from '@/lib/utils'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'
import Link from 'next/link'

async function getCVRData() {
  const supabase = await createClient()

  const { data: inventories } = await supabase
    .from('inventories')
    .select('*')
    .eq('status', '販売中')
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
        <p className="text-gray-500 mt-1">コンバージョン率（問い合わせ率）の詳細分析</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">平均CVR</div>
          <div className="text-3xl font-bold text-gray-900">
            {avgCVR.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {total}台のデータから算出
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

      {/* Top Performers */}
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
                {excellent.slice(0, 10).map((vehicle, index) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{index + 1}
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
                      <span className={`text-sm font-medium ${getCVRColor(vehicle.cvr)}`}>
                        {vehicle.cvr.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/admin/inventory/${vehicle.id}`}
                        className="text-primary hover:text-primary/80"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">車両</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">価格</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">閲覧数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">問合せ数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CVR</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">推奨アクション</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {poor.slice(0, 15).map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
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
                      <span className={`text-sm font-medium ${getCVRColor(vehicle.cvr)}`}>
                        {vehicle.cvr.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="text-gray-600">
                        {vehicle.cvr < 1 ? '価格見直し推奨' : '情報・写真追加'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/admin/inventory/${vehicle.id}`}
                        className="text-primary hover:text-primary/80"
                      >
                        編集
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
