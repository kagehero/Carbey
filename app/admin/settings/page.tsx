import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { User, Bell, Lock, Database } from 'lucide-react'
import { UserProfile } from '@/types'
import type { NotificationSettings } from '@/types'
import NotificationSettingsForm from '@/components/settings/NotificationSettingsForm'
import AccountActions from '@/components/settings/AccountActions'

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

  const { data: notificationSettings } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const typedNotificationSettings = notificationSettings as NotificationSettings | null

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

        <div id="notification-settings" className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">通知設定</h2>
            </div>
          </div>
          <div className="p-6">
            <NotificationSettingsForm userId={user.id} initial={typedNotificationSettings} />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <AccountActions />

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
