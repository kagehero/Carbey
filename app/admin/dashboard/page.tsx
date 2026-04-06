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
import { computeCvrDistribution, summarizeCvrFleetTiers } from '@/lib/cvrDistribution'
import {
  STAGNATION_DISTRIBUTION_BANDS,
  BAD_INVENTORY_STAGNATION_BANDS,
  buildPricingAnalyticsBands,
} from '@/lib/dashboardAnalyticsBands'
import {
  computeFleetWeightedAvgCvr,
  isCvrBelowFleetAvg,
  isDashboardPriceReviewCandidate,
  CVR_STATS_GOOD_MIN,
  CVR_STATS_REVIEW_MIN,
} from '@/lib/cvrPolicy'
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

  // 加重平均CVR（掲載有・在庫有・閲覧あり）
  const avgCVR = computeFleetWeightedAvgCvr(visibleOnSaleVehicles).toFixed(2)

  const onSaleVehicles = visibleOnSaleVehicles
  const cvrFleetTiers = summarizeCvrFleetTiers(visibleOnSaleVehicles)
  const lowCVR = cvrFleetTiers.poor

  const discountCandidates = visibleOnSaleVehicles.filter((i) => {
    const days = calculateStagnationDays(i.published_date!)
    const cvr = calculateCVR(i.email_inquiries, i.detail_views)
    const hasViews = (i.detail_views || 0) > 0
    return isDashboardPriceReviewCandidate(days, cvr, cvrFleetTiers.fleetAvgCVR, hasViews)
  })
  const discountCount = discountCandidates.length

  const stagnation180 = onSaleVehicles.filter(i => calculateStagnationDays(i.published_date!) >= 180).length
  const stagnation90 = onSaleVehicles.filter(i => {
    const d = calculateStagnationDays(i.published_date!)
    return d >= 90 && d < 180
  }).length
  const stagnation60 = onSaleVehicles.filter(i => {
    const d = calculateStagnationDays(i.published_date!)
    return d >= 60 && d < 90
  }).length

  const distribution = STAGNATION_DISTRIBUTION_BANDS.map((band) => {
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

  const stagnationAnalyticsData = BAD_INVENTORY_STAGNATION_BANDS.map((band) => {
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

  const cvrDistribution = computeCvrDistribution(visibleOnSaleVehicles)

  const pricingBands = buildPricingAnalyticsBands(cvrFleetTiers.fleetAvgCVR)
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
    cvrDistribution,
    cvrFleetTiers,
    pricingAnalyticsData,
    forecast,
    forecastInventorySnapshot,
    priceTrendData,
    priorityVehicles,
    discountCandidates,
    alerts: { stagnation60, stagnation90, stagnation180, lowCVR, pricingCandidates: discountCount }
  }
}

export default async function DashboardPage() {
  const {
    stats,
    distribution,
    stagnationAnalyticsData,
    cvrDistribution,
    cvrFleetTiers,
    pricingAnalyticsData,
    forecast,
    forecastInventorySnapshot,
    priceTrendData,
    priorityVehicles,
    discountCandidates,
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
                60日超（不良在庫）を約2週間単位など細かい帯に分割。棒＝台数、線＝販売中に占める割合。
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
            閲覧ありのCVRを0.1%刻みの帯に集計（データがある範囲を連続表示）。20%超は別枠（合計＝掲載有・在庫有）
          </p>
          <CVRAnalyticsChart
            rows={cvrDistribution.rows}
            totalOnSale={cvrDistribution.total}
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow px-6 pt-6 pb-3">
          <h2 className="text-base font-semibold text-slate-800 mb-1">価格最適化</h2>
          <p className="text-sm text-slate-500 mb-5">
            価格検討対象（閲覧あり・在庫加重平均CVR未満・滞留60日以上）のみを滞留日帯に分類。ドーナツ＝掲載在庫に占める台数割合（%）
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
          <h2 className="text-base font-semibold text-slate-800 mb-1">滞留日数分布</h2>
          <p className="text-xs text-slate-500 mb-4">掲載からの経過日数を細かい帯で表示（販売中のみ）</p>
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

            <p className="text-xs text-slate-500 mt-1 mb-3 leading-relaxed">
              要改善＝在庫加重平均を下回る台。検討＝平均以上かつ{CVR_STATS_REVIEW_MIN}%〜
              {CVR_STATS_GOOD_MIN}%未満。良好＝{CVR_STATS_GOOD_MIN}%以上（閲覧あり・排他）。
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2 border-t border-slate-100">
              <div className="rounded-lg bg-rose-50/80 p-3 border border-rose-100/80">
                <p className="text-xs text-slate-600 font-medium">要改善（平均未満）</p>
                <p className="text-xl font-bold text-rose-600 mt-0.5 tabular-nums">
                  {cvrFleetTiers.poor}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50/90 p-3 border border-amber-100/80">
                <p className="text-xs text-slate-600 font-medium">
                  検討（{CVR_STATS_REVIEW_MIN}〜{CVR_STATS_GOOD_MIN}%未満）
                </p>
                <p className="text-xl font-bold text-amber-700 mt-0.5 tabular-nums">
                  {cvrFleetTiers.review}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50/80 p-3 border border-emerald-100/80">
                <p className="text-xs text-slate-500 font-medium">良好（{CVR_STATS_GOOD_MIN}%以上）</p>
                <p className="text-xl font-bold text-emerald-600 mt-0.5 tabular-nums">
                  {cvrFleetTiers.good}
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
        <PriorityTable vehicles={priorityVehicles} fleetAvgCvr={cvrFleetTiers.fleetAvgCVR} />
      </div>

      {/* Discount Candidates */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">値下げ検討対象</h2>
          <p className="text-sm text-slate-500 mt-1">
            閲覧あり・在庫加重平均CVR未満・滞留60日以上
          </p>
        </div>
        <DiscountCandidates vehicles={discountCandidates} />
      </div>
    </div>
  )
}
