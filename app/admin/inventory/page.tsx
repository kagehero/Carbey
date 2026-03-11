import { createClient } from '@/lib/supabase/server'
import InventoryGrid from '@/components/inventory/InventoryGrid'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function InventoryPage() {
  const supabase = await createClient()

  const { data: inventories, error } = await supabase
    .from('inventories')
    .select('*')
    .order('inserted_at', { ascending: false })

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">データの取得に失敗しました</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">在庫管理</h1>
          <p className="text-gray-500 mt-1">
            全{inventories?.length || 0}台の在庫を管理
          </p>
        </div>

        <Link
          href="/admin/inventory/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          新規登録
        </Link>
      </div>

      <InventoryGrid inventories={inventories || []} />
    </div>
  )
}
