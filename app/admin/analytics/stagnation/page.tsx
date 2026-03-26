import { createClient } from '@/lib/supabase/server'
import { VISIBLE_ON_SALE_MATCH } from '@/lib/inventoryMetrics'
import { calculateStagnationDays } from '@/lib/utils'
import { Download, TrendingUp, AlertTriangle } from 'lucide-react'
import StagnationBandTable from '@/components/analytics/StagnationBandTable'

const STAGNATION_BANDS = [
  { key: 'b0_15', label: '0-15日', min: 0, max: 15, tone: '正常', color: 'bg-green-100 text-green-800 border-green-200' },
  { key: 'b16_30', label: '16-30日', min: 16, max: 30, tone: '正常', color: 'bg-green-100 text-green-800 border-green-200' },
  { key: 'b31_45', label: '31-45日', min: 31, max: 45, tone: '注視', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { key: 'b46_60', label: '46-60日', min: 46, max: 60, tone: '注意', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { key: 'b61_90', label: '61-90日', min: 61, max: 90, tone: '警告', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { key: 'b91_120', label: '91-120日', min: 91, max: 120, tone: '警告', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { key: 'b121_180', label: '121-180日', min: 121, max: 180, tone: '警告', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { key: 'b181_240', label: '181-240日', min: 181, max: 240, tone: '緊急', color: 'bg-red-100 text-red-800 border-red-200' },
  { key: 'b241_365', label: '241-365日', min: 241, max: 365, tone: '緊急', color: 'bg-red-100 text-red-800 border-red-200' },
  { key: 'b366_plus', label: '366日超', min: 366, max: Infinity, tone: '緊急', color: 'bg-red-100 text-red-800 border-red-200' },
] as const

async function getStagnationData() {
  const supabase = await createClient()

  const { data: inventories } = await supabase
    .from('inventories')
    .select('*')
    .match(VISIBLE_ON_SALE_MATCH)
    .order('published_date', { ascending: true })

  const vehicles = (inventories || []).map((v: any) => {
    const stagnation_days = calculateStagnationDays(v.published_date)
    const band = STAGNATION_BANDS.find(b => stagnation_days >= b.min && stagnation_days <= b.max)?.key ?? 'b0_15'
    return {
      ...v,
      stagnation_days,
      band,
    }
  })

  const bands = Object.fromEntries(
    STAGNATION_BANDS.map(b => [b.key, vehicles.filter(v => v.band === b.key)])
  ) as Record<(typeof STAGNATION_BANDS)[number]['key'], any[]>

  const total = vehicles.length

  return { vehicles, bands, total }
}

export default async function StagnationAnalysisPage() {
  const { vehicles, bands, total } = await getStagnationData()

  const bandInfo = STAGNATION_BANDS.map(b => ({
    key: b.key,
    label: `${b.label} (${b.tone})`,
    color: b.color,
    count: bands[b.key].length,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">滞留分析</h1>
          <p className="text-gray-500 mt-1">
            掲載有・在庫有の車両のみを対象に滞留状況を分析します
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" />
          CSVエクスポート
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-10 gap-3">
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
        const vehiclesInBand = bands[key] || []

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
                {band.key !== 'b0_15' && band.key !== 'b16_30' && (
                  <div className="flex items-center gap-2 text-sm text-orange-600">
                    <AlertTriangle className="w-4 h-4" />
                    対応が必要な可能性があります
                  </div>
                )}
              </div>
            </div>

            <div className="p-6">
              <StagnationBandTable vehicles={vehiclesInBand} />
            </div>
          </div>
        )
      })}

      {total === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">掲載有・在庫有の在庫がありません</p>
        </div>
      )}
    </div>
  )
}
