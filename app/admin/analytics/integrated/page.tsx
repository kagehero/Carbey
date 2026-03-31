import { createClient } from '@/lib/supabase/server'
import { VISIBLE_ON_SALE_MATCH } from '@/lib/inventoryMetrics'
import { calculateStagnationDays, calculateCVR, formatPrice } from '@/lib/utils'
import { computeAIForecast } from '@/lib/aiForecast'
import IntegratedAnalysisTable from '@/components/analytics/IntegratedAnalysisTable'
import AIAnalysisForecast from '@/components/analytics/AIAnalysisForecast'
import Link from 'next/link'
import { BarChart2 } from 'lucide-react'

async function getIntegratedData() {
  const supabase = await createClient()

  const { data: inventories } = await supabase
    .from('inventories')
    .select('*')
    .match(VISIBLE_ON_SALE_MATCH)

  const vehicles = (inventories || []).map((v: any) => {
    const stagnation_days = calculateStagnationDays(v.published_date)
    const cvr = calculateCVR(v.email_inquiries, v.detail_views)
    const currentPrice = v.price_body || 0

    // Optimization suggestion (same logic as pricing page)
    let optPct = 0
    const optReason: string[] = []
    if (stagnation_days >= 180) { optPct = 15; optReason.push('180日超') }
    else if (stagnation_days >= 90) { optPct = 10; optReason.push('90日超') }
    else if (stagnation_days >= 60) { optPct = 5; optReason.push('60日超') }
    if (cvr < 1 && v.detail_views && v.detail_views > 10) {
      optPct = Math.max(optPct, 10); optReason.push('CVR極低')
    } else if (cvr < 2 && cvr > 0) {
      optPct = Math.max(optPct, 5); optReason.push('CVR低')
    }
    const suggestedPriceOpt = optPct > 0 ? Math.floor(currentPrice * (1 - optPct / 100)) : null

    // AI suggestion
    let aiPct = 0
    const aiReason: string[] = []
    if (stagnation_days >= 365) { aiPct = 20; aiReason.push('365日超') }
    else if (stagnation_days >= 240) { aiPct = 18; aiReason.push('240日超') }
    else if (stagnation_days >= 180) { aiPct = 15; aiReason.push('180日超') }
    else if (stagnation_days >= 120) { aiPct = 12; aiReason.push('120日超') }
    else if (stagnation_days >= 90) { aiPct = 10; aiReason.push('90日超') }
    else if (stagnation_days >= 60) { aiPct = 6; aiReason.push('60日超') }
    const views = v.detail_views || 0
    if (cvr === 0 && views >= 30) { aiPct = Math.max(aiPct, 12); aiReason.push('CVR0(閲覧多)') }
    else if (cvr < 0.5 && views >= 20) { aiPct = Math.max(aiPct, 10); aiReason.push('CVR極低(閲覧多)') }
    else if (cvr < 1 && views >= 10) { aiPct = Math.max(aiPct, 8); aiReason.push('CVR低(閲覧有)') }
    else if (cvr < 2 && cvr > 0) { aiPct = Math.max(aiPct, 6); aiReason.push('CVR低') }
    const suggestedPriceAI = aiPct > 0 ? Math.floor(currentPrice * (1 - aiPct / 100)) : null

    return {
      id: v.id,
      maker: v.maker,
      car_name: v.car_name,
      grade: v.grade,
      year: v.year,
      mileage: v.mileage,
      color: v.color,
      status: v.status || '販売中',
      stagnation_days,
      cvr,
      detail_views: v.detail_views || 0,
      email_inquiries: v.email_inquiries || 0,
      currentPrice,
      cost_price: v.cost_price,
      suggestedPriceOpt,
      discountPctOpt: optPct,
      discountAmountOpt: suggestedPriceOpt != null ? currentPrice - suggestedPriceOpt : 0,
      reasonOpt: optReason.join(', '),
      suggestedPriceAI,
      discountPctAI: aiPct,
      discountAmountAI: suggestedPriceAI != null ? currentPrice - suggestedPriceAI : 0,
      reasonAI: aiReason.join(', '),
    }
  }).sort((a, b) => b.stagnation_days - a.stagnation_days)

  const forecastSnapshot = (inventories || []).map((v: any) => ({
    status: v.status || '販売中',
    price_body: v.price_body,
    detail_views: v.detail_views,
    email_inquiries: v.email_inquiries,
    published_date: v.published_date,
  }))
  const forecast = computeAIForecast(forecastSnapshot)

  return { vehicles, forecast, forecastSnapshot }
}

export default async function IntegratedAnalysisPage() {
  const { vehicles, forecast, forecastSnapshot } = await getIntegratedData()

  const urgentCount = vehicles.filter(v => v.stagnation_days >= 180).length
  const warnCount = vehicles.filter(v => v.stagnation_days >= 60 && v.stagnation_days < 180).length
  const lowCVRCount = vehicles.filter(v => v.cvr > 0 && v.cvr < 2).length
  const hasProposal = vehicles.filter(v => v.suggestedPriceOpt != null || v.suggestedPriceAI != null).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart2 className="w-7 h-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">統合分析ビュー</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            滞留・CVR・AI価格提案を1画面で確認
          </p>
        </div>
      </div>

      {/* AI分析・将来予測 */}
      <AIAnalysisForecast forecast={forecast} inventorySnapshot={forecastSnapshot} />

      {/* Quick summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-700">{urgentCount}台</div>
          <div className="text-sm text-red-600 font-medium">滞留180日超（緊急）</div>
          <Link href="/admin/analytics/stagnation" className="text-xs text-red-500 hover:underline">滞留分析 →</Link>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-700">{warnCount}台</div>
          <div className="text-sm text-orange-600 font-medium">滞留60〜179日（警告）</div>
          <Link href="/admin/analytics/stagnation" className="text-xs text-orange-500 hover:underline">滞留分析 →</Link>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-700">{lowCVRCount}台</div>
          <div className="text-sm text-yellow-600 font-medium">CVR 2%未満</div>
          <Link href="/admin/analytics/cvr" className="text-xs text-yellow-500 hover:underline">CVR分析 →</Link>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-700">{hasProposal}台</div>
          <div className="text-sm text-blue-600 font-medium">価格提案あり</div>
          <Link href="/admin/analytics/pricing" className="text-xs text-blue-500 hover:underline">価格最適化 →</Link>
        </div>
      </div>

      {/* Integrated table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">掲載有・在庫有 — 横断データ一覧</h2>
          <p className="text-xs text-gray-500 mt-0.5">滞留・CVR・提案価格を比較しながら優先順位を判断できます</p>
        </div>
        <IntegratedAnalysisTable vehicles={vehicles} />
      </div>
    </div>
  )
}
