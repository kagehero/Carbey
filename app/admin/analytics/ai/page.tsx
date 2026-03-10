import { createClient } from '@/lib/supabase/server'
import { calculateStagnationDays, calculateCVR } from '@/lib/utils'
import { Brain, TrendingUp, DollarSign, AlertTriangle, CheckCircle, Target, Zap } from 'lucide-react'
import Link from 'next/link'

type Priority = 'high' | 'medium' | 'low'
type Impact = 'high' | 'medium' | 'low'
type Effort = 'low' | 'medium' | 'high'
type ColorKey = 'red' | 'orange' | 'yellow' | 'green'

interface Recommendation {
  id: number
  priority: Priority
  category: string
  title: string
  description: string
  impact: Impact
  effort: Effort
  vehicles: any[]
  action: string
  icon: typeof DollarSign
  color: ColorKey
}

async function getAIInsights() {
  const supabase = await createClient()

  const { data: inventories } = await supabase
    .from('inventories')
    .select('*')
    .eq('status', '販売中')

  const vehicles = (inventories || []).map((v: any) => ({
    ...v,
    stagnation_days: calculateStagnationDays(v.published_date),
    cvr: calculateCVR(v.email_inquiries, v.detail_views)
  }))

  // AI Analysis Logic
  const insights = {
    // High Priority Issues
    highPriority: vehicles.filter(v => 
      v.stagnation_days >= 180 || v.cvr < 1
    ).length,

    // Pricing Issues
    pricingIssues: vehicles.filter(v => 
      v.stagnation_days >= 60 && v.price_body > 2000000
    ),

    // Low Engagement
    lowEngagement: vehicles.filter(v => 
      v.detail_views > 0 && v.cvr < 2
    ),

    // Quick Wins
    quickWins: vehicles.filter(v => 
      v.stagnation_days >= 30 && v.stagnation_days < 60 && v.detail_views > 10
    ),

    // Success Stories
    successStories: vehicles.filter(v => 
      v.cvr >= 5 && v.stagnation_days < 30
    ),

    totalVehicles: vehicles.length
  }

  // AI Recommendations
  const recommendations: Recommendation[] = [
    {
      id: 1,
      priority: 'high',
      category: '価格最適化',
      title: `${insights.pricingIssues.length}台の車両で価格調整を推奨`,
      description: '60日以上滞留している高価格帯の車両は、5-10%の値下げで成約率が向上する可能性があります。',
      impact: 'high',
      effort: 'low',
      vehicles: insights.pricingIssues.slice(0, 5),
      action: '価格を見直す',
      icon: DollarSign,
      color: 'red'
    },
    {
      id: 2,
      priority: 'high',
      category: '掲載内容改善',
      title: `${insights.lowEngagement.length}台の車両で説明文を強化`,
      description: '閲覧数はあるが問合せが少ない車両は、写真や説明文を充実させることで成約率が2-3倍向上します。',
      impact: 'high',
      effort: 'medium',
      vehicles: insights.lowEngagement.slice(0, 5),
      action: '説明を改善',
      icon: TrendingUp,
      color: 'orange'
    },
    {
      id: 3,
      priority: 'medium',
      category: 'クイックウィン',
      title: `${insights.quickWins.length}台の車両で即座に改善可能`,
      description: '閲覧数が多く、適度な滞留期間の車両は、小さな改善で成約に繋がる可能性が高いです。',
      impact: 'medium',
      effort: 'low',
      vehicles: insights.quickWins.slice(0, 5),
      action: '今すぐ対応',
      icon: Zap,
      color: 'yellow'
    },
    {
      id: 4,
      priority: 'low',
      category: '成功事例',
      title: `${insights.successStories.length}台の成功パターンを分析`,
      description: '高CVR・短期成約の車両の特徴を他の車両に応用することで、全体の成約率向上が期待できます。',
      impact: 'low',
      effort: 'medium',
      vehicles: insights.successStories.slice(0, 5),
      action: 'パターンを学ぶ',
      icon: CheckCircle,
      color: 'green'
    }
  ]

  return { insights, recommendations, vehicles }
}

