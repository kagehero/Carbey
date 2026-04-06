import { calculateCVR } from '@/lib/utils'
import {
  CVR_STATS_GOOD_MIN,
  CVR_STATS_REVIEW_MIN,
  classifyCvrStatSegment,
  computeFleetWeightedAvgCvr,
} from '@/lib/cvrPolicy'

/**
 * CVR = (メール問い合わせ数 ÷ 詳細閲覧数) × 100。
 * 統計区分：要改善＝加重平均未満、検討＝平均以上かつ{CVR_STATS_REVIEW_MIN}%〜{CVR_STATS_GOOD_MIN}%未満、良好＝{CVR_STATS_GOOD_MIN}%以上。
 */
export const CVR_HELP = `CVRは「問い合わせ率」（問い合わせ÷閲覧×100）。要改善は在庫の加重平均を下回る台です。検討は平均以上で${CVR_STATS_REVIEW_MIN}%〜${CVR_STATS_GOOD_MIN}%未満、良好は${CVR_STATS_GOOD_MIN}%以上です。`

/** ダッシュボード「CVR分析」グラフのビン幅（%） */
export const CVR_DISTRIBUTION_STEP_PCT = 0.1

export type CvrBandRow = {
  key: string
  name: string
  count: number
  fill: string
}

type Inv = {
  detail_views?: number | null
  email_inquiries?: number | null
}

function cvrBinHeatColor(loPercent: number, maxLo: number): string {
  const t = maxLo > 0 ? Math.min(1, loPercent / Math.max(maxLo, 0.1)) : 0
  const r = Math.round(244 - t * 140)
  const g = Math.round(63 + t * 120)
  const b = Math.round(94 + t * 85)
  return `rgb(${r},${g},${b})`
}

/**
 * 掲載有・在庫有の配列から、CVR を 0.1% 刻みの帯に振り分けた台数（合計＝配列件数と一致）。
 * 先頭は「閲覧なし」。続いてデータがある帯の最小〜最大まで連続表示し、{maxCapPct}% 超は最後にまとめる。
 */
export function computeCvrDistribution(vehicles: Inv[]): {
  rows: CvrBandRow[]
  total: number
  withViews: number
  noViews: number
} {
  const STEP = CVR_DISTRIBUTION_STEP_PCT
  const maxCapPct = 20

  const total = vehicles.length
  let noViews = 0
  const withViewsCvrs: number[] = []

  for (const i of vehicles) {
    const views = i.detail_views || 0
    if (views === 0) {
      noViews++
      continue
    }
    withViewsCvrs.push(calculateCVR(i.email_inquiries ?? null, i.detail_views ?? null))
  }

  let overflow = 0
  const binCount = new Map<number, number>()

  for (const cvr of withViewsCvrs) {
    if (cvr >= maxCapPct) {
      overflow++
      continue
    }
    const idx = Math.min(Math.floor(cvr / STEP), Math.ceil(maxCapPct / STEP) - 1)
    binCount.set(idx, (binCount.get(idx) || 0) + 1)
  }

  let minIdx = Infinity
  let maxIdx = -1
  for (const [k, c] of binCount) {
    if (c > 0) {
      minIdx = Math.min(minIdx, k)
      maxIdx = Math.max(maxIdx, k)
    }
  }

  const rows: CvrBandRow[] = [
    {
      key: 'noViews',
      name: '閲覧なし',
      count: noViews,
      fill: '#94a3b8',
    },
  ]

  const maxLoForColor =
    maxIdx >= 0 ? (maxIdx + 1) * STEP : STEP

  if (maxIdx >= 0 && minIdx <= maxIdx) {
    for (let k = minIdx; k <= maxIdx; k++) {
      const lo = k * STEP
      const count = binCount.get(k) || 0
      rows.push({
        key: `bin-${k}`,
        name: `${lo.toFixed(1)}〜${(lo + STEP).toFixed(1)}%`,
        count,
        fill: cvrBinHeatColor(lo, maxLoForColor),
      })
    }
  }

  if (overflow > 0) {
    rows.push({
      key: 'overflow',
      name: `${maxCapPct}%超`,
      count: overflow,
      fill: '#059669',
    })
  }

  const withViews = total - noViews
  return { rows, total, withViews, noViews }
}

/** ダッシュボード「CVR統計」— 要改善・検討・良好（閲覧ありのみ、排他） */
export function summarizeCvrFleetTiers(vehicles: Inv[]): {
  poor: number
  review: number
  good: number
  fleetAvgCVR: number
  withViews: number
} {
  const fleetAvgCVR = computeFleetWeightedAvgCvr(vehicles)
  let poor = 0
  let review = 0
  let good = 0

  for (const i of vehicles) {
    if ((i.detail_views || 0) === 0) continue
    const cvr = calculateCVR(i.email_inquiries ?? null, i.detail_views ?? null)
    const tier = classifyCvrStatSegment(cvr, fleetAvgCVR, true)
    if (tier === 'poor') poor++
    else if (tier === 'review') review++
    else good++
  }

  const withViews = vehicles.filter((i) => (i.detail_views || 0) > 0).length
  return { poor, review, good, fleetAvgCVR, withViews }
}

/** @deprecated 帯別旧集計。互換のため残置。 */
export function summarizeCvrLegacy(vehicles: Inv[]) {
  const s = summarizeCvrFleetTiers(vehicles)
  return { poor: s.poor, good: s.review + s.good, excellent: s.good }
}
