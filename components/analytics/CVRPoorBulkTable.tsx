"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatNumber, formatPrice } from "@/lib/utils"
import PriceEditModal from "@/components/inventory/PriceEditModal"
import StatusChangeDropdown from "@/components/inventory/StatusChangeDropdown"

type Row = {
  id: string
  maker: string | null
  car_name: string | null
  grade: string | null
  price_body: number | null
  detail_views: number | null
  email_inquiries: number | null
  cvr: number
  status: string | null
}

type Props = {
  rows: Row[]
}

export default function CVRPoorBulkTable({ rows }: Props) {
  const supabase = useMemo(() => createClient(), [])

  const makers = useMemo(
    () => Array.from(new Set(rows.map((r) => r.maker).filter((m): m is string => !!m))).sort(),
    [rows]
  )

  const [makerFilter, setMakerFilter] = useState<string>("all")
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [deltaMan, setDeltaMan] = useState<number>(-5)
  const [statusBulk, setStatusBulk] = useState<string>("非公開")

  const [priceModal, setPriceModal] = useState<{ id: string; currentPrice: number } | null>(null)

  const filteredRows = useMemo(
    () => (makerFilter === "all" ? rows : rows.filter((r) => r.maker === makerFilter)),
    [rows, makerFilter]
  )

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected])
  const allSelected = selectedIds.length > 0 && selectedIds.length === filteredRows.length

  const toggleAll = () => {
    if (allSelected) {
      setSelected({})
      return
    }
    const next: Record<string, boolean> = {}
    for (const r of rows) next[r.id] = true
    setSelected(next)
  }

  const applyDelta = async () => {
    if (!selectedIds.length) return
    setBusy(true)
    setError(null)
    setNotice(null)

    const delta = Math.trunc(deltaMan * 10000)
    for (const id of selectedIds) {
      const row = filteredRows.find((r) => r.id === id)
      if (!row) continue
      const current = row.price_body || 0
      const next = current + delta
      const { error: updateError } = await (supabase as any)
        .from("inventories")
        .update({ price_body: next, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (updateError) {
        setError(updateError.message)
        setBusy(false)
        return
      }
    }

    setNotice(`一括価格変更しました（${selectedIds.length}件）`)
    setBusy(false)
  }

  const applyStatus = async () => {
    if (!selectedIds.length) return
    setBusy(true)
    setError(null)
    setNotice(null)

    for (const id of selectedIds) {
      const { error: updateError } = await (supabase as any)
        .from("inventories")
        .update({ status: statusBulk, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (updateError) {
        setError(updateError.message)
        setBusy(false)
        return
      }
    }

    setNotice(`一括ステータス変更しました（${selectedIds.length}件 → ${statusBulk}）`)
    setBusy(false)
  }

  return (
    <div className="space-y-4">
      {/* First-view bulk bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm text-gray-600">
            選択中: <span className="font-medium text-gray-900">{selectedIds.length}</span>件
          </div>
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
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={toggleAll}
            disabled={busy || filteredRows.length === 0}
          >
            {allSelected ? "選択解除" : "全選択"}
          </button>

          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white">
            <span className="text-sm text-gray-600">±</span>
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
              一括反映
            </button>
          </div>

          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white">
            <select
              className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
              value={statusBulk}
              onChange={(e) => setStatusBulk(e.target.value)}
              disabled={busy}
            >
              <option value="販売中">販売中</option>
              <option value="非公開">非公開</option>
              <option value="売約済">売約済</option>
            </select>
            <button
              type="button"
              className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
              onClick={applyStatus}
              disabled={busy || selectedIds.length === 0}
            >
              ステータス一括変更
            </button>
          </div>

          <Link
            href="/admin/analytics/pricing"
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
            title="価格最適化へ"
          >
            価格最適化へ
          </Link>
        </div>
      </div>

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
                  disabled={busy || rows.length === 0}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">車両</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">価格</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">閲覧数</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">問合せ数</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CVR</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">推奨アクション</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作（個別）</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRows.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={!!selected[vehicle.id]}
                    onChange={(e) => setSelected((p) => ({ ...p, [vehicle.id]: e.target.checked }))}
                    disabled={busy}
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {vehicle.maker} {vehicle.car_name}
                  </div>
                  <div className="text-xs text-gray-500">{vehicle.grade}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatPrice(vehicle.price_body)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(vehicle.detail_views)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(vehicle.email_inquiries)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-red-600">{vehicle.cvr.toFixed(2)}%</span>
                </td>
                <td className="px-6 py-4 text-xs">
                  <div className="text-gray-600">{vehicle.cvr < 1 ? "価格見直し推奨" : "情報・写真追加"}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
                      onClick={() => setPriceModal({ id: vehicle.id, currentPrice: vehicle.price_body || 0 })}
                      disabled={busy}
                    >
                      価格変更
                    </button>
                    <StatusChangeDropdown vehicleId={vehicle.id} currentStatus={vehicle.status || "販売中"} />
                    <Link href={`/admin/inventory/${vehicle.id}`} className="text-primary hover:text-primary/80">
                      詳細
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {priceModal ? (
        <PriceEditModal
          vehicleId={priceModal.id}
          currentPrice={priceModal.currentPrice}
          onClose={() => setPriceModal(null)}
        />
      ) : null}
    </div>
  )
}

