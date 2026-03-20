'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/ToastProvider'

interface StatusChangeDropdownProps {
  vehicleId: string
  currentStatus: string
}

export default function StatusChangeDropdown({ vehicleId, currentStatus }: StatusChangeDropdownProps) {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [isChanging, setIsChanging] = useState(false)
  const [status, setStatus] = useState(currentStatus)

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status || isChanging) return
    
    setIsChanging(true)
    try {
      const { error } = await (supabase
        .from('inventories') as any)
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId)

      if (error) throw error

      setStatus(newStatus)
      showToast(`1件のステータスを変更しました（→ ${newStatus}）`, 'success')
      router.refresh()
    } catch (err) {
      console.error('Status update failed:', err)
      showToast(err instanceof Error ? err.message : 'ステータスの更新に失敗しました', 'error')
    } finally {
      setIsChanging(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case '販売中': return 'bg-green-100 text-green-800 border-green-200'
      case '売約済': return 'bg-red-100 text-red-800 border-red-200'
      case '非公開': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="relative inline-block">
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={isChanging}
        className={`
          px-3 py-1 rounded-full text-xs font-medium border cursor-pointer
          ${getStatusColor(status)}
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-blue-500
          appearance-none pr-8
        `}
      >
        <option value="販売中">販売中</option>
        <option value="売約済">売約済</option>
        <option value="非公開">非公開</option>
      </select>
      
      {isChanging && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <Loader2 className="w-3 h-3 animate-spin" />
        </div>
      )}
    </div>
  )
}
