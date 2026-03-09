import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import VehicleEditForm from '@/components/inventory/VehicleEditForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

async function getVehicle(id: string) {
  const supabase = await createClient()

  const { data: vehicle } = await supabase
    .from('inventories')
    .select('*')
    .eq('id', id)
    .single()

  if (!vehicle) {
    return null
  }

  return vehicle as any
}

export default async function VehicleEditPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const vehicle = await getVehicle(id)

  if (!vehicle) {
    notFound()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/admin/inventory/${id}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          車両詳細に戻る
        </Link>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            車両情報の編集
          </h1>
          <p className="text-gray-600 mt-1">
            {vehicle.maker} {vehicle.car_name} {vehicle.grade}
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <VehicleEditForm vehicle={vehicle} />
    </div>
  )
}
