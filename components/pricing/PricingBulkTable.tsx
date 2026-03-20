"use client"

import { useMemo, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatPrice } from "@/lib/utils"
import TablePagination from "@/components/ui/TablePagination"

export type PricingMode = "optimization" | "ai"

export type PricingRow = {
  id: string
  maker: string | null
  car_name: string | null
  grade: string | null
  stagnation_days: number
  cvr: number
  currentPrice: number
  costPrice?: number | null
  discountPctOptimization: number
  suggestedPriceOptimization: number
  discountAmountOptimization: number
  reasonOptimization: string
  discountPctAI: number
  suggestedPriceAI: number
  discountAmountAI: number
  reasonAI: string
}

type Guardrails = {
  minPriceYen: number
  maxDiscountPct: number
  maxDiscountYen: number
  minMarginYen: number
}

type Props = {
  rows: PricingRow[]
  guardrails: Guardrails
}

function clampSuggestedPrice(current: number, suggested: number, g: Guardrails, costPrice?: number | null) {
  const minByPct = Math.floor(current * (1 - g.maxDiscountPct / 100))
  const minByYen = current - g.maxDiscountYen
  const floorByCost =
    typeof costPrice === "number" && !Number.isNaN(costPrice) ? Math.floor(costPrice + g.minMarginYen) : 0
  const floor = Math.max(g.minPriceYen, floorByCost, minByPct, minByYen, 0)
  return Math.max(suggested, floor)
}

