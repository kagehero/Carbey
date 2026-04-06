'use client'

import { useMemo, useState, useCallback } from 'react'
import { formatPrice } from '@/lib/utils'
import {
  computeAIForecast,
  FORECAST_DEFAULTS,
  TARGET_CVR_RANGE,
  type AIForecastResult,
  type InventoryForForecast,
} from '@/lib/aiForecast'
import { CVR_TIER_PCT } from '@/lib/cvrPolicy'
import { TrendingUp, RotateCw, DollarSign, BarChart2, SlidersHorizontal, Target } from 'lucide-react'

interface AIAnalysisForecastProps {
  forecast: AIForecastResult
  inventorySnapshot?: InventoryForForecast[]
}

/** 報酬・標準・積極の目標CVR（%）に対応 */
const PRESETS = [
  { label: '報酬', targetCVR: CVR_TIER_PCT.reward, inquiryToSaleRate: 0.14, baseMonthlyTurnoverRate: 0.27 },
  { label: '標準', targetCVR: CVR_TIER_PCT.standard, inquiryToSaleRate: 0.15, baseMonthlyTurnoverRate: 0.3 },
  { label: '積極', targetCVR: CVR_TIER_PCT.aggressive, inquiryToSaleRate: 0.17, baseMonthlyTurnoverRate: 0.32 },
] as const

function clampTargetCvr(v: number): number {
  const { min, max, step } = TARGET_CVR_RANGE
  const n = Math.round(v / step) * step
  return Math.min(max, Math.max(min, Math.round(n * 10) / 10))
}

