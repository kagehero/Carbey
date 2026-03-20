"use client"

import { Download, Printer } from "lucide-react"
import { formatPrice } from "@/lib/utils"

type ExportRow = {
  maker: string | null
  car_name: string | null
  grade: string | null
  stagnation_days: number
  cvr: number
  currentPrice: number
  suggestedPriceOptimization: number
  discountAmountOptimization: number
  discountPctOptimization: number
  suggestedPriceAI: number
  discountAmountAI: number
  discountPctAI: number
  reasonOptimization: string
  reasonAI: string
}

type Props = {
  rows: ExportRow[]
  generatedAt: string
}

function toCSV(rows: ExportRow[]): string {
  const header = [
    "メーカー", "車名", "グレード",
    "滞留日数", "CVR(%)",
    "現在価格(万円)", "最適化提案価格(万円)", "最適化値下げ額(万円)", "最適化率(%)", "最適化理由",
    "AI提案価格(万円)", "AI値下げ額(万円)", "AI率(%)", "AI理由",
  ].join(",")

  const toMan = (yen: number) => (yen / 10000).toFixed(1)

  const body = rows.map(r => [
    r.maker ?? "",
    r.car_name ?? "",
    r.grade ?? "",
    r.stagnation_days,
    r.cvr.toFixed(2),
    toMan(r.currentPrice),
    toMan(r.suggestedPriceOptimization),
    toMan(r.discountAmountOptimization),
    r.discountPctOptimization,
    r.reasonOptimization,
    toMan(r.suggestedPriceAI),
    toMan(r.discountAmountAI),
    r.discountPctAI,
    r.reasonAI,
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))

  return "\uFEFF" + [header, ...body].join("\r\n")
}

export default function PriceListExportButton({ rows, generatedAt }: Props) {
  const downloadCSV = () => {
    const csv = toCSV(rows)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `価格リスト_${generatedAt}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const print = () => {
    const toMan = (yen: number) => `${(yen / 10000).toFixed(1)}万円`
    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>価格リスト ${generatedAt}</title>
<style>
  body { font-family: sans-serif; font-size: 11px; }
  h1 { font-size: 14px; margin-bottom: 8px; }
  p { color: #666; margin-bottom: 12px; font-size: 10px; }
  table { border-collapse: collapse; width: 100%; }
  th { background: #f3f4f6; text-align: left; padding: 4px 8px; border: 1px solid #d1d5db; font-size: 10px; }
  td { padding: 4px 8px; border: 1px solid #d1d5db; }
  .red { color: #dc2626; font-weight: bold; }
  .green { color: #16a34a; font-weight: bold; }
  @media print { body { margin: 10mm; } }
</style>
</head>
<body>
<h1>価格リスト</h1>
<p>出力日時: ${generatedAt} / 対象台数: ${rows.length}台</p>
<table>
<thead>
<tr>
  <th>メーカー</th><th>車名</th><th>グレード</th>
  <th>滞留</th><th>CVR</th>
  <th>現在価格</th>
  <th>最適化価格</th><th>最適化差額</th>
  <th>AI価格</th><th>AI差額</th>
  <th>理由</th>
</tr>
</thead>
<tbody>
${rows.map(r => `<tr>
  <td>${r.maker ?? ""}</td>
  <td>${r.car_name ?? ""}</td>
  <td>${r.grade ?? ""}</td>
  <td>${r.stagnation_days}日</td>
  <td>${r.cvr.toFixed(2)}%</td>
  <td>${toMan(r.currentPrice)}</td>
  <td class="green">${toMan(r.suggestedPriceOptimization)}</td>
  <td class="red">-${toMan(r.discountAmountOptimization)}</td>
  <td class="green">${toMan(r.suggestedPriceAI)}</td>
  <td class="red">-${toMan(r.discountAmountAI)}</td>
  <td>${r.reasonOptimization || r.reasonAI}</td>
</tr>`).join("")}
</tbody>
</table>
</body></html>`
    const w = window.open("", "_blank")
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 500)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={downloadCSV}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
      >
        <Download className="w-4 h-4" />
        価格リスト保存（CSV）
      </button>
      <button
        onClick={print}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
      >
        <Printer className="w-4 h-4" />
        印刷
      </button>
    </div>
  )
}
