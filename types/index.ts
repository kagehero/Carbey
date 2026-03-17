import { Database } from './database'

export type Inventory = Database['public']['Tables']['inventories']['Row']
export type InventoryMetric = Database['public']['Tables']['inventory_metrics']['Row']
export type PriceHistory = Database['public']['Tables']['price_histories']['Row']
export type NotificationSettings = Database['public']['Tables']['notification_settings']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']

export type InventoryWithMetrics = Inventory & {
  metrics?: InventoryMetric
}

export type UserRole = 'admin' | 'viewer'

export interface DashboardStats {
  totalInventory: number
  onSale: number
  sold: number
  unpublished: number
  avgStagnationDays: number
  avgCVR: number
  discountCandidates: number
}

export interface StagnationBand {
  label: string
  days: string
  count: number
  percentage: number
}
