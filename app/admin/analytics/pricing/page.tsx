import { createClient } from '@/lib/supabase/server'
import { VISIBLE_ON_SALE_MATCH } from '@/lib/inventoryMetrics'
import { calculateStagnationDays, calculateCVR, formatPrice } from '@/lib/utils'
import {
  computeFleetWeightedAvgCvr,
  isCvrBelowFleetAvg,
  isDashboardPriceReviewCandidate,
  computePricingRuleAndAI,
} from '@/lib/cvrPolicy'
import { AlertCircle, TrendingDown, CheckCircle } from 'lucide-react'
import PricingTabs from '@/components/pricing/PricingTabs'
import PriceListExportButton from '@/components/pricing/PriceListExportButton'

async function getPricingData() {
  const supabase = await createClient()

  const { data: inventories } = await supabase
    .from('inventories')
    .select('*')
    .match(VISIBLE_ON_SALE_MATCH)

  const vehicles = (inventories || []).map((v: any) => ({
    ...v,
    stagnation_days: calculateStagnationDays(v.published_date),
    cvr: calculateCVR(v.email_inquiries, v.detail_views)
  }))

  const fleetAvgCvr = computeFleetWeightedAvgCvr(inventories || [])

  /** ダッシュボードと同条件：閲覧あり・CVRが在庫加重平均未満・滞留60日以上 */
  const discountCandidates = vehicles
    .filter((v) => {
      const hasViews = (v.detail_views || 0) > 0
      return isDashboardPriceReviewCandidate(v.stagnation_days, v.cvr, fleetAvgCvr, hasViews)
    })
    .sort((a, b) => {
      const score = (x: { cvr: number; stagnation_days: number; detail_views?: number | null }) => {
        const hv = (x.detail_views || 0) > 0
        const cvrPart =
          hv && isCvrBelowFleetAvg(x.cvr, fleetAvgCvr, true) ? fleetAvgCvr - x.cvr : 0
        return cvrPart * 1000 + x.stagnation_days
      }
      return score(b) - score(a)
    })

  const withSuggestions = discountCandidates.map((v: any) => {
    const hasViews = (v.detail_views || 0) > 0
    const { optimization, ai } = computePricingRuleAndAI(
      v.cvr,
      fleetAvgCvr,
      v.stagnation_days,
      hasViews
    )
    const currentPrice = v.price_body || 0
    const suggestedPriceOptimization = Math.floor(currentPrice * (1 - optimization.pct / 100))
    const suggestedPriceAI = Math.floor(currentPrice * (1 - ai.pct / 100))
    return {
      ...v,
      currentPrice,
      costPrice: v.cost_price ?? null,
      discountPctOptimization: optimization.pct,
      suggestedPriceOptimization,
      discountAmountOptimization: currentPrice - suggestedPriceOptimization,
      reasonOptimization: optimization.reasons.join(', '),
      discountPctAI: ai.pct,
      suggestedPriceAI,
      discountAmountAI: currentPrice - suggestedPriceAI,
      reasonAI: ai.reasons.join(', '),
    }
  })

  // Get price histories
  const { data: priceHistories } = await supabase
    .from('price_histories')
    .select('*, inventories(maker, car_name)')
    .order('changed_at', { ascending: false })
    .limit(500)

  const withViewsCount = vehicles.filter((v) => (v.detail_views || 0) > 0).length
  const cvrAboveAvgCount = vehicles.filter((v) => {
    const hv = (v.detail_views || 0) > 0
    return hv && !isCvrBelowFleetAvg(v.cvr, fleetAvgCvr, true)
  }).length

  return {
    discountCandidates: withSuggestions,
    priceHistories: priceHistories || [],
    fleetAvgCvr,
    cvrAboveAvgCount,
    withViewsCount,
  }
}

export default async function PricingOptimizationPage({
  searchParams,
}: {
  searchParams: Promise<{ highlight?: string }>
}) {
  const { highlight } = await searchParams
  const { discountCandidates, priceHistories, fleetAvgCvr, cvrAboveAvgCount, withViewsCount } =
    await getPricingData()

  const totalPotentialSavings = discountCandidates.reduce((sum, v: any) => sum + (v.discountAmountOptimization || 0), 0)

  const guardrails = {
    minPriceYen: parseInt(process.env.PRICING_MIN_PRICE_YEN || '0', 10) || 0,
    minMarginYen: parseInt(process.env.PRICING_MIN_MARGIN_YEN || '0', 10) || 0,
    maxDiscountPct: parseFloat(process.env.PRICING_MAX_DISCOUNT_PCT || '25') || 25,
    maxDiscountYen: parseInt(process.env.PRICING_MAX_DISCOUNT_YEN || '500000', 10) || 500000,
  }

  const generatedAt = new Date().toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).replace(/\//g, '').replace(/:/g, '').replace(' ', '_').replace(',', '')

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">価格最適化</h1>
          <p className="text-gray-500 mt-1 text-sm">
            価格見直し対象：閲覧あり・在庫加重平均CVR未満・滞留60日以上（ダッシュボードと同一条件）
          </p>
        </div>
        {discountCandidates.length > 0 && (
          <PriceListExportButton rows={discountCandidates as any} generatedAt={generatedAt} />
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-1">価格見直し対象</div>
              <div className="text-3xl font-bold text-gray-900">
                {discountCandidates.length}台
              </div>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-1">推奨値下げ総額</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatPrice(totalPotentialSavings)}
              </div>
            </div>
            <TrendingDown className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-1">CVR平均以上（閲覧あり）</div>
              <div className="text-3xl font-bold text-gray-900">
                {cvrAboveAvgCount}台
              </div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-xs text-gray-400 mt-3">
            加重平均CVR {fleetAvgCvr.toFixed(2)}%（閲覧{withViewsCount}台ベース）／閲覧0台は対象外
          </p>
        </div>
      </div>

      {/* 価格見直し推奨 / 変更履歴 タブ */}
      <PricingTabs
        discountCandidates={discountCandidates as any}
        priceHistories={priceHistories as any}
        guardrails={guardrails}
        highlightVehicleId={highlight}
        fleetAvgCvr={fleetAvgCvr}
      />
    </div>
  )
}
