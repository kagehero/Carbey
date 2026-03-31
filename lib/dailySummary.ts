import { calculateCVR, calculateStagnationDays } from '@/lib/utils'
import { isVisibleOnSale, isInStock } from '@/lib/inventoryMetrics'
import type { Database } from '@/types/database'

type Row = Database['public']['Tables']['inventories']['Row']

export type DashboardSummaryPayload = {
  dateLabel: string
  onSaleCount: number
  totalInStock: number
  stagnation180: number
  stagnation90to179: number
  discountCandidates: number
  lowCvrCount: number
  avgStagnation: number
}

export function buildDashboardSummary(inventories: Row[]): DashboardSummaryPayload {
  const onList = inventories.filter((i) => isVisibleOnSale(i))
  const onSaleCount = onList.length
  const totalInStock = inventories.filter((i) => isInStock(i)).length

  const withPub = onList.filter((i) => i.published_date)
  const stagnations = withPub.map((i) => calculateStagnationDays(i.published_date!))
  const avgStagnation =
    stagnations.length > 0 ? Math.round(stagnations.reduce((a, b) => a + b, 0) / stagnations.length) : 0

  let stagnation180 = 0
  let stagnation90to179 = 0
  let discountCandidates = 0
  let lowCvrCount = 0

  for (const i of withPub) {
    const d = calculateStagnationDays(i.published_date!)
    if (d >= 180) stagnation180++
    else if (d >= 90) stagnation90to179++

    const cvr = calculateCVR(i.email_inquiries, i.detail_views)
    if (d >= 60 || cvr < 2) discountCandidates++
    if (i.detail_views && i.detail_views > 0 && cvr > 0 && cvr < 2) lowCvrCount++
  }

  return {
    dateLabel: new Date().toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    }),
    onSaleCount,
    totalInStock,
    stagnation180,
    stagnation90to179,
    discountCandidates,
    lowCvrCount,
    avgStagnation,
  }
}

export function formatDailySummaryHtml(baseUrl: string, s: DashboardSummaryPayload): string {
  const dash = `${baseUrl.replace(/\/$/, '')}/admin/dashboard`
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1e293b;">
  <h2 style="margin: 0 0 12px;">Carbey 日次サマリー</h2>
  <p style="color: #64748b; margin: 0 0 20px;">${s.dateLabel}（掲載有・在庫有ベース）</p>
  <table style="border-collapse: collapse; font-size: 14px;">
    <tr><td style="padding: 6px 16px 6px 0; color: #64748b;">販売中（掲載有・在庫有）</td><td style="font-weight: 600;">${s.onSaleCount}台</td></tr>
    <tr><td style="padding: 6px 16px 6px 0; color: #64748b;">在庫総数（在庫あり）</td><td style="font-weight: 600;">${s.totalInStock}台</td></tr>
    <tr><td style="padding: 6px 16px 6px 0; color: #64748b;">平均滞留日数</td><td style="font-weight: 600;">${s.avgStagnation}日</td></tr>
    <tr><td style="padding: 6px 16px 6px 0; color: #64748b;">滞留 180日超</td><td style="font-weight: 600; color: #b91c1c;">${s.stagnation180}台</td></tr>
    <tr><td style="padding: 6px 16px 6px 0; color: #64748b;">滞留 90〜179日</td><td style="font-weight: 600;">${s.stagnation90to179}台</td></tr>
    <tr><td style="padding: 6px 16px 6px 0; color: #64748b;">値下げ検討対象（目安）</td><td style="font-weight: 600;">${s.discountCandidates}台</td></tr>
    <tr><td style="padding: 6px 16px 6px 0; color: #64748b;">CVR 2%未満（閲覧あり）</td><td style="font-weight: 600;">${s.lowCvrCount}台</td></tr>
  </table>
  <p style="margin-top: 24px;"><a href="${dash}" style="color: #2563eb;">ダッシュボードを開く</a></p>
</body></html>
`.trim()
}