export default function PricingBulkTable({ rows, guardrails }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [mode, setMode] = useState<PricingMode>("optimization")
  const [makerFilter, setMakerFilter] = useState<string>("all")
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [deltaMan, setDeltaMan] = useState<number>(-5) // default -5万円

  const makers = useMemo(
    () => Array.from(new Set(rows.map((r) => r.maker).filter((m): m is string => !!m))).sort(),
    [rows]
  )

  const filteredRows = useMemo(
    () => (makerFilter === "all" ? rows : rows.filter((r) => r.maker === makerFilter)),
    [rows, makerFilter]
  )

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(24)
  useEffect(() => setPage(1), [makerFilter, pageSize, filteredRows.length])
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const paginatedRows = useMemo(
    () => filteredRows.slice((page - 1) * pageSize, page * pageSize),
    [filteredRows, page, pageSize]
  )

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected])
  const allSelected = selectedIds.length > 0 && selectedIds.length === filteredRows.length

  const getSuggestedForMode = (r: PricingRow) => {
    if (mode === "ai") {
      return {
        pct: r.discountPctAI,
        suggested: r.suggestedPriceAI,
        amount: r.discountAmountAI,
        reason: r.reasonAI,
      }
    }
    return {
      pct: r.discountPctOptimization,
      suggested: r.suggestedPriceOptimization,
      amount: r.discountAmountOptimization,
      reason: r.reasonOptimization,
    }
  }

  const preview = useMemo(() => {
    const ids = selectedIds.length ? selectedIds : []
    const targetRows = ids.length ? filteredRows.filter((r) => ids.includes(r.id)) : []
    if (!targetRows.length) return null

    const changes = targetRows.map((r) => {
      const s = getSuggestedForMode(r)
      const clamped = clampSuggestedPrice(r.currentPrice, s.suggested, guardrails, r.costPrice)
      return { id: r.id, from: r.currentPrice, to: clamped, clamped: clamped !== s.suggested }
    })

    const total = changes.reduce((sum, c) => sum + (c.to - c.from), 0)
    const clampedCount = changes.filter((c) => c.clamped).length
    return { count: changes.length, total, clampedCount }
  }, [selectedIds, rows, mode, guardrails])

  const toggleAll = () => {
    if (allSelected) {
      setSelected({})
      return
    }
    const next: Record<string, boolean> = {}
    for (const r of filteredRows) next[r.id] = true
    setSelected(next)
  }

  const applySuggested = async () => {
    if (!selectedIds.length) return
    setBusy(true)
    setError(null)
    setNotice(null)

    const updates = filteredRows
      .filter((r) => selectedIds.includes(r.id))
      .map((r) => {
        const s = getSuggestedForMode(r)
        const nextPrice = clampSuggestedPrice(r.currentPrice, s.suggested, guardrails, r.costPrice)
        return { id: r.id, price_body: nextPrice, updated_at: new Date().toISOString() }
      })
      .filter((u) => typeof u.price_body === "number")

    // IMPORTANT: Use update (not upsert) to avoid accidental inserts that violate NOT NULL constraints.
    for (const u of updates) {
      const { error: updateError } = await (supabase as any)
        .from("inventories")
        .update({ price_body: u.price_body, updated_at: u.updated_at })
        .eq("id", u.id)

      if (updateError) {
        setError(updateError.message)
        setBusy(false)
        return
      }
    }

    setNotice(`一括反映しました（${updates.length}件 / 更新のみ）`)
    setBusy(false)
  }

  const applyDelta = async () => {
    if (!selectedIds.length) return
    setBusy(true)
    setError(null)
    setNotice(null)

    const delta = Math.trunc(deltaMan * 10000)
    const updates = filteredRows
      .filter((r) => selectedIds.includes(r.id))
      .map((r) => {
        const proposed = r.currentPrice + delta
        const nextPrice = clampSuggestedPrice(r.currentPrice, proposed, guardrails, r.costPrice)
        return { id: r.id, price_body: nextPrice, updated_at: new Date().toISOString() }
      })

    for (const u of updates) {
      const { error: updateError } = await (supabase as any)
        .from("inventories")
        .update({ price_body: u.price_body, updated_at: u.updated_at })
        .eq("id", u.id)

      if (updateError) {
        setError(updateError.message)
        setBusy(false)
        return
      }
    }

    setNotice(`一括価格変更しました（${updates.length}件 / 更新のみ）`)
    setBusy(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">提案モード</span>
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setMode("optimization")}
              className={`px-3 py-1.5 text-sm rounded-md ${
                mode === "optimization" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50"
              }`}
              disabled={busy}
            >
              価格最適化（ルール）
            </button>
            <button
              type="button"
              onClick={() => setMode("ai")}
              className={`px-3 py-1.5 text-sm rounded-md ${
                mode === "ai" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50"
              }`}
              disabled={busy}
            >
              AI価格提案（検証）
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
            value={makerFilter}
            onChange={(e) => {
              setMakerFilter(e.target.value)
              setSelected({})
            }}
            disabled={busy}
          >
            <option value="all">すべてのメーカー</option>
            {makers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={toggleAll}
            disabled={busy || rows.length === 0}
          >
            {allSelected ? "選択解除" : "全選択"}
          </button>

          <button
            type="button"
            className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
            onClick={applySuggested}
            disabled={busy || selectedIds.length === 0}
          >
            選択分を提案どおり反映
          </button>

          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white">
            <span className="text-sm text-gray-600">一括</span>
            <input
              type="number"
              className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm"
              value={deltaMan}
              onChange={(e) => setDeltaMan(parseInt(e.target.value || "0", 10))}
              disabled={busy}
            />
            <span className="text-sm text-gray-600">万円</span>
            <button
              type="button"
              className="px-3 py-1.5 rounded-md bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-50"
              onClick={applyDelta}
              disabled={busy || selectedIds.length === 0}
            >
              反映
            </button>
          </div>
        </div>
      </div>

      {preview ? (
        <div className="text-sm text-gray-600">
          選択中: <span className="font-medium text-gray-900">{preview.count}</span>件 / 合計変動:{" "}
          <span className={`font-medium ${preview.total < 0 ? "text-red-600" : "text-green-700"}`}>
            {preview.total > 0 ? "+" : ""}
            {formatPrice(preview.total)}
          </span>
          {preview.clampedCount > 0 ? (
            <span className="text-xs text-orange-600 ml-2">
              （ガードレール適用 {preview.clampedCount}件）
            </span>
          ) : null}
        </div>
      ) : (
        <div className="text-sm text-gray-500">チェックボックスで対象を選択してください。</div>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="text-sm text-green-700">{notice}</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={busy || filteredRows.length === 0}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">車両</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">現在価格</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">推奨値下げ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">新価格</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">滞留日数</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CVR</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">理由</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedRows.map((r) => {
              const s = getSuggestedForMode(r)
              const clampedPrice = clampSuggestedPrice(r.currentPrice, s.suggested, guardrails, r.costPrice)
              const clamped = clampedPrice !== s.suggested
              const discountAmount = r.currentPrice - clampedPrice
              const pct = r.currentPrice > 0 ? Math.round((discountAmount / r.currentPrice) * 100) : 0

              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={!!selected[r.id]}
                      onChange={(e) => setSelected((p) => ({ ...p, [r.id]: e.target.checked }))}
                      disabled={busy}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {r.maker} {r.car_name}
                    </div>
                    <div className="text-xs text-gray-500">{r.grade}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{formatPrice(r.currentPrice)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-red-600">-{pct}%</div>
                    <div className="text-xs text-gray-500">-{formatPrice(discountAmount)}</div>
                    {clamped ? (
                      <div className="text-[11px] text-orange-600 mt-1">下限ガード適用</div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-green-700">{formatPrice(clampedPrice)}</span>
                    {typeof r.costPrice === "number" ? (
                      <div className="text-[11px] text-gray-500 mt-1">
                        原価 {formatPrice(r.costPrice)} / 粗利下限 {formatPrice(guardrails.minMarginYen)}
                      </div>
                    ) : (
                      <div className="text-[11px] text-orange-600 mt-1">原価未設定（原価ガード無効）</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{r.stagnation_days}日</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{r.cvr.toFixed(2)}%</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-600">{s.reason}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4">
          <TablePagination
            page={page}
            totalPages={totalPages}
            totalItems={filteredRows.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
            unitLabel="台"
          />
        </div>
      )}

      <div className="text-xs text-gray-500 mt-4">
        ガードレール: 最低価格 {formatPrice(guardrails.minPriceYen)} / 原価+粗利下限 {formatPrice(guardrails.minMarginYen)} /
        最大値下げ率 {guardrails.maxDiscountPct}% / 最大値下げ額 {formatPrice(guardrails.maxDiscountYen)}
      </div>
    </div>
  )
}

