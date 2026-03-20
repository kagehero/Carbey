'use client'

import { formatPrice } from '@/lib/utils'
import type { AIForecastResult } from '@/lib/aiForecast'
import { TrendingUp, RotateCw, DollarSign, BarChart2 } from 'lucide-react'

interface AIAnalysisForecastProps {
  forecast: AIForecastResult
}

export default function AIAnalysisForecast({ forecast }: AIAnalysisForecastProps) {
  const {
    poorCVRCount,
    poorCVRAvgCVR,
    assumedAdditionalSales,
    assumedAdditionalRevenue,
    currentTurnoverRatePct,
    improvedTurnoverRatePct,
    currentAssumedMonthlyRevenue,
    improvedAssumedMonthlyRevenue,
    onSaleCount,
  } = forecast

  if (poorCVRCount === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-indigo-50">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">AI分析・将来予測</h2>
            <p className="text-sm text-slate-500">CVR改善時の想定効果</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 py-4">
          CVR要改善車両がありません。現状の数値で良好です。
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">AI分析・将来予測</h2>
            <p className="text-sm text-slate-500">
              CVR改善（要改善→2.5%想定）時の想定回転率・売上高
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs text-slate-500 font-medium mb-1">前提</p>
          <p className="text-sm text-slate-700">
            要改善車両 <span className="font-semibold text-slate-800">{poorCVRCount}台</span>
            （現状平均CVR {poorCVRAvgCVR.toFixed(2)}%）が
            2.5%に改善した場合のシミュレーション
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <RotateCw className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-500 font-medium">想定回転率（月）</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-slate-600">
                {currentTurnoverRatePct.toFixed(1)}%
              </span>
              <span className="text-slate-400">→</span>
              <span className="text-lg font-bold text-indigo-600">
                {improvedTurnoverRatePct.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              在庫{onSaleCount}台に対する月間販売想定
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-500 font-medium">想定追加販売台数</span>
            </div>
            <div className="text-2xl font-bold text-indigo-600">
              +{assumedAdditionalSales}台
            </div>
            <p className="text-xs text-slate-500 mt-1">
              月間（CVR改善による想定増）
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-500 font-medium">想定月間売上高</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm text-slate-600">
                現状: {formatPrice(currentAssumedMonthlyRevenue)}
              </span>
              <span className="text-lg font-bold text-indigo-600">
                改善後: {formatPrice(improvedAssumedMonthlyRevenue)}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              <span className="text-xs text-indigo-700 font-medium">想定追加売上高</span>
            </div>
            <div className="text-xl font-bold text-indigo-700">
              +{formatPrice(assumedAdditionalRevenue)}
            </div>
            <p className="text-xs text-indigo-600 mt-1">
              月間（CVR改善による想定増）
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          ※ 想定成約率15%、基準回転率3.5%/月で算出。滞留・価格最適化と連動した改善施策の効果を試算しています。
        </p>
      </div>
    </div>
  )
}
