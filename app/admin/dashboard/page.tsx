import { createClient } from '@/lib/supabase/server'
import StagnationChart from '@/components/analytics/StagnationChart'
import PriorityTable from '@/components/analytics/PriorityTable'
import DiscountCandidates from '@/components/analytics/DiscountCandidates'
import DashboardStats from '@/components/analytics/DashboardStats'
import DashboardAlerts from '@/components/analytics/DashboardAlerts'
import { calculateStagnationDays, calculateCVR } from '@/lib/utils'
import { Database } from '@/types/database'

type Inventory = Database['public']['Tables']['inventories']['Row']

async function getDashboardStats() {
  const supabase = await createClient()

  const { data: inventories, error } = await supabase
    .from('inventories')
    .select('*')
    .order('inserted_at', { ascending: false })

  if (error) throw error

  const typedInventories = (inventories || []) as Inventory[]

  const total = typedInventories.length || 0
  const onSale = typedInventories.filter(i => i.status === '販売中').length || 0
  const sold = typedInventories.filter(i => i.status === '売約済').length || 0
  const unpublished = typedInventories.filter(i => i.status === '非公開').length || 0
  
  // Publication status stats
  const published = typedInventories.filter(i => i.publication_status === '掲載').length || 0
  const notPublished = typedInventories.filter(i => i.publication_status === '非掲載').length || 0
  
  // Stock status stats
  const inStock = typedInventories.filter(i => i.stock_status === 'あり').length || 0
  const outOfStock = typedInventories.filter(i => i.stock_status === 'なし').length || 0

  // Calculate average stagnation
  const stagnationDays = typedInventories
    .filter(i => i.published_date && i.status === '販売中')
    .map(i => calculateStagnationDays(i.published_date!))
  const avgStagnation = stagnationDays && stagnationDays.length > 0
    ? Math.round(stagnationDays.reduce((a, b) => a + b, 0) / stagnationDays.length)
    : 0

  // Calculate average CVR
  const cvrs = typedInventories
    .filter(i => i.detail_views && i.detail_views > 0)
    .map(i => calculateCVR(i.email_inquiries, i.detail_views))
  const avgCVR = cvrs && cvrs.length > 0
    ? (cvrs.reduce((a, b) => a + b, 0) / cvrs.length).toFixed(2)
    : '0.00'

  // Discount candidates
  const discountCount = typedInventories.filter(i => {
    if (i.status !== '販売中') return false
    const days = calculateStagnationDays(i.published_date!)
    const cvr = calculateCVR(i.email_inquiries, i.detail_views)
    return days >= 60 || cvr < 2
  }).length || 0

  // Alert counts for reminder panel
  const onSaleVehicles = typedInventories.filter(i => i.status === '販売中' && i.published_date)
  const stagnation180 = onSaleVehicles.filter(i => calculateStagnationDays(i.published_date!) >= 180).length
  const stagnation90 = onSaleVehicles.filter(i => {
    const d = calculateStagnationDays(i.published_date!)
    return d >= 90 && d < 180
  }).length
  const stagnation60 = onSaleVehicles.filter(i => {
    const d = calculateStagnationDays(i.published_date!)
    return d >= 60 && d < 90
  }).length
  const lowCVR = onSaleVehicles.filter(i => {
    const cvr = calculateCVR(i.email_inquiries, i.detail_views)
    return i.detail_views && i.detail_views > 0 && cvr > 0 && cvr < 2
  }).length

  // Stagnation distribution
  const stagnationBands = [
    { label: '0-15日', min: 0, max: 15 },
    { label: '16-30日', min: 16, max: 30 },
    { label: '31-45日', min: 31, max: 45 },
    { label: '46-60日', min: 46, max: 60 },
    { label: '61-90日', min: 61, max: 90 },
    { label: '91-120日', min: 91, max: 120 },
    { label: '121-180日', min: 121, max: 180 },
    { label: '181-240日', min: 181, max: 240 },
    { label: '241-365日', min: 241, max: 365 },
    { label: '366日超', min: 366, max: Infinity },
  ]

  const distribution = stagnationBands.map(band => {
    const count = typedInventories.filter(i => {
      if (i.status !== '販売中' || !i.published_date) return false
      const days = calculateStagnationDays(i.published_date)
      return days >= band.min && days <= band.max
    }).length || 0

    return {
      name: band.label,
      count,
      percentage: onSale > 0 ? Math.round((count / onSale) * 100) : 0
    }
  })

  // Priority vehicles (high stagnation + low CVR)
  const priorityVehicles = typedInventories
    .filter(i => i.status === '販売中' && i.published_date)
    .map(i => {
      const stagnation = calculateStagnationDays(i.published_date!)
      const cvr = calculateCVR(i.email_inquiries, i.detail_views)
      const score = (stagnation * 1.0) + ((5 - cvr) * 10.0)
      return { ...i, stagnation, cvr, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  return {
    stats: {
      total,
      onSale,
      sold,
      unpublished,
      published,
      notPublished,
      inStock,
      outOfStock,
      avgStagnation,
      avgCVR,
      discountCount
    },
    distribution,
    priorityVehicles,
    inventories: typedInventories,
    alerts: { stagnation60, stagnation90, stagnation180, lowCVR, pricingCandidates: discountCount }
  }
}

export default async function DashboardPage() {
  const { stats, distribution, priorityVehicles, inventories, alerts } = await getDashboardStats()

  return (
    <div className="space-y-6">
      <DashboardAlerts {...alerts} />
      <DashboardStats initialStats={stats} />

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stagnation Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            滞留日数分布
          </h2>
          <StagnationChart data={distribution} />
        </div>

        {/* CVR Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            CVR統計
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">平均CVR</span>
                <span className="text-2xl font-bold text-gray-900">
                  {stats.avgCVR}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${Math.min(parseFloat(stats.avgCVR) * 20, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <p className="text-xs text-gray-500">優秀 (≥5%)</p>
                <p className="text-lg font-semibold text-green-600">
                  {inventories.filter(i => calculateCVR(i.email_inquiries, i.detail_views) >= 5).length}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">良好 (2-5%)</p>
                <p className="text-lg font-semibold text-blue-600">
                  {inventories.filter(i => {
                    const cvr = calculateCVR(i.email_inquiries, i.detail_views)
                    return cvr >= 2 && cvr < 5
                  }).length}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">要改善 (&lt;2%)</p>
                <p className="text-lg font-semibold text-red-600">
                  {inventories.filter(i => {
                    const cvr = calculateCVR(i.email_inquiries, i.detail_views)
                    return cvr > 0 && cvr < 2
                  }).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Vehicles */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            優先販売ランキング
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            滞留日数とCVRから算出した優先度の高い車両
          </p>
        </div>
        <PriorityTable vehicles={priorityVehicles} />
      </div>

      {/* Discount Candidates */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            値下げ検討対象
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            滞留60日以上 または CVR 2%未満の車両
          </p>
        </div>
        <DiscountCandidates 
          vehicles={inventories.filter(i => {
            if (i.status !== '販売中' || !i.published_date) return false
            const days = calculateStagnationDays(i.published_date)
            const cvr = calculateCVR(i.email_inquiries, i.detail_views)
            return days >= 60 || cvr < 2
          })} 
        />
      </div>
    </div>
  )
}
