/**
 * AI分析：CVR改善時の想定改善数値・回転率・売上高の予測
 * 滞留・CVR・価格最適化と連動
 */

import { calculateCVR } from '@/lib/utils'
import { computeFleetWeightedAvgCvr, isCvrBelowFleetAvg } from '@/lib/cvrPolicy'

export type InventoryForForecast = {
  status: string
  price_body?: number | null
  currentPrice?: number | null
  detail_views?: number | null
  email_inquiries?: number | null
  published_date?: string | null
}

export type ForecastParams = {
  /** 問合せ→成約の想定成約率（0-1） */
  inquiryToSaleRate?: number
  /** 月間基準回転率（在庫に対する割合、0-1）例: 0.30 = 30%/月 */
  baseMonthlyTurnoverRate?: number
  /** CVR改善目標値（%）例: 2.5 */
  targetCVR?: number
  /** 月間回転率の上限（0-1）。改善後もこの値を超えない。例: 0.5 = 50%/月 */
  maxMonthlyTurnoverRate?: number
}

/** Default simulation parameters (exported for UI sliders). */
export const FORECAST_DEFAULTS = {
  inquiryToSaleRate: 0.15,
  baseMonthlyTurnoverRate: 0.30,
  /** 初期は「標準」目標（UIでいつでも変更可） */
  targetCVR: 2.0,
  maxMonthlyTurnoverRate: 0.50,
} as const

/** スライダー・入力の許容範囲（%） */
export const TARGET_CVR_RANGE = { min: 0.3, max: 5.0, step: 0.1 } as const

const DEFAULT_PARAMS = { ...FORECAST_DEFAULTS }

export type AIForecastResult = {
  /**
   * 販売中かつ閲覧ありの在庫全体の加重平均CVR（%）。
   * 主な改善車両は「個別CVRがこの値を下回る」台で決める。
   */
  fleetAvgCVR: number
  /** 主な改善車両数（在庫平均CVRを下回る台・閲覧あり） */
  poorCVRCount: number
  /** 主な改善車両の総閲覧数 */
  poorCVRTotalViews: number
  /** 主な改善車両の現状総問合せ数 */
  poorCVRTotalInquiries: number
  /** 主な改善車両グループの現状加重平均CVR（%） */
  poorCVRAvgCVR: number
  /** 想定追加問合せ数（CVR改善時） */
  assumedAdditionalInquiries: number
  /** 想定追加販売台数（成約率適用後） */
  assumedAdditionalSales: number
  /** 想定追加売上高（円） */
  assumedAdditionalRevenue: number
  /** 現状想定月間販売台数（基準回転率ベース） */
  currentAssumedMonthlySales: number
  /** 改善後想定月間販売台数 */
  improvedAssumedMonthlySales: number
  /** 現状想定月間回転率（%） */
  currentTurnoverRatePct: number
  /** 改善後想定月間回転率（%） */
  improvedTurnoverRatePct: number
  /** 現状想定月間売上高（円） */
  currentAssumedMonthlyRevenue: number
  /** 改善後想定月間売上高（円） */
  improvedAssumedMonthlyRevenue: number
  /** 販売中在庫数 */
  onSaleCount: number
  /** 販売中在庫の平均単価（円） */
  avgPrice: number
}

export function computeAIForecast(
  inventories: InventoryForForecast[],
  params: ForecastParams = {}
): AIForecastResult {
  const p = { ...DEFAULT_PARAMS, ...params } as typeof DEFAULT_PARAMS
  // 呼び出し元で掲載有・在庫有に絞った配列を渡す想定。そのまま全件を販売中として扱う
  const onSale = inventories
  const onSaleCount = onSale.length

  const getPrice = (i: InventoryForForecast) =>
    Number(i.price_body ?? i.currentPrice ?? 0)
  const totalValue = onSale.reduce((sum, i) => sum + getPrice(i), 0)
  const avgPrice = onSaleCount > 0 ? Math.round(totalValue / onSaleCount) : 0

  const withViews = onSale.filter((i) => (i.detail_views || 0) > 0)
  const fleetAvgCVR = computeFleetWeightedAvgCvr(onSale)

  const poorCVRVehicles = withViews.filter((i) => {
    const cvr = calculateCVR(i.email_inquiries ?? null, i.detail_views ?? null)
    return isCvrBelowFleetAvg(cvr, fleetAvgCVR, true)
  })

  const poorCVRCount = poorCVRVehicles.length
  const poorCVRTotalViews = poorCVRVehicles.reduce((s, i) => s + (i.detail_views || 0), 0)
  const poorCVRTotalInquiries = poorCVRVehicles.reduce((s, i) => s + (i.email_inquiries || 0), 0)
  const poorCVRAvgCVR =
    poorCVRCount > 0 && poorCVRTotalViews > 0
      ? (poorCVRTotalInquiries / poorCVRTotalViews) * 100
      : 0

  const assumedAdditionalInquiries =
    poorCVRTotalViews > 0
      ? Math.max(
          0,
          poorCVRTotalViews * (p.targetCVR / 100) - poorCVRTotalInquiries
        )
      : 0

  const assumedAdditionalSales = Math.round(
    assumedAdditionalInquiries * p.inquiryToSaleRate
  )

  const poorCVRAvgPrice =
    poorCVRCount > 0
      ? poorCVRVehicles.reduce((s, i) => s + getPrice(i), 0) / poorCVRCount
      : avgPrice
  const assumedAdditionalRevenue = Math.round(
    assumedAdditionalSales * poorCVRAvgPrice
  )

  const currentAssumedMonthlySales = Math.round(
    onSaleCount * p.baseMonthlyTurnoverRate
  )
  const maxMonthlySales = Math.round(onSaleCount * (p.maxMonthlyTurnoverRate ?? 0.5))
  const uncappedImproved = currentAssumedMonthlySales + assumedAdditionalSales
  const improvedAssumedMonthlySales = Math.min(uncappedImproved, maxMonthlySales)
  const displayAdditionalSales = improvedAssumedMonthlySales - currentAssumedMonthlySales
  const displayAdditionalRevenue = Math.round(displayAdditionalSales * poorCVRAvgPrice)

  const currentTurnoverRatePct =
    onSaleCount > 0 ? (currentAssumedMonthlySales / onSaleCount) * 100 : 0
  const improvedTurnoverRatePct =
    onSaleCount > 0 ? (improvedAssumedMonthlySales / onSaleCount) * 100 : 0

  const currentAssumedMonthlyRevenue = currentAssumedMonthlySales * avgPrice
  const improvedAssumedMonthlyRevenue =
    improvedAssumedMonthlySales * avgPrice

  return {
    fleetAvgCVR,
    poorCVRCount,
    poorCVRTotalViews,
    poorCVRTotalInquiries,
    poorCVRAvgCVR,
    assumedAdditionalInquiries,
    assumedAdditionalSales: displayAdditionalSales,
    assumedAdditionalRevenue: displayAdditionalRevenue,
    currentAssumedMonthlySales,
    improvedAssumedMonthlySales,
    currentTurnoverRatePct,
    improvedTurnoverRatePct,
    currentAssumedMonthlyRevenue,
    improvedAssumedMonthlyRevenue,
    onSaleCount,
    avgPrice,
  }
}
