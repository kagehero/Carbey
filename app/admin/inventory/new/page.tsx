import VehicleEditForm from '@/components/inventory/VehicleEditForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewInventoryPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/inventory"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          在庫一覧に戻る
        </Link>

        <h1 className="text-3xl font-bold text-gray-900">新規車両登録</h1>
        <p className="text-gray-600 mt-1">
          手動で在庫を追加します（カーセンサー同期以外の車両や補足登録用）
        </p>
      </div>

      <VehicleEditForm mode="create" vehicle={null} />
    </div>
  )
}
