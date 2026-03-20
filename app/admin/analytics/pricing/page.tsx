import { createClient } from '@/lib/supabase/server'
import { calculateStagnationDays, calculateCVR, formatPrice } from '@/lib/utils'
import { AlertCircle, TrendingDown, CheckCircle } from 'lucide-react'
import PricingTabs from '@/components/pricing/PricingTabs'
import PriceListExportButton from '@/components/pricing/PriceListExportButton'

async function getPricingData() {
  const supabase = await createClient()

  const { data: inventories } = await supabase
    .from('inventories')
    .select('*')
    .eq('status', '販売中')

  const vehicles = (inventories || []).map((v: any) => ({
    ...v,
    stagnation_days: calculateStagnationDays(v.published_date),
    cvr: calculateCVR(v.email_inquiries, v.detail_views)
  }))

  // Discount candidates: stagnation >= 60 OR cvr < 2
  const discountCandidates = vehicles.filter(v => 
    v.stagnation_days >= 60 || (v.cvr > 0 && v.cvr < 2)
  ).sort((a, b) => b.stagnation_days - a.stagnation_days)

  const suggestOptimization = (v: any) => {
    let discountPct = 0
    const reason: string[] = []
    
    if (v.stagnation_days >= 180) {
      discountPct = 15
      reason.push('180日超')
    } else if (v.stagnation_days >= 90) {
      discountPct = 10
      reason.push('90日超')
    } else if (v.stagnation_days >= 60) {
      discountPct = 5
      reason.push('60日超')
    }

    if (v.cvr < 1 && v.detail_views && v.detail_views > 10) {
      discountPct = Math.max(discountPct, 10)
      reason.push('CVR極低')
    } else if (v.cvr < 2 && v.cvr > 0) {
      discountPct = Math.max(discountPct, 5)
      reason.push('CVR低')
    }

    const currentPrice = v.price_body || 0
    const suggestedPrice = Math.floor(currentPrice * (1 - discountPct / 100))
    const discountAmount = currentPrice - suggestedPrice
    return { discountPct, suggestedPrice, discountAmount, reason: reason.join(', ') }
  }

  // "AI" mode here is a separate, more granular heuristic for verification.
  const suggestAI = (v: any) => {
    let discountPct = 0
    const reason: string[] = []

    // Base from stagnation (more granular than optimization)
    if (v.stagnation_days >= 365) {
      discountPct = 20
      reason.push('365日超')
    } else if (v.stagnation_days >= 240) {
      discountPct = 18
      reason.push('240日超')
    } else if (v.stagnation_days >= 180) {
      discountPct = 15
      reason.push('180日超')
    } else if (v.stagnation_days >= 120) {
      discountPct = 12
      reason.push('120日超')
    } else if (v.stagnation_days >= 90) {
      discountPct = 10
      reason.push('90日超')
    } else if (v.stagnation_days >= 60) {
      discountPct = 6
      reason.push('60日超')
    }

    // CVR sensitivity (adds weight with traffic)
    const views = v.detail_views || 0
    if (v.cvr === 0 && views >= 30) {
      discountPct = Math.max(discountPct, 12)
      reason.push('CVR0(閲覧多)')
    } else if (v.cvr < 0.5 && views >= 20) {
      discountPct = Math.max(discountPct, 10)
      reason.push('CVR極低(閲覧多)')
    } else if (v.cvr < 1 && views >= 10) {
      discountPct = Math.max(discountPct, 8)
      reason.push('CVR低(閲覧有)')
    } else if (v.cvr < 2 && v.cvr > 0) {
      discountPct = Math.max(discountPct, 6)
      reason.push('CVR低')
    }

    const currentPrice = v.price_body || 0
    const suggestedPrice = Math.floor(currentPrice * (1 - discountPct / 100))
    const discountAmount = currentPrice - suggestedPrice
    return { discountPct, suggestedPrice, discountAmount, reason: reason.join(', ') }
  }

  const withSuggestions = discountCandidates.map((v: any) => {
    const opt = suggestOptimization(v)
    const ai = suggestAI(v)
    return {
      ...v,
      currentPrice: v.price_body || 0,
      costPrice: v.cost_price ?? null,
      discountPctOptimization: opt.discountPct,
      suggestedPriceOptimization: opt.suggestedPrice,
      discountAmountOptimization: opt.discountAmount,
      reasonOptimization: opt.reason,
      discountPctAI: ai.discountPct,
      suggestedPriceAI: ai.suggestedPrice,
      discountAmountAI: ai.discountAmount,
      reasonAI: ai.reason,
    }
  })

  // Get price histories
  const { data: priceHistories } = await supabase
    .from('price_histories')
    .select('*, inventories(maker, car_name)')
    .order('changed_at', { ascending: false })
    .limit(500)

  return {
    discountCandidates: withSuggestions,
    priceHistories: priceHistories || [],
    total: vehicles.length
  }
}

export default async function PricingOptimizationPage() {
  const { discountCandidates, priceHistories, total } = await getPricingData()

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
          <p className="text-gray-500 mt-1">価格見直しの提案と履歴</p>
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
              <div className="text-sm text-gray-500 mb-1">値下げ検討対象</div>
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
              <div className="text-sm text-gray-500 mb-1">価格適正車両</div>
              <div className="text-3xl font-bold text-gray-900">
                {total - discountCandidates.length}台
              </div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* 価格見直し推奨 / 変更履歴 タブ */}
      <PricingTabs
        discountCandidates={discountCandidates as any}
        priceHistories={priceHistories as any}
        guardrails={guardrails}
      />
    </div>
  )
}
