'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Save, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { mapVehicleFormToDbInsert, mapVehicleFormToDbUpdate } from '@/lib/inventoryFormMap'

interface VehicleEditFormProps {
  vehicle?: any | null
  mode?: 'create' | 'edit'
}

export default function VehicleEditForm({ vehicle, mode }: VehicleEditFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveMode = mode ?? (vehicle?.id ? 'edit' : 'create')
  const v = vehicle ?? {}

  const [formData, setFormData] = useState({
    // Basic Info
    maker: v.maker || '',
    car_name: v.car_name || '',
    grade: v.grade || '',
    vehicle_code: v.vehicle_code || '',
    
    // Pricing
    price_body: v.price_body || 0,
    price_total: v.price_total || 0,
    
    // Status
    status: v.status || '販売中',
    publication_status: v.publication_status || '掲載',
    stock_status: v.stock_status || 'あり',
    
    // Specifications
    year: v.year || '',
    mileage: v.mileage || 0,
    body_color: v.body_color || v.color || '',
    transmission: v.transmission || '',
    fuel_type: v.fuel_type || '',
    drive_type: v.drive_type || '',
    
    // Details
    vehicle_inspection: v.vehicle_inspection || v.inspection || '',
    repair_history: v.repair_history || '',
    one_owner: v.one_owner || false,
    
    // Contact
    store_name: v.store_name || '',
    contact_person: v.contact_person || '',
    contact_phone: v.contact_phone || '',
    contact_email: v.contact_email || '',
    location: v.location || '',
    
    // Features
    features: v.features || '',
    equipment: v.equipment || '',
    notes: v.notes || v.comment1 || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : 
              type === 'checkbox' ? (e.target as HTMLInputElement).checked :
              value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (effectiveMode === 'create') {
        const code = String(formData.vehicle_code ?? '').trim()
        if (!code) {
          setError('車両コードは必須です')
          setSaving(false)
          return
        }
        const insertPayload = mapVehicleFormToDbInsert(formData)
        const { data: inserted, error: insertError } = await (supabase.from('inventories') as any)
          .insert(insertPayload)
          .select('id')
          .single()

        if (insertError) throw insertError
        if (!inserted?.id) throw new Error('登録に失敗しました')

        router.push(`/admin/inventory/${inserted.id}`)
        router.refresh()
        return
      }

      const updatePayload = mapVehicleFormToDbUpdate(formData)
      const { error: updateError } = await (supabase.from('inventories') as any)
        .update(updatePayload)
        .eq('id', vehicle!.id)

      if (updateError) throw updateError

      router.push(`/admin/inventory/${vehicle!.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          <p className="font-semibold">エラーが発生しました</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Basic Information */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">基本情報</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メーカー <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="maker"
              value={formData.maker}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              車名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="car_name"
              value={formData.car_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              グレード
            </label>
            <input
              type="text"
              name="grade"
              value={formData.grade}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              車両コード
            </label>
            <input
              type="text"
              name="vehicle_code"
              value={formData.vehicle_code}
              onChange={handleChange}
              disabled
              className="w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-500"
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">価格情報</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              本体価格 (円) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="price_body"
              value={formData.price_body}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              総額 (円)
            </label>
            <input
              type="number"
              name="price_total"
              value={formData.price_total}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </section>

      {/* Status */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">ステータス</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              販売ステータス <span className="text-red-500">*</span>
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="販売中">販売中</option>
              <option value="売約済">売約済</option>
              <option value="非公開">非公開</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              掲載ステータス
            </label>
            <select
              name="publication_status"
              value={formData.publication_status}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="掲載">掲載</option>
              <option value="非掲載">非掲載</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              在庫ステータス <span className="text-red-500">*</span>
            </label>
            <select
              name="stock_status"
              value={formData.stock_status}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="あり">在庫あり</option>
              <option value="なし">在庫なし</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              ダッシュボード・分析の「販売中」は掲載有・在庫有で集計されます
            </p>
          </div>
        </div>
      </section>

      {/* Specifications */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">車両仕様</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              年式
            </label>
            <input
              type="text"
              name="year"
              value={formData.year}
              onChange={handleChange}
              placeholder="2020"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              走行距離 (km)
            </label>
            <input
              type="number"
              name="mileage"
              value={formData.mileage}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ボディカラー
            </label>
            <input
              type="text"
              name="body_color"
              value={formData.body_color}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ミッション
            </label>
            <select
              name="transmission"
              value={formData.transmission}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">選択してください</option>
              <option value="AT">AT</option>
              <option value="MT">MT</option>
              <option value="CVT">CVT</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              燃料
            </label>
            <select
              name="fuel_type"
              value={formData.fuel_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">選択してください</option>
              <option value="ガソリン">ガソリン</option>
              <option value="ディーゼル">ディーゼル</option>
              <option value="ハイブリッド">ハイブリッド</option>
              <option value="電気">電気</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              駆動方式
            </label>
            <select
              name="drive_type"
              value={formData.drive_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">選択してください</option>
              <option value="2WD">2WD</option>
              <option value="4WD">4WD</option>
            </select>
          </div>
        </div>
      </section>

      {/* Additional Details */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">追加情報</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              車検
            </label>
            <input
              type="text"
              name="vehicle_inspection"
              value={formData.vehicle_inspection}
              onChange={handleChange}
              placeholder="令和7年1月"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              修復歴
            </label>
            <input
              type="text"
              name="repair_history"
              value={formData.repair_history}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="one_owner"
                checked={formData.one_owner}
                onChange={handleChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">ワンオーナー</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              装備・オプション
            </label>
            <textarea
              name="equipment"
              value={formData.equipment}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ナビ、ETC、バックカメラ..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              特徴・アピールポイント
            </label>
            <textarea
              name="features"
              value={formData.features}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              備考
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">販売店情報</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              店舗名
            </label>
            <input
              type="text"
              name="store_name"
              value={formData.store_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              担当者
            </label>
            <input
              type="text"
              name="contact_person"
              value={formData.contact_person}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              電話番号
            </label>
            <input
              type="tel"
              name="contact_phone"
              value={formData.contact_phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              name="contact_email"
              value={formData.contact_email}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              所在地
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Link
          href={effectiveMode === 'create' ? '/admin/inventory' : `/admin/inventory/${vehicle!.id}`}
          className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          キャンセル
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {effectiveMode === 'create' ? '登録中...' : '保存中...'}
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {effectiveMode === 'create' ? '登録' : '保存'}
            </>
          )}
        </button>
      </div>
    </form>
  )
}
