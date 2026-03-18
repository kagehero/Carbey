"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ArrowUpDown, Search, Filter } from "lucide-react"

type VehicleRow = {
  id: string
  maker: string | null
  car_name: string | null
  grade: string | null
  year: string | null
  stagnation_days: number
  cvr: number
  detail_views: number
  email_inquiries: number
  currentPrice: number
  cost_price: number | null
  suggestedPriceOpt: number | null
  discountPctOpt: number
  discountAmountOpt: number
  reasonOpt: string
  suggestedPriceAI: number | null
  discountPctAI: number
  discountAmountAI: number
  reasonAI: string
}

type SortKey = "stagnation_days" | "cvr" | "currentPrice" | "discountPctOpt" | "discountPctAI"

const toMan = (yen: number) => `${(yen / 10000).toFixed(1)}万`

function stagnationColor(days: number) {
  if (days >= 180) return "bg-red-100 text-red-800 font-bold"
  if (days >= 90) return "bg-orange-100 text-orange-800 font-bold"
  if (days >= 60) return "bg-yellow-100 text-yellow-800"
  if (days >= 30) return "bg-blue-50 text-blue-700"
  return "bg-green-50 text-green-700"
}

function cvrColor(cvr: number) {
  if (cvr === 0) return "text-gray-400"
  if (cvr < 1) return "text-red-600 font-bold"
  if (cvr < 2) return "text-orange-600 font-semibold"
  if (cvr >= 5) return "text-green-600 font-semibold"
  return "text-blue-600"
}

export default function IntegratedAnalysisTable({ vehicles }: { vehicles: VehicleRow[] }) {
  const [search, setSearch] = useState("")
  const [makerFilter, setMakerFilter] = useState("")
  const [stagnationFilter, setStagnationFilter] = useState<"" | "60" | "90" | "180">("") // min days
  const [sortKey, setSortKey] = useState<SortKey>("stagnation_days")
  const [sortAsc, setSortAsc] = useState(false)

  const makers = useMemo(() => {
    const set = new Set(vehicles.map(v => v.maker).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [vehicles])

  const filtered = useMemo(() => {
    let rows = vehicles
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(v =>
        [v.maker, v.car_name, v.grade].some(f => f?.toLowerCase().includes(q))
      )
    }
    if (makerFilter) rows = rows.filter(v => v.maker === makerFilter)
    if (stagnationFilter) {
      const min = parseInt(stagnationFilter, 10)
      rows = rows.filter(v => v.stagnation_days >= min)
    }
    return [...rows].sort((a, b) => {
      const diff = (a[sortKey] as number) - (b[sortKey] as number)
      return sortAsc ? diff : -diff
    })
  }, [vehicles, search, makerFilter, stagnationFilter, sortKey, sortAsc])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(p => !p)
    else { setSortKey(key); setSortAsc(false) }
  }

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => toggleSort(k)}
      className="flex items-center gap-1 hover:text-blue-600 whitespace-nowrap"
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === k ? "text-blue-500" : "text-gray-300"}`} />
    </button>
  )

  return (
    <div>
      {/* Filters */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="車名・グレードで絞込"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm w-52"
          />
        </div>
        <select
          value={makerFilter}
          onChange={e => setMakerFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">全メーカー</option>
          {makers.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={stagnationFilter}
          onChange={e => setStagnationFilter(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">全滞留日数</option>
          <option value="60">60日以上</option>
          <option value="90">90日以上</option>
          <option value="180">180日以上</option>
        </select>
        <span className="text-sm text-gray-500 ml-auto">{filtered.length}台表示</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">
                車両
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                <SortBtn k="stagnation_days" label="滞留日数" />
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                <SortBtn k="cvr" label="CVR" />
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">閲覧/問合</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                <SortBtn k="currentPrice" label="現在価格" />
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-blue-50">
                最適化提案
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-purple-50">
                AI提案
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">アクション</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(v => (
              <tr key={v.id} className="hover:bg-gray-50">
                {/* Vehicle name */}
                <td className="px-4 py-3 sticky left-0 bg-white hover:bg-gray-50 min-w-[200px]">
                  <div className="font-medium text-gray-900 text-sm">
                    {v.maker} {v.car_name}
                  </div>
                  {v.grade && <div className="text-xs text-gray-400">{v.grade}</div>}
                </td>

                {/* Stagnation */}
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs ${stagnationColor(v.stagnation_days)}`}>
                    {v.stagnation_days}日
                  </span>
                </td>

                {/* CVR */}
                <td className="px-4 py-3 text-center">
                  {v.detail_views > 0 ? (
                    <span className={`text-sm ${cvrColor(v.cvr)}`}>
                      {v.cvr.toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>

                {/* Views / Inquiries */}
                <td className="px-4 py-3 text-center text-xs text-gray-500">
                  {v.detail_views} / {v.email_inquiries}
                </td>

                {/* Current price */}
                <td className="px-4 py-3 text-right font-mono text-sm text-gray-900">
                  {v.currentPrice > 0 ? toMan(v.currentPrice) : "—"}
                </td>

                {/* Optimization suggestion */}
                <td className="px-4 py-3 text-center bg-blue-50/40">
                  {v.suggestedPriceOpt != null ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-mono text-blue-700 font-semibold text-sm">
                        {toMan(v.suggestedPriceOpt)}
                      </span>
                      <span className="text-xs text-red-500">
                        -{toMan(v.discountAmountOpt)} ({v.discountPctOpt}%)
                      </span>
                      {v.reasonOpt && (
                        <span className="text-xs text-gray-400">{v.reasonOpt}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-300 text-xs">提案なし</span>
                  )}
                </td>

                {/* AI suggestion */}
                <td className="px-4 py-3 text-center bg-purple-50/40">
                  {v.suggestedPriceAI != null ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-mono text-purple-700 font-semibold text-sm">
                        {toMan(v.suggestedPriceAI)}
                      </span>
                      <span className="text-xs text-red-500">
                        -{toMan(v.discountAmountAI)} ({v.discountPctAI}%)
                      </span>
                      {v.reasonAI && (
                        <span className="text-xs text-gray-400">{v.reasonAI}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-300 text-xs">提案なし</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Link
                      href={`/admin/inventory/${v.id}`}
                      className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                    >
                      詳細
                    </Link>
                    <Link
                      href="/admin/analytics/pricing"
                      className="text-xs text-orange-600 hover:underline whitespace-nowrap"
                    >
                      価格調整
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400 text-sm">
                  該当する車両がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
