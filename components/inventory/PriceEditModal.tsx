'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { DollarSign, Save, X, Loader2, History } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface PriceEditModalProps {
  vehicleId: string
  currentPrice: number
  onClose: () => void
}

export default function PriceEditModal({ vehicleId, currentPrice, onClose }: PriceEditModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [newPrice, setNewPrice] = useState(currentPrice)
  const [reason, setReason] = useState('')

  const handleSave = async () => {
    if (newPrice === currentPrice) {
      onClose()
      return
    }

    setSaving(true)
    try {
      // Update vehicle price
      const { error: updateError } = await supabase
        .from('inventories')
        .update({
          price_body: newPrice,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', vehicleId)

      if (updateError) throw updateError

      // Record price history
      const { error: historyError } = await supabase
        .from('price_history')
        .insert({
          vehicle_id: vehicleId,
          old_price: currentPrice,
          new_price: newPrice,
          change_reason: reason || null
        } as any)

      if (historyError) console.error('Price history error:', historyError)

      router.refresh()
      onClose()
    } catch (err: any) {
      console.error('Price update failed:', err)
      alert('価格の更新に失敗しました: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const priceChange = newPrice - currentPrice
  const priceChangePercent = ((priceChange / currentPrice) * 100).toFixed(1)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold">価格変更</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              現在の価格
            </label>
            <div className="text-2xl font-bold text-gray-900">
              {formatPrice(currentPrice)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              新しい価格 (円) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="新しい価格を入力"
              autoFocus
            />
          </div>

          {newPrice !== currentPrice && (
            <div className={`p-3 rounded-md ${
              priceChange > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">変更額</span>
                <span className={`text-lg font-bold ${
                  priceChange > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {priceChange > 0 ? '+' : ''}{formatPrice(priceChange)}
                </span>
              </div>
              <div className="text-right text-sm text-gray-600 mt-1">
                ({priceChange > 0 ? '+' : ''}{priceChangePercent}%)
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              変更理由 (任意)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例: 競合車両との価格調整のため"
            />
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-white disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving || newPrice === currentPrice}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                保存
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Price History Display Component
interface PriceHistoryProps {
  vehicleId: string
}

export function PriceHistory({ vehicleId }: PriceHistoryProps) {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useState(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('price_history')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) setHistory(data)
      setLoading(false)
    }

    fetchHistory()
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        価格変更履歴はありません
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {history.map((entry) => {
        const change = entry.new_price - (entry.old_price || 0)
        const changePercent = entry.old_price 
          ? ((change / entry.old_price) * 100).toFixed(1)
          : '0'

        return (
          <div key={entry.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {new Date(entry.created_at).toLocaleDateString('ja-JP')}
                  </span>
                  {entry.old_price && (
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      change > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {change > 0 ? '+' : ''}{changePercent}%
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {entry.old_price && (
                    <>
                      <span className="text-gray-400 line-through">
                        {formatPrice(entry.old_price)}
                      </span>
                      <span className="text-gray-400">→</span>
                    </>
                  )}
                  <span className="text-lg font-semibold text-gray-900">
                    {formatPrice(entry.new_price)}
                  </span>
                </div>
                {entry.change_reason && (
                  <p className="mt-2 text-sm text-gray-600">
                    {entry.change_reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
