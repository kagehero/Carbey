'use client'

import React from 'react'
import { User } from '@supabase/supabase-js'
import { LogOut, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserProfile } from '@/types'
import { useToast } from '@/components/ui/ToastProvider'

interface AdminHeaderProps {
  user: User
  profile: UserProfile | null
}

export default function AdminHeader({ user, profile }: AdminHeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const { showToast, updateProgress, hideToast } = useToast()
  const [syncing, setSyncing] = React.useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleSync = async () => {
    if (syncing) return
    
    setSyncing(true)
    
    // Show progress toast
    showToast('在庫同期を開始しています...', 'loading', 0)
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      updateProgress(Math.min(90, Math.random() * 30 + 60))
    }, 500)
    
    try {
      const response = await fetch('/api/sync', { method: 'POST' })
      const data = await response.json()
      
      clearInterval(progressInterval)
      
      if (response.ok && data.success) {
        updateProgress(100)
        setTimeout(() => {
          hideToast()
          showToast(`✓ 同期完了: ${data.vehicleCount}台の車両データを更新しました`, 'success')
        }, 500)
        
        // Refresh the page after a short delay
        setTimeout(() => {
          router.refresh()
        }, 1500)
      } else {
        hideToast()
        showToast('✗ 同期に失敗しました: ' + (data.error || data.message), 'error')
      }
    } catch (error) {
      clearInterval(progressInterval)
      hideToast()
      showToast('✗ 同期エラーが発生しました', 'error')
      console.error(error)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            管理画面
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? '同期中...' : '在庫同期'}
          </button>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-700">
                {profile?.name || user.email}
              </div>
              <div className="text-xs text-gray-500">
                {profile?.role === 'admin' ? '管理者' : '閲覧者'}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="ログアウト"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
