/**
 * Phase 1 canonical definitions — single source of truth for KPIs and analytics.
 *
 * - 販売中 / analysis scope: 掲載有・在庫有 (published + in stock)
 * - 在庫総数: 在庫あり (掲載有・在庫有 + 掲載無・在庫有)
 */

export const VISIBLE_ON_SALE_MATCH = {
  publication_status: '掲載',
  stock_status: 'あり',
} as const

export type PublicationStockRow = {
  publication_status?: string | null
  stock_status?: string | null
}

export function isVisibleOnSale(row: PublicationStockRow): boolean {
  return row.publication_status === '掲載' && row.stock_status === 'あり'
}

export function isInStock(row: { stock_status?: string | null }): boolean {
  return row.stock_status === 'あり'
}
