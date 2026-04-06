import type { Database } from '@/types/database'
import { calculateStagnationDays, calculateCVR } from '@/lib/utils'
import { isDashboardPriceReviewCandidate } from '@/lib/cvrPolicy'

type Inventory = Database['public']['Tables']['inventories']['Row']

/** 滞留日数分布（0日〜）— 隙間なく細かい帯 */
export const STAGNATION_DISTRIBUTION_BANDS: { label: string; min: number; max: number }[] = [
  { label: '0〜7日', min: 0, max: 7 },
  { label: '8〜14日', min: 8, max: 14 },
  { label: '15〜30日', min: 15, max: 30 },
  { label: '31〜45日', min: 31, max: 45 },
  { label: '46〜60日', min: 46, max: 60 },
  { label: '61〜75日', min: 61, max: 75 },
  { label: '76〜90日', min: 76, max: 90 },
  { label: '91〜105日', min: 91, max: 105 },
  { label: '106〜120日', min: 106, max: 120 },
  { label: '121〜150日', min: 121, max: 150 },
  { label: '151〜180日', min: 151, max: 180 },
  { label: '181〜210日', min: 181, max: 210 },
  { label: '211〜240日', min: 211, max: 240 },
  { label: '241〜300日', min: 241, max: 300 },
  { label: '301〜365日', min: 301, max: 365 },
  { label: '366日超', min: 366, max: Infinity },
]

/** 滞留分析カード用 — 60日超（不良在庫）のみ、細かい帯 */
export const BAD_INVENTORY_STAGNATION_BANDS: { label: string; min: number; max: number }[] = [
  { label: '61〜75日', min: 61, max: 75 },
  { label: '76〜90日', min: 76, max: 90 },
  { label: '91〜105日', min: 91, max: 105 },
  { label: '106〜120日', min: 106, max: 120 },
  { label: '121〜150日', min: 121, max: 150 },
  { label: '151〜180日', min: 151, max: 180 },
  { label: '181〜210日', min: 181, max: 210 },
  { label: '211〜240日', min: 211, max: 240 },
  { label: '241〜300日', min: 241, max: 300 },
  { label: '301〜365日', min: 301, max: 365 },
  { label: '366日超', min: 366, max: Infinity },
]

function isPriceReviewTarget(i: Inventory, fleetAvgCvr: number): boolean {
  const d = calculateStagnationDays(i.published_date!)
  const cvr = calculateCVR(i.email_inquiries, i.detail_views)
  const hasViews = (i.detail_views || 0) > 0
  return isDashboardPriceReviewCandidate(d, cvr, fleetAvgCvr, hasViews)
}

/**
 * 価格最適化チャート用 — `isDashboardPriceReviewCandidate`（閲覧あり・平均CVR未満・滞留60日以上）に該当する台のみを滞留日帯に排他分類。
 */
export function buildPricingAnalyticsBands(fleetAvgCvr: number): {
  label: string
  fn: (i: Inventory) => boolean
}[] {
  const inBand =
    (min: number, max: number) => (i: Inventory) => {
      if (!isPriceReviewTarget(i, fleetAvgCvr)) return false
      const d = calculateStagnationDays(i.published_date!)
      return d >= min && d <= max
    }

  return [
    { label: '366日超', fn: (i) => inBand(366, Infinity)(i) },
    { label: '331〜365日', fn: inBand(331, 365) },
    { label: '301〜330日', fn: inBand(301, 330) },
    { label: '271〜300日', fn: inBand(271, 300) },
    { label: '241〜270日', fn: inBand(241, 270) },
    { label: '211〜240日', fn: inBand(211, 240) },
    { label: '181〜210日', fn: inBand(181, 210) },
    { label: '151〜180日', fn: inBand(151, 180) },
    { label: '121〜150日', fn: inBand(121, 150) },
    { label: '91〜120日', fn: inBand(91, 120) },
    { label: '76〜90日', fn: inBand(76, 90) },
    { label: '60〜75日', fn: inBand(60, 75) },
  ]
}
