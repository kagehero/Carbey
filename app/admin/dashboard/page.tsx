import { createClient } from '@/lib/supabase/server'
import StagnationChart from '@/components/analytics/StagnationChart'
import StagnationAnalyticsChart from '@/components/analytics/StagnationAnalyticsChart'
import CVRAnalyticsChart from '@/components/analytics/CVRAnalyticsChart'
import PricingAnalyticsChart from '@/components/analytics/PricingAnalyticsChart'
import PriorityTable from '@/components/analytics/PriorityTable'
import DiscountCandidates from '@/components/analytics/DiscountCandidates'
import DashboardStats from '@/components/analytics/DashboardStats'
import DashboardAlerts from '@/components/analytics/DashboardAlerts'
import { calculateStagnationDays, calculateCVR } from '@/lib/utils'
import { computeAIForecast } from '@/lib/aiForecast'
import AIAnalysisForecast from '@/components/analytics/AIAnalysisForecast'
import { Database } from '@/types/database'
import { Timer } from 'lucide-react'
import { isVisibleOnSale, isInStock } from '@/lib/inventoryMetrics'
import PriceChangeTrendChart from '@/components/analytics/PriceChangeTrendChart'
import type { InventoryForForecast } from '@/lib/aiForecast'

type Inventory = Database['public']['Tables']['inventories']['Row']

