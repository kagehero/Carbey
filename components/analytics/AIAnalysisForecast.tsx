'use client'

import { useMemo, useState } from 'react'
import { formatPrice } from '@/lib/utils'
import { computeAIForecast, FORECAST_DEFAULTS, type AIForecastResult, type InventoryForForecast } from '@/lib/aiForecast'
import { TrendingUp, RotateCw, DollarSign, BarChart2, SlidersHorizontal } from 'lucide-react'

interface AIAnalysisForecastProps {
  forecast: AIForecastResult
  /** When set, enables interactive scenario sliders (recomputes on the client). */
  inventorySnapshot?: InventoryForForecast[]
}

const PRESETS = [
  { label: '保守', targetCVR: 2.0, inquiryToSaleRate: 0.12, baseMonthlyTurnoverRate: 0.25 },
  { label: '標準', targetCVR: 2.5, inquiryToSaleRate: 0.15, baseMonthlyTurnoverRate: 0.3 },
  { label: '積極', targetCVR: 3.5, inquiryToSaleRate: 0.18, baseMonthlyTurnoverRate: 0.35 },
] as const

export default function AIAnalysisForecast({ forecast, inventorySnapshot }: AIAnalysisForecastProps) {
  const [targetCVR, setTargetCVR] = useState<number>(FORECAST_DEFAULTS.targetCVR)
  const [inquiryToSalePct, setInquiryToSalePct] = useState<number>(
    FORECAST_DEFAULTS.inquiryToSaleRate * 100
  )
  const [baseTurnoverPct, setBaseTurnoverPct] = useState<number>(
    FORECAST_DEFAULTS.baseMonthlyTurnoverRate * 100
  )
  const [maxTurnoverPct, setMaxTurnoverPct] = useState<number>(
    FORECAST_DEFAULTS.maxMonthlyTurnoverRate * 100
  )

  const canSimulate = inventorySnapshot && inventorySnapshot.length > 0

  const dynamic = useMemo(() => {
    if (!canSimulate) return null
    return computeAIForecast(inventorySnapshot!, {
      targetCVR,
      inquiryToSaleRate: inquiryToSalePct / 100,
      baseMonthlyTurnoverRate: baseTurnoverPct / 100,
      maxMonthlyTurnoverRate: maxTurnoverPct / 100,
    })
  }, [canSimulate, inventorySnapshot, targetCVR, inquiryToSalePct, baseTurnoverPct, maxTurnoverPct])

  const f = dynamic ?? forecast

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setTargetCVR(p.targetCVR)
    setInquiryToSalePct(p.inquiryToSaleRate * 100)
    setBaseTurnoverPct(p.baseMonthlyTurnoverRate * 100)
  }

  if (f.poorCVRCount === 0) {
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
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50">
              <BarChart2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">AI分析・将来予測</h2>
              <p className="text-sm text-slate-500">
                CVR改善シナリオ別の想定回転率・売上高（要改善車両を対象）
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {canSimulate ? (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-indigo-900">
              <SlidersHorizontal className="w-4 h-4" />
              シミュレーション条件
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-indigo-200 text-indigo-800 hover:bg-indigo-50"
                >
                  {p.label}（目標CVR {p.targetCVR}%）
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <label className="space-y-1">
                <span className="text-xs text-slate-600">目標CVR（%）</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.1}
                  value={targetCVR}
                  onChange={(e) => setTargetCVR(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <span className="tabular-nums font-semibold text-slate-800">{targetCVR.toFixed(1)}%</span>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-600">問合せ→成約率（%）</span>
                <input
                  type="range"
                  min={5}
                  max={30}
                  step={1}
                  value={inquiryToSalePct}
                  onChange={(e) => setInquiryToSalePct(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600"
                />
                <span className="tabular-nums font-semibold text-slate-800">{inquiryToSalePct}%</span>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-600">基準月間回転率（%）</span>
                <input
                  type="range"
                  min={10}
                  max={50}
                  step={1}
                  value={baseTurnoverPct}
                  onChange={(e) => setBaseTurnoverPct(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600"
                />
                <span className="tabular-nums font-semibold text-slate-800">{baseTurnoverPct}%</span>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-600">改善後の上限回転率（%）</span>
                <input
                  type="range"
                  min={30}
                  max={70}
                  step={1}
                  value={maxTurnoverPct}
                  onChange={(e) => setMaxTurnoverPct(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600"
                />
                <span className="tabular-nums font-semibold text-slate-800">{maxTurnoverPct}%</span>
              </label>
            </div>
          </div>
        ) : null}

        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs text-slate-500 font-medium mb-1">前提</p>
          <p className="text-sm text-slate-700">
            要改善車両 <span className="font-semibold text-slate-800">{f.poorCVRCount}台</span>
            （現状平均CVR {f.poorCVRAvgCVR.toFixed(2)}%）が{' '}
            <span className="font-semibold">{targetCVR.toFixed(1)}%</span>
            に近づいた場合のシミュレーション
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
                {f.currentTurnoverRatePct.toFixed(1)}%
              </span>
              <span className="text-slate-400">→</span>
              <span className="text-lg font-bold text-indigo-600">
                {f.improvedTurnoverRatePct.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">在庫{f.onSaleCount}台に対する月間販売想定</p>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-500 font-medium">想定追加販売台数</span>
            </div>
            <div className="text-2xl font-bold text-indigo-600">+{f.assumedAdditionalSales}台</div>
            <p className="text-xs text-slate-500 mt-1">月間（CVR改善による想定増）</p>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-500 font-medium">想定月間売上高</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm text-slate-600">現状: {formatPrice(f.currentAssumedMonthlyRevenue)}</span>
              <span className="text-lg font-bold text-indigo-600">
                改善後: {formatPrice(f.improvedAssumedMonthlyRevenue)}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              <span className="text-xs text-indigo-700 font-medium">想定追加売上高</span>
            </div>
            <div className="text-xl font-bold text-indigo-700">+{formatPrice(f.assumedAdditionalRevenue)}</div>
            <p className="text-xs text-indigo-600 mt-1">月間（CVR改善による想定増）</p>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          ※ スライダーで前提を変更すると即時に再計算します（上限回転率でキャップ）。掲載有・在庫有の在庫を分母にしています。
        </p>
      </div>
    </div>
  )
}
