import { createClient } from '@/lib/supabase/server'
import { VISIBLE_ON_SALE_MATCH } from '@/lib/inventoryMetrics'
import { calculateCVR } from '@/lib/utils'
import {
  computeFleetWeightedAvgCvr,
  classifyCvrStatSegment,
  CVR_STATS_GOOD_MIN,
  CVR_STATS_REVIEW_MIN,
} from '@/lib/cvrPolicy'
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

  const fleetAvgCvr = computeFleetWeightedAvgCvr(allInventories)

  const vehicles = allInventories
    .filter((v: any) => v.detail_views && v.detail_views > 0)
    .map((v: any) => ({
      ...v,
      cvr: calculateCVR(v.email_inquiries, v.detail_views),
    }))

  const good = vehicles.filter(
    (v) => classifyCvrStatSegment(v.cvr, fleetAvgCvr, true) === 'good'
  )
  const review = vehicles.filter(
    (v) => classifyCvrStatSegment(v.cvr, fleetAvgCvr, true) === 'review'
  )
  const poor = vehicles.filter(
    (v) => classifyCvrStatSegment(v.cvr, fleetAvgCvr, true) === 'poor'
  )

  const noData = allInventories.filter((v: any) => !v.detail_views || v.detail_views === 0)

  return {
    vehicles,
    good,
    review,
    poor,
    noData,
    fleetAvgCvr,
    total: vehicles.length,
  }
}

export default async function CVRAnalysisPage() {
  const { good, review, poor, noData, fleetAvgCvr, total } = await getCVRData()

  const summaryCards = [
    {
      key: 'fleet',
      label: '加重平均CVR（閲覧あり）',
      value: `${fleetAvgCvr.toFixed(2)}%`,
      sub: '在庫全体の基準線',
      color: 'text-gray-900',
      icon: Activity,
      bg: 'bg-white',
    },
    {
      key: 'good',
      label: `良好（${CVR_STATS_GOOD_MIN}%以上・平均以上）`,
      value: `${good.length}台`,
      sub: total > 0 ? `${Math.round((good.length / total) * 100)}%` : '0%',
      color: 'text-emerald-600',
      icon: TrendingUp,
      bg: 'bg-white',
    },
    {
      key: 'review',
      label: `検討（${CVR_STATS_REVIEW_MIN}〜${CVR_STATS_GOOD_MIN}%未満・平均以上）`,
      value: `${review.length}台`,
      sub: total > 0 ? `${Math.round((review.length / total) * 100)}%` : '0%',
      color: 'text-amber-600',
      icon: Activity,
      bg: 'bg-white',
    },
    {
      key: 'poor',
      label: '要改善（加重平均未満）',
      value: `${poor.length}台`,
      sub: total > 0 ? `${Math.round((poor.length / total) * 100)}%` : '0%',
      color: 'text-red-600',
      icon: TrendingDown,
      bg: 'bg-white',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CVR分析</h1>
        <p className="text-gray-500 mt-1">
          掲載有・在庫有の車両のみ。要改善は加重平均を下回る台、検討は平均以上で
          {CVR_STATS_REVIEW_MIN}%〜{CVR_STATS_GOOD_MIN}%未満、良好は{CVR_STATS_GOOD_MIN}%以上です。
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((cat) => (
          <div key={cat.key} className={`${cat.bg} rounded-lg shadow p-6`}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-500 leading-snug">{cat.label}</div>
              <cat.icon className={`w-5 h-5 shrink-0 ${cat.color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{cat.value}</div>
            <div className="text-xs text-gray-500 mt-2">{cat.sub}</div>
          </div>
        ))}
      </div>

      {noData.length > 0 && (
        <p className="text-sm text-gray-500">
          閲覧0の車両 {noData.length}台はCVR区分の対象外です（一覧には含めません）。
        </p>
      )}

      {good.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">良好</h2>
                <p className="text-sm text-gray-500">
                  CVR {CVR_STATS_GOOD_MIN}%以上かつ在庫加重平均以上
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <CVRTableWithPagination
              vehicles={good}
              unitLabel="台"
              fleetAvgCvr={fleetAvgCvr}
            />
          </div>
        </div>
      )}

      {review.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-amber-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">検討</h2>
                <p className="text-sm text-gray-500">
                  平均以上かつ CVR {CVR_STATS_REVIEW_MIN}%〜{CVR_STATS_GOOD_MIN}%未満
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <CVRTableWithPagination
              vehicles={review}
              unitLabel="台"
              fleetAvgCvr={fleetAvgCvr}
            />
          </div>
        </div>
      )}

      {poor.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-6 h-6 text-red-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">改善が必要な車両</h2>
                <p className="text-sm text-gray-500">
                  個別CVRが在庫の加重平均を下回る台 — 価格見直しや情報追加を検討
                </p>
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
          <Link href="/admin/inventory" className="text-sm text-blue-600 hover:underline mt-4 inline-block">
            在庫一覧へ
          </Link>
        </div>
      )}
    </div>
  )
}