export default function AIAnalysisForecast({ forecast, inventorySnapshot }: AIAnalysisForecastProps) {
  const [targetCVR, setTargetCVR] = useState<number>(() => clampTargetCvr(FORECAST_DEFAULTS.targetCVR))
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
    setTargetCVR(clampTargetCvr(p.targetCVR))
    setInquiryToSalePct(p.inquiryToSaleRate * 100)
    setBaseTurnoverPct(p.baseMonthlyTurnoverRate * 100)
  }

  const onTargetInput = useCallback((raw: string) => {
    const n = parseFloat(raw.replace(/,/g, ''))
    if (Number.isNaN(n)) return
    setTargetCVR(clampTargetCvr(n))
  }, [])

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
        <p className="text-sm text-slate-600 py-4 leading-relaxed">
          主な改善対象となる車両（閲覧ありで、在庫全体の加重平均CVRを下回る台）がありません。
          全台が平均以上のパフォーマンスか、閲覧データが不足しています。
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-indigo-50/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 shadow-sm">
            <BarChart2 className="w-5 h-5 text-indigo-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 tracking-tight">AI分析・将来予測</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              CVR改善のシミュレーション — 目標はいつでも調整できます
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {canSimulate ? (
          <div className="rounded-xl border-2 border-indigo-200/80 bg-gradient-to-b from-indigo-50/50 to-white p-5 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-950">
                <Target className="w-5 h-5 text-indigo-600 shrink-0" />
                <span>目標CVR（達成したい水準）</span>
              </div>
              <p className="text-xs text-indigo-800/90 leading-relaxed max-w-xl">
                プリセットは運用区分に合わせています（報酬{CVR_TIER_PCT.reward}%・標準{CVR_TIER_PCT.standard}%
                ・積極{CVR_TIER_PCT.aggressive}%）。まずは標準や報酬から試算し、慣れたら積極へ。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-indigo-200 text-indigo-900 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm transition-colors"
                >
                  {p.label}{' '}
                  <span className="text-indigo-600 tabular-nums">({p.targetCVR}%)</span>
                </button>
              ))}
            </div>

            <div className="rounded-lg bg-white border border-indigo-100 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <label className="flex-1 space-y-2">
                  <span className="text-xs font-medium text-slate-700">目標CVR（{TARGET_CVR_RANGE.min}〜{TARGET_CVR_RANGE.max}%）</span>
                  <input
                    type="range"
                    min={TARGET_CVR_RANGE.min}
                    max={TARGET_CVR_RANGE.max}
                    step={TARGET_CVR_RANGE.step}
                    value={targetCVR}
                    onChange={(e) => setTargetCVR(clampTargetCvr(parseFloat(e.target.value)))}
                    className="w-full h-2 accent-indigo-600 rounded-lg cursor-pointer"
                  />
                </label>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={TARGET_CVR_RANGE.min}
                    max={TARGET_CVR_RANGE.max}
                    step={TARGET_CVR_RANGE.step}
                    value={targetCVR}
                    onChange={(e) => onTargetInput(e.target.value)}
                    className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-base font-bold tabular-nums text-indigo-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
                  <span className="text-lg font-bold text-indigo-700">%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-medium text-indigo-900">
              <SlidersHorizontal className="w-4 h-4" />
              その他の前提（上級）
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
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

        <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 shadow-inner">
          <p className="text-xs text-slate-500 font-semibold mb-2">前提</p>
          <p className="text-sm text-slate-800 leading-relaxed">
            販売中かつ閲覧ありの在庫全体の加重平均CVRは{' '}
            <span className="font-semibold tabular-nums text-slate-900">{f.fleetAvgCVR.toFixed(2)}%</span>
            です。これを下回る車両
            <span className="font-semibold text-slate-900"> {f.poorCVRCount}台</span>
            を主な改善対象とし、当該グループの現状平均CVRは{' '}
            <span className="font-semibold tabular-nums">{f.poorCVRAvgCVR.toFixed(2)}%</span>
            です。
            <span className="whitespace-nowrap">
              このグループの平均が{' '}
              <span className="inline-flex items-baseline gap-0.5 rounded-md bg-white px-1.5 py-0.5 font-bold text-indigo-700 tabular-nums shadow-sm border border-indigo-100">
                {targetCVR.toFixed(1)}%
              </span>
            </span>
            まで改善した場合のシミュレーションです。
          </p>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            目標CVRは上のスライダー・数値・プリセットで変更できます（{TARGET_CVR_RANGE.min}〜{TARGET_CVR_RANGE.max}%）。改善対象の選定は固定閾値ではなく、常に在庫加重平均との比較です。
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border-2 border-slate-200/90 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <RotateCw className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-600 font-medium">想定回転率（月）</span>
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-xl font-bold text-slate-700 tabular-nums">
                {f.currentTurnoverRatePct.toFixed(1)}%
              </span>
              <span className="text-slate-400">→</span>
              <span className="text-xl font-bold text-indigo-600 tabular-nums">
                {f.improvedTurnoverRatePct.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              販売中（掲載有・在庫有）<span className="font-semibold text-slate-700">{f.onSaleCount}台</span>
              全体を分母とした月間販売想定
            </p>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
              ※「主な改善{f.poorCVRCount}台」は平均CVR{f.fleetAvgCVR.toFixed(2)}%未満の閲覧あり台数です（加重平均）。
            </p>
          </div>

          <div className="rounded-xl border-2 border-slate-200/90 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-600 font-medium">想定追加販売台数</span>
            </div>
            <div className="text-2xl font-bold text-violet-600 tabular-nums">+{f.assumedAdditionalSales}台</div>
            <p className="text-xs text-slate-500 mt-2">月間（CVR改善による想定増）</p>
          </div>

          <div className="rounded-xl border-2 border-slate-200/90 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-600 font-medium">想定月間売上高</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">
                現状: <span className="tabular-nums">{formatPrice(f.currentAssumedMonthlyRevenue)}</span>
              </span>
              <span className="text-lg font-bold text-indigo-600">
                改善後: {formatPrice(f.improvedAssumedMonthlyRevenue)}
              </span>
            </div>
          </div>

          <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50/80 to-indigo-50/40 p-4 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-violet-700" />
              <span className="text-xs text-violet-900 font-semibold">想定追加売上高</span>
            </div>
            <div className="text-xl font-bold text-violet-700 tabular-nums">
              +{formatPrice(f.assumedAdditionalRevenue)}
            </div>
            <p className="text-xs text-violet-800/90 mt-2">月間（CVR改善による想定増）</p>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
          ※ 条件を変更すると即時に再計算します（上限回転率でキャップ）。追加台数・追加売上は主に要改善群の単価・成約率前提に基づきます。
        </p>
      </div>
    </div>
  )
}
