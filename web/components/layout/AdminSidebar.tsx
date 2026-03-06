'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Package, 
  BarChart3, 
  TrendingDown,
  Percent,
  DollarSign,
  Settings,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminSidebarProps {
  userRole: string
}

const navigation = [
  { 
    name: 'ダッシュボード', 
    href: '/admin/dashboard', 
    icon: LayoutDashboard,
    roles: ['admin', 'viewer']
  },
  { 
    name: '在庫管理', 
    href: '/admin/inventory', 
    icon: Package,
    roles: ['admin']
  },
  { 
    name: '分析',
    icon: BarChart3,
    roles: ['admin', 'viewer'],
    children: [
      { name: '滞留分析', href: '/admin/analytics/stagnation', icon: TrendingDown },
      { name: 'CVR分析', href: '/admin/analytics/cvr', icon: Percent },
      { name: '価格最適化', href: '/admin/analytics/pricing', icon: DollarSign },
    ]
  },
  { 
    name: '設定', 
    href: '/admin/settings', 
    icon: Settings,
    roles: ['admin']
  },
]

export default function AdminSidebar({ userRole }: AdminSidebarProps) {
  const pathname = usePathname()

  // Debug: log the role
  console.log('AdminSidebar userRole:', userRole, typeof userRole)

  const canAccess = (roles: string[]) => roles.includes(userRole)

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-primary">Carbey</h1>
        <p className="text-sm text-gray-500 mt-1">在庫管理システム</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          if (!canAccess(item.roles)) return null

          if (item.children) {
            return (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center px-3 py-2 text-sm font-medium text-gray-700">
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </div>
                <div className="ml-8 space-y-1">
                  {item.children.map((child) => {
                    const isActive = pathname === child.href
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center px-3 py-2 text-sm rounded-lg transition-colors',
                          isActive
                            ? 'bg-primary text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        )}
                      >
                        <child.icon className="w-4 h-4 mr-2" />
                        {child.name}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          }

          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          Role: <span className="font-medium text-gray-700">{userRole}</span>
        </div>
      </div>
    </div>
  )
}
