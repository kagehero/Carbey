import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number | null | undefined): string {
  if (!price) return '価格未定'
  return `${(price / 10000).toFixed(1)}万円`
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-'
  return num.toLocaleString('ja-JP')
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export function formatMileage(mileage: number | null | undefined): string {
  if (!mileage) return '-'
  return `${(mileage / 10000).toFixed(1)}万km`
}

export function calculateStagnationDays(publishedDate: string | Date | null): number {
  if (!publishedDate) return 0
  const published = typeof publishedDate === 'string' ? new Date(publishedDate) : publishedDate
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - published.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export function getStagnationBand(days: number): string {
  if (days <= 30) return 'normal'
  if (days <= 45) return 'watch'
  if (days <= 60) return 'attention'
  if (days <= 180) return 'critical'
  return 'urgent'
}

export function getStagnationLabel(days: number): string {
  const band = getStagnationBand(days)
  const labels = {
    normal: '正常',
    watch: '注視',
    attention: '注意',
    critical: '警告',
    urgent: '緊急'
  }
  return labels[band as keyof typeof labels]
}

export function getStagnationColor(days: number): string {
  const band = getStagnationBand(days)
  const colors = {
    normal: 'text-green-600',
    watch: 'text-blue-600',
    attention: 'text-yellow-600',
    critical: 'text-orange-600',
    urgent: 'text-red-600'
  }
  return colors[band as keyof typeof colors]
}

export function calculateCVR(inquiries: number | null, views: number | null): number {
  if (!views || views === 0) return 0
  if (!inquiries) return 0
  return (inquiries / views) * 100
}

export function getNoStagnationReason(
  publishedDate: string | Date | null,
  publicationStatus?: string | null,
  status?: string | null
): string {
  if (publishedDate) return ''
  
  if (publicationStatus === '非掲載') {
    return '未掲載（まだカーセンサーに掲載されていません）'
  } else if (status === '売約済') {
    return '売約済（販売完了のため掲載終了）'
  } else if (status === '非公開') {
    return '非公開（掲載を一時停止中）'
  } else {
    return '掲載開始日未設定'
  }
}