export default async function AIAnalysisPage() {
  const { insights, recommendations } = await getAIInsights()

  const priorityColors: Record<Priority, string> = {
    high: 'bg-red-50 border-red-200 text-red-800',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    low: 'bg-green-50 border-green-200 text-green-800'
  }

  const iconColors: Record<ColorKey, string> = {
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-purple-100 rounded-lg">
          <Brain className="w-8 h-8 text-purple-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI分析</h1>
          <p className="text-gray-600">AIによる在庫改善提案と優先度分析</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-xs font-medium text-red-600">緊急</span>
          </div>
          <div className="text-3xl font-bold text-red-900">{insights.highPriority}</div>
          <div className="text-sm text-red-700">優先対応が必要</div>
        </div>

        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-orange-600" />
            <span className="text-xs font-medium text-orange-600">価格</span>
          </div>
          <div className="text-3xl font-bold text-orange-900">{insights.pricingIssues.length}</div>
          <div className="text-sm text-orange-700">価格調整推奨</div>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-5 h-5 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-600">改善</span>
          </div>
          <div className="text-3xl font-bold text-yellow-900">{insights.quickWins.length}</div>
          <div className="text-sm text-yellow-700">即座に改善可能</div>
        </div>

        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-xs font-medium text-green-600">成功</span>
          </div>
          <div className="text-3xl font-bold text-green-900">{insights.successStories.length}</div>
          <div className="text-sm text-green-700">成功パターン</div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">AI推奨アクション</h2>
        
        {recommendations.map((rec) => {
          const Icon = rec.icon
          
          return (
            <div key={rec.id} className="bg-white border-2 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              {/* Header */}
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${iconColors[rec.color]}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${priorityColors[rec.priority]}`}>
                          {rec.priority === 'high' ? '高優先度' : rec.priority === 'medium' ? '中優先度' : '低優先度'}
                        </span>
                        <span className="text-sm text-gray-600">{rec.category}</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{rec.title}</h3>
                      <p className="text-gray-600">{rec.description}</p>
                    </div>
                  </div>
                </div>

                {/* Impact & Effort */}
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      効果: <span className="font-semibold">{
                        rec.impact === 'high' ? '大' : rec.impact === 'medium' ? '中' : '小'
                      }</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      工数: <span className="font-semibold">{
                        rec.effort === 'low' ? '小' : rec.effort === 'medium' ? '中' : '大'
                      }</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Affected Vehicles */}
              {rec.vehicles.length > 0 && (
                <div className="border-t bg-gray-50 p-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">対象車両（一部表示）</h4>
                  <div className="space-y-2">
                    {rec.vehicles.map((vehicle: any) => (
                      <Link
                        key={vehicle.id}
                        href={`/admin/inventory/${vehicle.id}`}
                        className="flex items-center justify-between p-3 bg-white border rounded-lg hover:border-blue-300 transition-colors"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {vehicle.maker} {vehicle.car_name}
                          </div>
                          <div className="text-sm text-gray-600">
                            滞留: {vehicle.stagnation_days}日 | CVR: {vehicle.cvr.toFixed(2)}%
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                          {rec.action}
                        </button>
                      </Link>
                    ))}
                  </div>
                  {rec.vehicles.length > 5 && (
                    <div className="mt-3 text-sm text-gray-600 text-center">
                      他 {rec.vehicles.length - 5} 台...
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Action Summary */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">💡 今週の推奨アクション</h3>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-purple-600 font-bold">1.</span>
            <span>緊急対応が必要な<strong>{insights.highPriority}台</strong>の車両を優先的に確認</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 font-bold">2.</span>
            <span>価格調整推奨の<strong>{insights.pricingIssues.length}台</strong>を週内に見直し</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 font-bold">3.</span>
            <span>成功事例<strong>{insights.successStories.length}台</strong>のパターンを他の車両に応用</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
