import { calculateCVR } from '@/lib/utils'

/**
 * CVR 運用区分（値下げ・AIヒューリスティクス等の目安%）。
 * ダッシュボード「CVR統計」は別途 CVR_STATS_*（要改善・検討・良好）を使用。
 */
export const CVR_TIER_PCT = {
  /** 報酬ライン */
  reward: 1,
  /** 標準ライン */
  standard: 2,
  /** 積極ライン */
  aggressive: 2.5,
} as const

/** CVR統計：良好の下限（%）。平均以上のうち2%以上を「良好」 */
export const CVR_STATS_GOOD_MIN = 2
/** CVR統計：検討の目安（%）— 表記「1〜2%」の帯の下限 */
export const CVR_STATS_REVIEW_MIN = 1

export type CvrStatSegment = 'noViews' | 'poor' | 'review' | 'good'

type Inv = { detail_views?: number | null; email_inquiries?: number | null }

/** 閲覧ありの加重平均CVR（%） */
export function computeFleetWeightedAvgCvr(vehicles: Inv[]): number {
  const withViews = vehicles.filter((i) => (i.detail_views || 0) > 0)
  const tv = withViews.reduce((s, i) => s + (i.detail_views || 0), 0)
  const ti = withViews.reduce((s, i) => s + (i.email_inquiries || 0), 0)
  return tv > 0 ? (ti / tv) * 100 : 0
}

/** 要改善：個別CVRが在庫加重平均を下回る（aiForecast と同じ） */
export function isCvrBelowFleetAvg(
  cvr: number,
  fleetAvgCvr: number,
  hasViews: boolean
): boolean {
  if (!hasViews) return false
  if (fleetAvgCvr > 0) return cvr < fleetAvgCvr
  return cvr === 0
}

/**
 * 価格見直し対象（ダッシュボード「値下げ検討」と同一）。
 * 閲覧ありかつCVRが在庫加重平均未満、かつ滞留60日以上。
 */
export function isDashboardPriceReviewCandidate(
  stagnationDays: number,
  cvr: number,
  fleetAvgCvr: number,
  hasViews: boolean
): boolean {
  if (stagnationDays < 60) return false
  return isCvrBelowFleetAvg(cvr, fleetAvgCvr, hasViews)
}

/**
 * 閲覧ありの1台について、CVR統計用に排他区分。
 * - poor: 平均未満（要改善）
 * - good: 平均以上かつ CVR ≥ 2%
 * - review: 平均以上かつ 2%未満（1〜2%未満を中心に検討ゾーン）
 */
export function classifyCvrStatSegment(
  cvr: number,
  fleetAvgCvr: number,
  hasViews: boolean
): CvrStatSegment {
  if (!hasViews) return 'noViews'
  if (isCvrBelowFleetAvg(cvr, fleetAvgCvr, true)) return 'poor'
  if (cvr >= CVR_STATS_GOOD_MIN) return 'good'
  return 'review'
}

/** 表示用ラベル。fleetAvgCvr 省略時は絶対目安のみ（要改善・検討・良好）。 */
export function getCVRLabel(cvr: number, fleetAvgCvr?: number | null): string {
  if (fleetAvgCvr !== undefined && fleetAvgCvr !== null) {
    if (isCvrBelowFleetAvg(cvr, fleetAvgCvr, true)) return '要改善'
    if (cvr >= CVR_STATS_GOOD_MIN) return '良好'
    return '検討'
  }
  if (cvr >= CVR_STATS_GOOD_MIN) return '良好'
  if (cvr >= CVR_STATS_REVIEW_MIN) return '検討'
  return '要改善'
}

/** 平均との差（pt）。要改善台では正の値 */
export function pricingCvrGapPoints(cvr: number, fleetAvgCvr: number): number {
  return Math.max(0, fleetAvgCvr - cvr)
}

