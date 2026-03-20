'use client'

import { useState } from 'react'
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
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  BarChart2,
  Sparkles
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
      { name: '統合分析', href: '/admin/analytics/integrated', icon: BarChart2 },
      { name: 'AI分析', href: '/admin/analytics/ai', icon: Sparkles, tag: 'AI' },
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
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['分析']) // デフォルトで分析を展開

  const canAccess = (roles: string[]) => roles.includes(userRole)
  
  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuName) 
        ? prev.filter(name => name !== menuName)
        : [...prev, menuName]
    )
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'bg-white border-r border-gray-200 flex flex-col transition-all duration-300',
          // Desktop
          'hidden lg:flex',
          isCollapsed ? 'w-20' : 'w-64',
          // Mobile
          'lg:relative fixed inset-y-0 left-0 z-50',
          isMobileOpen ? 'flex' : 'hidden lg:flex'
        )}
      >
        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          {!isCollapsed ? (
            <>
              <h1 className="text-2xl font-bold text-primary">Carbey</h1>
              <p className="text-sm text-gray-500 mt-1">在庫管理システム</p>
            </>
          ) : (
            <h1 className="text-2xl font-bold text-primary text-center">C</h1>
          )}
        </div>

        {/* Desktop Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:block absolute -right-3 top-20 bg-white border border-gray-200 rounded-full p-1 hover:bg-gray-50 shadow-sm z-10"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            if (!canAccess(item.roles)) return null

            if (item.children) {
              const isExpanded = expandedMenus.includes(item.name)
              
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => !isCollapsed && toggleMenu(item.name)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                      isCollapsed ? "justify-center cursor-default" : "hover:bg-gray-100",
                      "text-gray-700"
                    )}
                  >
                    <div className="flex items-center">
                      <item.icon className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
                      {!isCollapsed && item.name}
                    </div>
                    {!isCollapsed && (
                      <ChevronRight 
                        className={cn(
                          "w-4 h-4 transition-transform duration-200",
                          isExpanded && "transform rotate-90"
                        )}
                      />
                    )}
                  </button>
                  {!isCollapsed && (
                    <div 
                      className={cn(
                        "ml-8 space-y-1 overflow-hidden transition-all duration-300 ease-in-out",
                        isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                      )}
                    >
                      {item.children.map((child) => {
                        const isActive = pathname === child.href
                        const childWithTag = child as typeof child & { tag?: string }
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setIsMobileOpen(false)}
                            className={cn(
                              'flex items-center px-3 py-2 text-sm rounded-lg transition-colors',
                              isActive
                                ? 'bg-primary text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                            )}
                          >
                            <child.icon className="w-4 h-4 mr-2" />
                            {child.name}
                            {childWithTag.tag && (
                              <span
                                className={cn(
                                  'ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium',
                                  isActive
                                    ? 'bg-white/20 text-white'
                                    : 'bg-indigo-100 text-indigo-600'
                                )}
                              >
                                {childWithTag.tag}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100',
                  isCollapsed && 'justify-center'
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={cn("w-5 h-5", !isCollapsed && "mr-3")} />
                {!isCollapsed && item.name}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Role: <span className="font-medium text-gray-700">{userRole}</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
