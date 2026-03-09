import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/layout/AdminSidebar'
import AdminHeader from '@/components/layout/AdminHeader'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { UserProfile } from '@/types'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile with role
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = data as UserProfile | null
  const userRole = profile?.role || 'viewer'

  return (
    <ToastProvider>
      <div className="flex h-screen bg-gray-50">
        <AdminSidebar userRole={userRole} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminHeader user={user} profile={profile} />
          <main className="flex-1 overflow-y-auto p-6 lg:p-6 pt-20 lg:pt-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
