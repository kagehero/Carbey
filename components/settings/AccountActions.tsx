"use client"

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AccountActions() {
  const supabase = useMemo(() => createClient(), [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changePassword = async () => {
    const next = window.prompt('新しいパスワードを入力してください（8文字以上推奨）')
    if (!next) return
    setBusy(true)
    setError(null)

    const { error: updateError } = await supabase.auth.updateUser({ password: next })
    if (updateError) {
      setError(updateError.message)
      setBusy(false)
      return
    }

    setBusy(false)
    window.alert('パスワードを更新しました')
  }

  const openNotificationSettingsHint = () => {
    const el = document.getElementById('notification-settings')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const deleteAccount = async () => {
    const ok = window.confirm(
      'アカウント削除を実行します。この操作は取り消せません。\n\n削除されるのはログイン用アカウントとプロフィールです。在庫データは削除しません。'
    )
    if (!ok) return

    setBusy(true)
    setError(null)

    const resp = await fetch('/api/account/delete', { method: 'POST' })
    const body = await resp.json().catch(() => null)

    if (!resp.ok) {
      setError(body?.error || body?.message || '削除に失敗しました')
      setBusy(false)
      return
    }

    try {
      await supabase.auth.signOut()
    } finally {
      window.location.href = '/login'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">クイックアクション</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={changePassword}
          disabled={busy}
          className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50"
        >
          パスワード変更
        </button>
        <button
          onClick={openNotificationSettingsHint}
          disabled={busy}
          className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50"
        >
          通知設定
        </button>
        <button
          onClick={deleteAccount}
          disabled={busy}
          className="px-4 py-3 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium text-red-600 disabled:opacity-50"
        >
          アカウント削除
        </button>
      </div>
      {error ? <p className="text-sm text-red-600 mt-4">{error}</p> : null}
    </div>
  )
}

