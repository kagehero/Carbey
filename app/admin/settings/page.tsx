import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Settings, User, Bell, Lock, Database } from 'lucide-react'
import { UserProfile } from '@/types'

export default async function SettingsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = data as UserProfile | null

  const settingsSections = [
    {
      title: 'アカウント設定',
      icon: User,
      items: [
        { label: 'メールアドレス', value: user.email },
        { label: 'ロール', value: profile?.role || 'viewer' },
        { label: '登録日', value: user.created_at ? new Date(user.created_at).toLocaleDateString('ja-JP') : '-' },
      ]
    },
    {
      title: '通知設定',
      icon: Bell,
      items: [
        { label: 'メール通知', value: '有効' },
        { label: '滞留アラート', value: '180日以上' },
        { label: '価格変更通知', value: '有効' },
      ]
    },
    {
      title: 'データベース',
      icon: Database,
      items: [
        { label: 'Supabase URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/https?:\/\//, '') },
        { label: '接続状態', value: '正常' },
        { label: '最終同期', value: '-' },
      ]
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="text-gray-500 mt-1">システムとアカウントの設定</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settingsSections.map((section) => {
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
                <dl className="space-y-4">
                  {section.items.map((item) => (
                    <div key={item.label} className="flex justify-between items-center">
                      <dt className="text-sm text-gray-500">{item.label}</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {item.value || '-'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">クイックアクション</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
            パスワード変更
          </button>
          <button className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
            通知設定
          </button>
          <button className="px-4 py-3 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium text-red-600">
            アカウント削除
          </button>
        </div>
      </div>

      {/* Info Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900">セキュリティ情報</h3>
            <p className="text-sm text-blue-700 mt-1">
              設定の変更は即座に反映されます。重要な変更を行う前に、管理者に確認してください。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