function roundPricingPct(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * 価格最適化（ルール）— 要改善向け。CVRギャップと絶対水準・滞留で段階的に小さめの率を返す。
 */
export function computePricingOptimizationPct(
  cvr: number,
  fleetAvgCvr: number,
  stagnationDays: number
): { pct: number; reasons: string[] } {
  const reasons: string[] = []
  const gap = pricingCvrGapPoints(cvr, fleetAvgCvr)

  let pct = 0
  if (gap < 0.12) {
    pct = 0.5
    reasons.push('平均僅差')
  } else if (gap < 0.35) {
    pct = 1
    reasons.push('平均未満(小)')
  } else if (gap < 0.7) {
    pct = 1.5
    reasons.push('平均未満(小〜中)')
  } else if (gap < 1.2) {
    pct = 2
    reasons.push('平均未満(中)')
  } else if (gap < 2) {
    pct = 3
    reasons.push('平均未満(大)')
  } else {
    pct = Math.min(5, 3 + (gap - 2) * 0.5)
    reasons.push('平均未満(特大)')
  }

  // 絶対CVRが検討帯（1〜2%）より下なら、gap が小さくても底上げ
  if (cvr < CVR_STATS_REVIEW_MIN) {
    const floor = cvr < 0.5 ? 2.5 : 1.5
    if (pct < floor) {
      pct = floor
      reasons.push(`絶対CVR<${CVR_STATS_REVIEW_MIN}%`)
    }
  }

  // 滞留は控えめに加算（従来の5〜15%ではなく上限約+2%）
  let stag = 0
  if (stagnationDays >= 240) {
    stag = 2
    reasons.push('滞留240日超')
  } else if (stagnationDays >= 180) {
    stag = 1.5
    reasons.push('滞留180日超')
  } else if (stagnationDays >= 120) {
    stag = 1
    reasons.push('滞留120日超')
  } else if (stagnationDays >= 90) {
    stag = 0.5
    reasons.push('滞留90日超')
  } else if (stagnationDays >= 60) {
    stag = 0.5
    reasons.push('滞留60日超')
  }

  pct += stag
  pct = roundPricingPct(Math.min(9, Math.max(0.5, pct)))

  return { pct, reasons }
}

/**
 * CVRが平均未満でないが滞留でダッシュボード対象になった場合（閲覧なし・平均以上など）— 滞留のみで控えめに。
 */
export function computePricingStagnationOnlyPct(stagnationDays: number): { pct: number; reasons: string[] } {
  const reasons: string[] = []
  let pct = 0
  if (stagnationDays >= 240) {
    pct = 3
    reasons.push('滞留主因・240日超')
  } else if (stagnationDays >= 180) {
    pct = 2.5
    reasons.push('滞留主因・180日超')
  } else if (stagnationDays >= 120) {
    pct = 2
    reasons.push('滞留主因・120日超')
  } else if (stagnationDays >= 90) {
    pct = 1.5
    reasons.push('滞留主因・90日超')
  } else if (stagnationDays >= 60) {
    pct = 1
    reasons.push('滞留主因・60日超')
  } else {
    pct = 0.5
    reasons.push('滞留主因')
  }
  return { pct: roundPricingPct(Math.min(8, pct)), reasons }
}

export function computePricingStagnationOnlyAIPct(stagnationDays: number): { pct: number; reasons: string[] } {
  const base = computePricingStagnationOnlyPct(stagnationDays)
  const reasons = [...base.reasons]
  let extra = 0
  if (stagnationDays >= 365) extra += 1.5
  else if (stagnationDays >= 300) extra += 1
  else if (stagnationDays >= 240) extra += 0.5
  if (extra > 0) reasons.push('AI検証加算')
  return { pct: roundPricingPct(Math.min(12, base.pct + extra)), reasons }
}

/**
 * AI（検証）— ルール提案に対し、ギャップ・長期滞留・極低CVRだけ少量加算（滞留の二重計上にならないよう加算のみ）。
 */
export function computePricingAIPct(
  cvr: number,
  fleetAvgCvr: number,
  stagnationDays: number
): { pct: number; reasons: string[] } {
  const base = computePricingOptimizationPct(cvr, fleetAvgCvr, stagnationDays)
  const reasons = [...base.reasons]

  const gap = pricingCvrGapPoints(cvr, fleetAvgCvr)
  let extra = 0
  if (gap >= 2.5) extra += 1
  else if (gap >= 1.5) extra += 0.5

  if (stagnationDays >= 365) extra += 1.5
  else if (stagnationDays >= 300) extra += 1
  else if (stagnationDays >= 240) extra += 0.5

  if (cvr < 0.2) extra += 0.5

  if (extra > 0) reasons.push('AI検証加算')
  const pct = roundPricingPct(Math.min(12, base.pct + extra))
  return { pct, reasons }
}

/**
 * 価格最適化ページ用：ダッシュボードと同じ「CVR主因 / 滞留主因」でルールとAIの率を切り替え。
 */
export function computePricingRuleAndAI(
  cvr: number,
  fleetAvgCvr: number,
  stagnationDays: number,
  hasViews: boolean
): {
  optimization: { pct: number; reasons: string[] }
  ai: { pct: number; reasons: string[] }
} {
  const cvrDriven = hasViews && isCvrBelowFleetAvg(cvr, fleetAvgCvr, true)
  if (cvrDriven) {
    return {
      optimization: computePricingOptimizationPct(cvr, fleetAvgCvr, stagnationDays),
      ai: computePricingAIPct(cvr, fleetAvgCvr, stagnationDays),
    }
  }
  return {
    optimization: computePricingStagnationOnlyPct(stagnationDays),
    ai: computePricingStagnationOnlyAIPct(stagnationDays),
  }
}

/** 表示用色クラス（Tailwind） */
export function getCVRColor(cvr: number, fleetAvgCvr?: number | null): string {
  if (fleetAvgCvr !== undefined && fleetAvgCvr !== null) {
    if (isCvrBelowFleetAvg(cvr, fleetAvgCvr, true)) return 'text-red-600'
    if (cvr >= CVR_STATS_GOOD_MIN) return 'text-emerald-600'
    return 'text-amber-600'
  }
  if (cvr >= CVR_STATS_GOOD_MIN) return 'text-emerald-600'
  if (cvr >= CVR_STATS_REVIEW_MIN) return 'text-amber-600'
  return 'text-red-600'
}
