/**
 * AI分析：CVR改善時の想定改善数値・回転率・売上高の予測
 * 滞留・CVR・価格最適化と連動
 */

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
  /** 月間基準回転率（在庫に対する割合、0-1）例: 0.03 = 3%/月 */
  baseMonthlyTurnoverRate?: number
  /** CVR改善目標値（%）例: 2.5 */
  targetCVR?: number
}

const DEFAULT_PARAMS: Required<ForecastParams> = {
  inquiryToSaleRate: 0.15,
  baseMonthlyTurnoverRate: 0.035,
  targetCVR: 2.5,
}

function calculateCVR(inquiries: number | null, views: number | null): number {
  if (!views || views === 0) return 0
  if (!inquiries) return 0
  return (inquiries / views) * 100
}

export type AIForecastResult = {
  /** 要改善車両数（CVR 2%未満） */
  poorCVRCount: number
  /** 要改善車両の総閲覧数 */
  poorCVRTotalViews: number
  /** 要改善車両の現状総問合せ数 */
  poorCVRTotalInquiries: number
  /** 要改善車両の現状平均CVR */
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
  const p = { ...DEFAULT_PARAMS, ...params }
  const onSale = inventories.filter((i) => i.status === '販売中')
  const onSaleCount = onSale.length

  const getPrice = (i: InventoryForForecast) =>
    Number(i.price_body ?? i.currentPrice ?? 0)
  const totalValue = onSale.reduce((sum, i) => sum + getPrice(i), 0)
  const avgPrice = onSaleCount > 0 ? Math.round(totalValue / onSaleCount) : 0

  const poorCVRVehicles = onSale.filter((i) => {
    const views = i.detail_views || 0
    if (views === 0) return false
    const cvr = calculateCVR(i.email_inquiries, i.detail_views)
    return cvr > 0 && cvr < 2
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
  const improvedAssumedMonthlySales =
    currentAssumedMonthlySales + assumedAdditionalSales

  const currentTurnoverRatePct =
    onSaleCount > 0 ? (currentAssumedMonthlySales / onSaleCount) * 100 : 0
  const improvedTurnoverRatePct =
    onSaleCount > 0 ? (improvedAssumedMonthlySales / onSaleCount) * 100 : 0

  const currentAssumedMonthlyRevenue = currentAssumedMonthlySales * avgPrice
  const improvedAssumedMonthlyRevenue =
    improvedAssumedMonthlySales * avgPrice

  return {
    poorCVRCount,
    poorCVRTotalViews,
    poorCVRTotalInquiries,
    poorCVRAvgCVR,
    assumedAdditionalInquiries,
    assumedAdditionalSales,
    assumedAdditionalRevenue,
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
