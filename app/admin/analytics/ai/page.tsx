import { createClient } from '@/lib/supabase/server'
import { computeAIForecast } from '@/lib/aiForecast'
import AIAnalysisForecast from '@/components/analytics/AIAnalysisForecast'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

async function getAIData() {
  const supabase = await createClient()

  // 掲載有・在庫有（公開中の在庫車両）のみでAI予測
  const { data: inventories } = await supabase
    .from('inventories')
    .select('*')
    .eq('publication_status', '掲載')
    .eq('stock_status', 'あり')

  const forecast = computeAIForecast(
    (inventories || []).map((i: any) => ({
      status: i.status || '販売中',
      price_body: i.price_body,
      detail_views: i.detail_views,
      email_inquiries: i.email_inquiries,
      published_date: i.published_date,
    }))
  )

  return { forecast }
}

export default async function AIAnalysisPage() {
  const { forecast } = await getAIData()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-indigo-100">
          <Sparkles className="w-7 h-7 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI分析</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            CVR改善時の想定回転率・売上高の将来予測
          </p>
        </div>
      </div>

      <AIAnalysisForecast forecast={forecast} />

      <div className="flex gap-3">
        <Link
          href="/admin/analytics/integrated"
          className="text-sm text-indigo-600 hover:underline font-medium"
        >
          統合分析ビュー →
        </Link>
        <Link
          href="/admin/analytics/cvr"
          className="text-sm text-indigo-600 hover:underline font-medium"
        >
          CVR分析 →
        </Link>
      </div>
    </div>
  )
}
