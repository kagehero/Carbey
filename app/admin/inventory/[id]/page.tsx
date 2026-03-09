import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatPrice, formatMileage, calculateStagnationDays, calculateCVR, getStagnationColor, getCVRColor, getNoStagnationReason } from '@/lib/utils'
import { Calendar, Eye, Mail, Phone, MapPin, Gauge, Palette, Car, AlertCircle } from 'lucide-react'
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

  const vehicleData = vehicle as any
  const stagnation_days = calculateStagnationDays(vehicleData.published_date)
  const cvr = calculateCVR(vehicleData.email_inquiries, vehicleData.detail_views)

  return { ...vehicleData, stagnation_days, cvr }
}

export default async function VehicleDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const vehicle = await getVehicle(id)

  if (!vehicle) {
    notFound()
  }
  
  const noStagnationReason = getNoStagnationReason(
    vehicle.published_date,
    vehicle.publication_status,
    vehicle.status
  )

  const infoSections = [
    {
      title: '基本情報',
      icon: Car,
      items: [
        { label: 'メーカー', value: vehicle.maker },
        { label: '車名', value: vehicle.car_name },
        { label: 'グレード', value: vehicle.grade },
        { label: '型式', value: vehicle.model_code },
        { label: '車台番号', value: vehicle.vehicle_code },
      ]
    },
    {
      title: '車両詳細',
      icon: Gauge,
      items: [
        { label: '年式', value: vehicle.model_year },
        { label: '走行距離', value: formatMileage(vehicle.mileage) },
        { label: '排気量', value: vehicle.displacement },
        { label: 'ボディタイプ', value: vehicle.body_type },
        { label: 'ドア数', value: vehicle.doors },
      ]
    },
    {
      title: '外装・内装',
      icon: Palette,
      items: [
        { label: '外装色', value: vehicle.exterior_color },
        { label: '内装色', value: vehicle.interior_color },
        { label: '定員', value: vehicle.seating_capacity ? `${vehicle.seating_capacity}人` : '-' },
      ]
    },
    {
      title: '価格情報',
      icon: Calendar,
      items: [
        { label: '車両本体価格', value: formatPrice(vehicle.price_body) },
        { label: '支払総額', value: formatPrice(vehicle.price_total) },
        { label: '整備内容', value: vehicle.maintenance_details },
        { label: '保証', value: vehicle.warranty_details },
      ]
    },
    {
      title: '掲載情報',
      icon: Eye,
      items: [
        { label: 'ステータス', value: vehicle.status },
        { label: '掲載開始日', value: vehicle.published_date ? new Date(vehicle.published_date).toLocaleDateString('ja-JP') : '-' },
        { 
          label: '滞留日数', 
          value: vehicle.stagnation_days > 0 ? `${vehicle.stagnation_days}日` : '-',
          valueColor: vehicle.stagnation_days > 0 ? getStagnationColor(vehicle.stagnation_days) : 'text-gray-400',
          tooltip: vehicle.stagnation_days === 0 ? noStagnationReason : undefined
        },
        { label: '閲覧数', value: vehicle.detail_views || 0 },
        { label: 'メール問合せ', value: vehicle.email_inquiries || 0 },
        { label: '電話問合せ', value: vehicle.phone_inquiries || 0 },
        { label: 'CVR', value: `${vehicle.cvr.toFixed(2)}%`, valueColor: getCVRColor(vehicle.cvr) },
      ]
    },
    {
      title: '店舗情報',
      icon: MapPin,
      items: [
        { label: '店舗名', value: vehicle.shop_name },
        { label: '都道府県', value: vehicle.prefecture },
        { label: '住所', value: vehicle.address },
        { label: '電話番号', value: vehicle.phone },
      ]
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {vehicle.maker} {vehicle.car_name}
            </h1>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              vehicle.status === '販売中' ? 'bg-green-100 text-green-800' :
              vehicle.status === '商談中' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {vehicle.status}
            </span>
          </div>
          <p className="text-gray-500 mt-1">{vehicle.grade}</p>
        </div>

        <Link
          href="/admin/inventory"
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          一覧に戻る
        </Link>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div className="text-sm text-gray-500">滞留日数</div>
            {vehicle.stagnation_days === 0 && noStagnationReason && (
              <div className="group relative inline-block ml-auto">
                <AlertCircle className="w-4 h-4 text-gray-400 cursor-help" />
                <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                  <div className="font-semibold mb-1">表示されない理由：</div>
                  <div>{noStagnationReason}</div>
                  <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            )}
          </div>
          <div className={`text-3xl font-bold ${vehicle.stagnation_days > 0 ? getStagnationColor(vehicle.stagnation_days) : 'text-gray-400'}`}>
            {vehicle.stagnation_days > 0 ? `${vehicle.stagnation_days}日` : '-'}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-5 h-5 text-gray-400" />
            <div className="text-sm text-gray-500">閲覧数</div>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {vehicle.detail_views || 0}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-5 h-5 text-gray-400" />
            <div className="text-sm text-gray-500">問合せ数</div>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {(vehicle.email_inquiries || 0) + (vehicle.phone_inquiries || 0)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Phone className="w-5 h-5 text-gray-400" />
            <div className="text-sm text-gray-500">CVR</div>
          </div>
          <div className={`text-3xl font-bold ${getCVRColor(vehicle.cvr)}`}>
            {vehicle.cvr.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Detailed Information Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {infoSections.map((section) => {
          const Icon = section.icon
          return (
            <div key={section.title} className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                </div>
              </div>
              <div className="p-6">
                <dl className="space-y-3">
                  {section.items.map((item) => (
                    <div key={item.label} className="flex justify-between">
                      <dt className="text-sm text-gray-500">{item.label}</dt>
                      <dd className={`text-sm font-medium ${item.valueColor || 'text-gray-900'} flex items-center gap-1`}>
                        {item.value || '-'}
                        {item.tooltip && (
                          <div className="group relative inline-block">
                            <AlertCircle className="w-4 h-4 text-gray-400 cursor-help" />
                            <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg font-normal">
                              <div className="font-semibold mb-1">理由：</div>
                              <div>{item.tooltip}</div>
                              <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                            </div>
                          </div>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )
        })}
      </div>

      {/* Additional Details */}
      {vehicle.features && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">装備・特徴</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{vehicle.features}</p>
          </div>
        </div>
      )}

      {vehicle.inspection_history && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">点検記録</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{vehicle.inspection_history}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
          価格を編集
        </button>
        <button className="flex-1 px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          ステータスを変更
        </button>
        <button className="px-6 py-3 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
          削除
        </button>
      </div>
    </div>
  )
}
