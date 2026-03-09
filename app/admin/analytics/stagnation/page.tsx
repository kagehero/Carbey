import { createClient } from '@/lib/supabase/server'
import { calculateStagnationDays, getStagnationBand, getStagnationColor, formatPrice } from '@/lib/utils'
import { Download, TrendingUp, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

async function getStagnationData() {
  const supabase = await createClient()

  const { data: inventories } = await supabase
    .from('inventories')
    .select('*')
    .eq('status', '販売中')
    .order('published_date', { ascending: true })

  const vehicles = (inventories || []).map((v: any) => ({
    ...v,
    stagnation_days: calculateStagnationDays(v.published_date),
    band: getStagnationBand(calculateStagnationDays(v.published_date!))
  }))

  // Group by bands
  const bands = {
    normal: vehicles.filter(v => v.band === 'normal'),
    watch: vehicles.filter(v => v.band === 'watch'),
    attention: vehicles.filter(v => v.band === 'attention'),
    critical: vehicles.filter(v => v.band === 'critical'),
    urgent: vehicles.filter(v => v.band === 'urgent'),
  }

  const total = vehicles.length

  return { vehicles, bands, total }
}

export default async function StagnationAnalysisPage() {
  const { vehicles, bands, total } = await getStagnationData()

  const bandInfo = [
    { key: 'normal', label: '0-30日 (正常)', color: 'bg-green-100 text-green-800 border-green-200', count: bands.normal.length },
    { key: 'watch', label: '31-45日 (注視)', color: 'bg-blue-100 text-blue-800 border-blue-200', count: bands.watch.length },
    { key: 'attention', label: '46-60日 (注意)', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', count: bands.attention.length },
    { key: 'critical', label: '61-180日 (警告)', color: 'bg-orange-100 text-orange-800 border-orange-200', count: bands.critical.length },
    { key: 'urgent', label: '180日超 (緊急)', color: 'bg-red-100 text-red-800 border-red-200', count: bands.urgent.length },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">滞留分析</h1>
          <p className="text-gray-500 mt-1">在庫の滞留状況を詳細に分析</p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" />
          CSVエクスポート
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {bandInfo.map((band) => (
          <div key={band.key} className={`${band.color} border rounded-lg p-4`}>
            <div className="text-sm font-medium mb-1">{band.label}</div>
            <div className="text-3xl font-bold">{band.count}</div>
            <div className="text-xs mt-1">
              {total > 0 ? Math.round((band.count / total) * 100) : 0}%
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Tables by Band */}
      {bandInfo.filter(b => b.count > 0).map((band) => {
        const key = band.key as keyof typeof bands
        const vehiclesInBand = bands[key]

        return (
          <div key={band.key} className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">{band.label}</h2>
                  <span className={`${band.color} border px-3 py-1 rounded-full text-sm font-medium`}>
                    {band.count}台
                  </span>
                </div>
                {band.key !== 'normal' && (
                  <div className="flex items-center gap-2 text-sm text-orange-600">
                    <AlertTriangle className="w-4 h-4" />
                    対応が必要な可能性があります
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      車両
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      価格
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      掲載開始日
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      滞留日数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      閲覧数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      問合せ数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vehiclesInBand.slice(0, 10).map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {vehicle.maker} {vehicle.car_name}
                        </div>
                        <div className="text-xs text-gray-500">{vehicle.grade}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {formatPrice(vehicle.price_body)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {vehicle.published_date ? new Date(vehicle.published_date).toLocaleDateString('ja-JP') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getStagnationColor(vehicle.stagnation_days)}`}>
                          {vehicle.stagnation_days}日
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vehicle.detail_views || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vehicle.email_inquiries || 0}
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

              {vehiclesInBand.length > 10 && (
                <div className="p-4 text-center border-t border-gray-200 text-sm text-gray-500">
                  ... 他 {vehiclesInBand.length - 10}台
                </div>
              )}
            </div>
          </div>
        )
      })}

      {total === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">販売中の在庫がありません</p>
        </div>
      )}
    </div>
  )
}
