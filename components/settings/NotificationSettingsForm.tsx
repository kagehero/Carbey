"use client"

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { NotificationSettings } from '@/types'
import type { Database } from '@/types/database'

type Props = {
  userId: string
  initial: NotificationSettings | null
}

const THRESHOLD_OPTIONS = [30, 45, 60, 90, 120, 180, 240, 365] as const

export default function NotificationSettingsForm({ userId, initial }: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [emailEnabled, setEmailEnabled] = useState<boolean>(initial?.email_enabled ?? true)
  const [stagnationAlertEnabled, setStagnationAlertEnabled] = useState<boolean>(
    initial?.stagnation_alert_enabled ?? true
  )
  const [stagnationThresholdDays, setStagnationThresholdDays] = useState<number>(
    initial?.stagnation_threshold_days ?? 180
  )
  const [priceChangeEnabled, setPriceChangeEnabled] = useState<boolean>(initial?.price_change_enabled ?? true)

  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    setSavedAt(null)

    const payload: Database['public']['Tables']['notification_settings']['Insert'] = {
      user_id: userId,
      email_enabled: emailEnabled,
      stagnation_alert_enabled: stagnationAlertEnabled,
      stagnation_threshold_days: stagnationThresholdDays,
      price_change_enabled: priceChangeEnabled,
    }

    // NOTE: Supabase client generics occasionally fail to pick up newly-added tables
    // in Next.js build environments; cast avoids a hard build error while preserving
    // runtime correctness.
    const { error: upsertError } = await (supabase as any)
      .from('notification_settings')
      .upsert(payload, { onConflict: 'user_id' })

    if (upsertError) {
      setError(upsertError.message)
      setSaving(false)
      return
    }

    setSavedAt(new Date().toLocaleString('ja-JP'))
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 leading-relaxed rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
        日次サマリー（滞留・値下げ目安など）は、SMTP と <code className="text-[11px] bg-white px-1 rounded">DAILY_SUMMARY_TO</code>{" "}
        および <code className="text-[11px] bg-white px-1 rounded">CRON_SECRET</code> 設定時に 1 日 1 回メール送信されます（Vercel Cron）。
      </p>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">メール通知</p>
          <p className="text-xs text-gray-500">通知の送信自体をON/OFFします</p>
        </div>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={emailEnabled}
            onChange={(e) => setEmailEnabled(e.target.checked)}
          />
          <span className="text-sm text-gray-700">{emailEnabled ? '有効' : '無効'}</span>
        </label>
      </div>

      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">滞留アラート</p>
            <p className="text-xs text-gray-500">滞留日数が閾値を超えた在庫を通知対象にします</p>
          </div>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={stagnationAlertEnabled}
              onChange={(e) => setStagnationAlertEnabled(e.target.checked)}
            />
            <span className="text-sm text-gray-700">{stagnationAlertEnabled ? '有効' : '無効'}</span>
          </label>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-700">滞留日数の閾値</p>
            <p className="text-xs text-gray-500">例: 180日以上を通知</p>
          </div>
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            value={stagnationThresholdDays}
            onChange={(e) => setStagnationThresholdDays(parseInt(e.target.value, 10))}
            disabled={!stagnationAlertEnabled}
          >
            {THRESHOLD_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}日以上
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">価格変更通知</p>
            <p className="text-xs text-gray-500">価格が変更された在庫の通知をON/OFFします</p>
          </div>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={priceChangeEnabled}
              onChange={(e) => setPriceChangeEnabled(e.target.checked)}
            />
            <span className="text-sm text-gray-700">{priceChangeEnabled ? '有効' : '無効'}</span>
          </label>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : savedAt ? (
        <p className="text-xs text-gray-500">保存しました（{savedAt}）</p>
      ) : null}

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}

