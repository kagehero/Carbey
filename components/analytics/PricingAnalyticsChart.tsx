'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface DataPoint {
  name: string
  count: number
  ratio: number
}

interface PricingAnalyticsChartProps {
  data: DataPoint[]
  totalOnSale: number
}

/** `buildPricingAnalyticsBands` の並び（366日超 → … → CVRのみ）に対応 */
const PRICING_SLICE_COLORS = [
  '#450a0a',
  '#7f1d1d',
  '#991b1b',
  '#b91c1c',
  '#dc2626',
  '#ea580c',
  '#f97316',
  '#fb923c',
  '#fbbf24',
  '#eab308',
  '#ca8a04',
  '#a16207',
  '#854d0e',
  '#0ea5e9',
]

export default function PricingAnalyticsChart({ data, totalOnSale }: PricingAnalyticsChartProps) {
  const pieData = useMemo(() => {
    return data
      .map((d, i) => ({
        ...d,
        fill: PRICING_SLICE_COLORS[i % PRICING_SLICE_COLORS.length],
      }))
      .filter((d) => d.count > 0)
  }, [data])

  const totalInPie = useMemo(() => pieData.reduce((s, d) => s + d.count, 0), [pieData])

  return (
    <div className="w-full">
      <div className="rounded-lg border border-slate-100 bg-gradient-to-b from-white to-slate-50/40 px-2 py-4">
        {pieData.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-slate-500">
            該当する台数がありません
          </div>
        ) : (
          <>
            <div className="relative mx-auto h-[300px] w-full max-w-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="44%"
                    outerRadius="78%"
                    paddingAngle={1}
                    stroke="#fff"
                    strokeWidth={1}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255,255,255,0.98)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 8px 30px rgba(15, 23, 42, 0.12)',
                      padding: '12px 14px',
                    }}
                    formatter={(value: number, _name: string, item: { payload?: DataPoint }) => {
                      const p = item.payload
                      return [`${value}台（全体の${p?.ratio ?? 0}%）`, '対象台数']
                    }}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="-translate-y-1 text-center">
                  <p className="text-2xl font-bold tabular-nums text-slate-800">{totalInPie}</p>
                  <p className="text-[11px] text-slate-500">台（内訳合計）</p>
                </div>
              </div>
            </div>

            <ul className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-2 border-t border-slate-100 pt-4 text-left">
              {pieData.map((d) => (
                <li
                  key={d.name}
                  className="inline-flex max-w-[200px] items-start gap-2 text-[11px] leading-snug text-slate-600"
                >
                  <span
                    className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: d.fill }}
                    aria-hidden
                  />
                  <span>
                    <span className="font-medium text-slate-700">{d.name}</span>
                    <span className="text-slate-400">
                      {' '}
                      · {d.count}台（{d.ratio}%）
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <p className="text-[11px] text-slate-500 mt-3 mb-0.5 text-center px-1 leading-relaxed">
        価格検討対象（閲覧あり・平均CVR未満・滞留60日以上）のみを滞留帯に分割。割合は掲載在庫全体に対するシェア（各扇は排他）。
        <br />
        <span className="text-slate-400">分母: 掲載有・在庫有 {totalOnSale}台</span>
      </p>
    </div>
  )
}