async function getDashboardStats() {
  const supabase = await createClient()

  const { data: inventories, error } = await supabase
    .from('inventories')
    .select('*')
    .order('inserted_at', { ascending: false })

  if (error) throw error

  const typedInventories = (inventories || []) as Inventory[]

  const onSale = typedInventories.filter((i) => isVisibleOnSale(i)).length || 0
  const total = typedInventories.filter((i) => isInStock(i)).length || 0
  const sold = typedInventories.filter(i => i.status === '売約済').length || 0
  const unpublished = typedInventories.filter(i => i.status === '非公開').length || 0

  const publishedAndInStock = typedInventories.filter((i) => isVisibleOnSale(i)).length
  const notPublishedAndInStock = typedInventories.filter(
    (i) => i.publication_status === '非掲載' && i.stock_status === 'あり'
  ).length

  const inStock = typedInventories.filter(i => i.stock_status === 'あり').length || 0
  const outOfStock = typedInventories.filter(i => i.stock_status === 'なし').length || 0

  // 販売中車両（掲載有・在庫有）を分析対象に
  const visibleOnSaleVehicles = typedInventories.filter(
    (i) => isVisibleOnSale(i) && i.published_date
  )

  // Calculate average stagnation（掲載有・在庫有のみ）
  const stagnationDays = visibleOnSaleVehicles
    .map(i => calculateStagnationDays(i.published_date!))
  const avgStagnation = stagnationDays.length > 0
    ? Math.round(stagnationDays.reduce((a, b) => a + b, 0) / stagnationDays.length)
    : 0

  // Calculate average CVR（掲載有・在庫有のみ）
  const cvrs = visibleOnSaleVehicles
    .filter(i => i.detail_views && i.detail_views > 0)
    .map(i => calculateCVR(i.email_inquiries, i.detail_views))
  const avgCVR = cvrs && cvrs.length > 0
    ? (cvrs.reduce((a, b) => a + b, 0) / cvrs.length).toFixed(2)
    : '0.00'

  // 値下げ検討対象（掲載有・在庫有のみ、滞留60日以上 or CVR2%未満）
  const discountCandidates = visibleOnSaleVehicles.filter(i => {
    const days = calculateStagnationDays(i.published_date!)
    const cvr = calculateCVR(i.email_inquiries, i.detail_views)
    return days >= 60 || cvr < 2
  })
  const discountCount = discountCandidates.length

  const onSaleVehicles = visibleOnSaleVehicles
  const stagnation180 = onSaleVehicles.filter(i => calculateStagnationDays(i.published_date!) >= 180).length
  const stagnation90 = onSaleVehicles.filter(i => {
    const d = calculateStagnationDays(i.published_date!)
    return d >= 90 && d < 180
  }).length
  const stagnation60 = onSaleVehicles.filter(i => {
    const d = calculateStagnationDays(i.published_date!)
    return d >= 60 && d < 90
  }).length
  const lowCVR = onSaleVehicles.filter(i => {
    const cvr = calculateCVR(i.email_inquiries, i.detail_views)
    return i.detail_views && i.detail_views > 0 && cvr > 0 && cvr < 2
  }).length

  // Stagnation distribution
  const stagnationBands = [
    { label: '0-15日', min: 0, max: 15 },
    { label: '16-30日', min: 16, max: 30 },
    { label: '31-45日', min: 31, max: 45 },
    { label: '46-60日', min: 46, max: 60 },
    { label: '61-90日', min: 61, max: 90 },
    { label: '91-120日', min: 91, max: 120 },
    { label: '121-180日', min: 121, max: 180 },
    { label: '181-240日', min: 181, max: 240 },
    { label: '241-365日', min: 241, max: 365 },
    { label: '366日超', min: 366, max: Infinity },
  ]

  const distribution = stagnationBands.map(band => {
    const count = typedInventories.filter(i => {
      if (!isVisibleOnSale(i) || !i.published_date) return false
      const days = calculateStagnationDays(i.published_date)
      return days >= band.min && days <= band.max
    }).length || 0

    return {
      name: band.label,
      count,
      percentage: onSale > 0 ? Math.round((count / onSale) * 100) : 0
    }
  })

  // Stagnation analytics: 不良在庫（60日以上）by band - bar: count, line: ratio
  const badInventoryBands = [
    { label: '61-90日', min: 61, max: 90 },
    { label: '91-120日', min: 91, max: 120 },
    { label: '121-180日', min: 121, max: 180 },
    { label: '181-240日', min: 181, max: 240 },
    { label: '241-365日', min: 241, max: 365 },
    { label: '366日超', min: 366, max: Infinity },
  ]
  const stagnationAnalyticsData = badInventoryBands.map((band) => {
    const count = onSaleVehicles.filter((i) => {
      const d = calculateStagnationDays(i.published_date!)
      return d >= band.min && d <= band.max
    }).length
    return {
      name: band.label,
      count,
      ratio: onSale > 0 ? Math.round((count / onSale) * 1000) / 10 : 0,
    }
  })

  // CVR analytics: 要改善 vs 改善見込み vs 優秀（掲載有・在庫有のみ）
  const cvrExcellent = visibleOnSaleVehicles.filter(
    (i) => calculateCVR(i.email_inquiries, i.detail_views) >= 5
  ).length
  const cvrGood = visibleOnSaleVehicles.filter((i) => {
    const cvr = calculateCVR(i.email_inquiries, i.detail_views)
    return cvr >= 2 && cvr < 5
  }).length
  const cvrPoor = visibleOnSaleVehicles.filter((i) => {
    const cvr = calculateCVR(i.email_inquiries, i.detail_views)
    return cvr > 0 && cvr < 2
  }).length
  const cvrWithData = visibleOnSaleVehicles.filter(
    (i) => i.detail_views && i.detail_views > 0
  ).length
  const cvrAnalyticsData = [
    {
      name: 'CVR分析',
      要改善: cvrPoor,
      改善見込み: cvrGood,
      優秀: cvrExcellent,
    },
  ]

  // Pricing analytics: 値下げ対象 by urgency band
  const pricingBands = [
    { label: '緊急(180日超)', fn: (i: Inventory) => calculateStagnationDays(i.published_date!) >= 180 },
    {
      label: '要検討(90-179日)',
      fn: (i: Inventory) => {
        const d = calculateStagnationDays(i.published_date!)
        return d >= 90 && d < 180
      },
    },
    {
      label: '注視(60-89日)',
      fn: (i: Inventory) => {
        const d = calculateStagnationDays(i.published_date!)
        return d >= 60 && d < 90
      },
    },
    {
      label: 'CVR低のみ',
      fn: (i: Inventory) => {
        const d = calculateStagnationDays(i.published_date!)
        const cvr = calculateCVR(i.email_inquiries, i.detail_views)
        return d < 60 && i.detail_views && i.detail_views > 0 && cvr > 0 && cvr < 2
      },
    },
  ]
  const pricingAnalyticsData = pricingBands.map((band) => {
    const count = onSaleVehicles.filter((i) => band.fn(i)).length
    return {
      name: band.label,
      count,
      ratio: onSale > 0 ? Math.round((count / onSale) * 1000) / 10 : 0,
    }
  })

  // AI分析・将来予測（掲載有・在庫有のみ、現実的回転率ベース）
  const forecastInventorySnapshot: InventoryForForecast[] = visibleOnSaleVehicles.map((i) => ({
    status: i.status || '',
    price_body: i.price_body,
    detail_views: i.detail_views,
    email_inquiries: i.email_inquiries,
    published_date: i.published_date,
  }))

  const forecast = computeAIForecast(forecastInventorySnapshot)

  // 直近30日の価格変更件数（時系列）
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: priceHistRows } = await supabase
    .from('price_histories')
    .select('changed_at')
    .gte('changed_at', since30)

  const dayCounts = new Map<string, number>()
  const histRows = (priceHistRows || []) as { changed_at: string }[]
  for (const row of histRows) {
    const ca = row.changed_at
    if (!ca) continue
    const day = ca.slice(0, 10)
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1)
  }
  const priceTrendData: { date: string; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    priceTrendData.push({ date: label, count: dayCounts.get(key) || 0 })
  }

  // Priority vehicles (high stagnation + low CVR)（掲載有・在庫有のみ）
  const priorityVehicles = typedInventories
    .filter((i) => isVisibleOnSale(i) && i.published_date)
    .map(i => {
      const stagnation = calculateStagnationDays(i.published_date!)
      const cvr = calculateCVR(i.email_inquiries, i.detail_views)
      const score = (stagnation * 1.0) + ((5 - cvr) * 10.0)
      return { ...i, stagnation, cvr, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  return {
    stats: {
      total,
      onSale,
      sold,
      unpublished,
      published: publishedAndInStock,
      notPublished: notPublishedAndInStock,
      inStock,
      outOfStock,
      avgStagnation,
      avgCVR,
      discountCount
    },
    distribution,
    stagnationAnalyticsData,
    cvrAnalyticsData,
    cvrWithData,
    pricingAnalyticsData,
    forecast,
    forecastInventorySnapshot,
    priceTrendData,
    priorityVehicles,
    discountCandidates,
    inventories: typedInventories,
    alerts: { stagnation60, stagnation90, stagnation180, lowCVR, pricingCandidates: discountCount }
  }
}

export default async function DashboardPage() {
  const {
    stats,
    distribution,
    stagnationAnalyticsData,
    cvrAnalyticsData,
    cvrWithData,
    pricingAnalyticsData,
    forecast,
    forecastInventorySnapshot,
    priceTrendData,
    priorityVehicles,
    discountCandidates,
    inventories,
    alerts,
  } = await getDashboardStats()

  return (
    <div className="space-y-8">
      <DashboardAlerts {...alerts} />
      <DashboardStats initialStats={stats} />

      {/* AI分析・将来予測 */}
      <AIAnalysisForecast forecast={forecast} inventorySnapshot={forecastInventorySnapshot} />

      {/* 分析結果グラフ（棒・線） */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow px-6 pt-5 pb-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Timer className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-slate-800">滞留分析</h2>
              <p className="text-sm text-slate-500 mt-0.5 leading-snug">
                60日超の滞留（不良在庫）を帯別に表示。棒＝台数、線＝全体に占める割合。
              </p>
            </div>
          </div>
          <StagnationAnalyticsChart
            data={stagnationAnalyticsData}
            totalOnSale={stats.onSale}
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow px-6 pt-6 pb-3">
          <h2 className="text-base font-semibold text-slate-800 mb-1">CVR分析</h2>
          <p className="text-sm text-slate-500 mb-5">
            要改善数値と改善見込み数値の対比
          </p>
          <CVRAnalyticsChart
            data={cvrAnalyticsData}
            total={cvrWithData || stats.onSale}
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow px-6 pt-6 pb-3">
          <h2 className="text-base font-semibold text-slate-800 mb-1">価格最適化</h2>
          <p className="text-sm text-slate-500 mb-5">
            値下げ対象台数（棒）と割合（線）
          </p>
          <PricingAnalyticsChart
            data={pricingAnalyticsData}
            totalOnSale={stats.onSale}
          />
        </div>
      </div>

      {/* 価格変更トレンド（時系列） */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">価格変更の動き</h2>
            <p className="text-sm text-slate-500 mt-0.5">直近30日の価格変更件数（変更履歴ベース）</p>
          </div>
          <a
            href="/admin/analytics/pricing"
            className="text-sm text-sky-600 hover:text-sky-700 font-medium shrink-0"
          >
            価格最適化へ →
          </a>
        </div>
        <PriceChangeTrendChart data={priceTrendData} />
      </div>

      {/* 滞留日数分布・CVR統計 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-5">滞留日数分布</h2>
          <StagnationChart data={distribution} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-5">CVR統計</h2>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-500">平均CVR</span>
                <span className="text-2xl font-bold text-slate-800 tabular-nums">
                  {stats.avgCVR}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sky-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(parseFloat(stats.avgCVR) * 20, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-5 border-t border-slate-100">
              <div className="rounded-lg bg-emerald-50/80 p-3">
                <p className="text-xs text-slate-500 font-medium">優秀 (≥5%)</p>
                <p className="text-xl font-bold text-emerald-600 mt-0.5 tabular-nums">
                  {inventories.filter(i => calculateCVR(i.email_inquiries, i.detail_views) >= 5).length}
                </p>
              </div>
              <div className="rounded-lg bg-sky-50/80 p-3">
                <p className="text-xs text-slate-500 font-medium">良好 (2-5%)</p>
                <p className="text-xl font-bold text-sky-600 mt-0.5 tabular-nums">
                  {inventories.filter(i => {
                    const cvr = calculateCVR(i.email_inquiries, i.detail_views)
                    return cvr >= 2 && cvr < 5
                  }).length}
                </p>
              </div>
              <div className="rounded-lg bg-rose-50/80 p-3">
                <p className="text-xs text-slate-500 font-medium">要改善 (&lt;2%)</p>
                <p className="text-xl font-bold text-rose-600 mt-0.5 tabular-nums">
                  {inventories.filter(i => {
                    const cvr = calculateCVR(i.email_inquiries, i.detail_views)
                    return cvr > 0 && cvr < 2
                  }).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Vehicles */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">優先販売ランキング</h2>
          <p className="text-sm text-slate-500 mt-1">
            滞留日数とCVRから算出した優先度の高い車両
          </p>
        </div>
        <PriorityTable vehicles={priorityVehicles} />
      </div>

      {/* Discount Candidates */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">値下げ検討対象</h2>
          <p className="text-sm text-slate-500 mt-1">
            滞留60日以上 または CVR 2%未満の車両
          </p>
        </div>
        <DiscountCandidates vehicles={discountCandidates} />
      </div>
    </div>
  )
}
