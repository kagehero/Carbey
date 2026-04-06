'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { CvrBandRow } from '@/lib/cvrDistribution'
import { CVR_HELP } from '@/lib/cvrDistribution'

interface CVRAnalyticsChartProps {
  rows: CvrBandRow[]
  /** 掲載有・在庫有の合計（内訳の合計と一致） */
  totalOnSale: number
}

const GRID_COLOR = '#f1f5f9'
const AXIS_COLOR = '#64748b'

export default function CVRAnalyticsChart({ rows, totalOnSale }: CVRAnalyticsChartProps) {
  const chartData = rows.map((r) => ({ ...r, 台数: r.count }))
  const sumBands = rows.reduce((s, r) => s + r.count, 0)

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
        {CVR_HELP}
      </p>
      <div
        className="w-full min-h-[280px]"
        style={{ height: Math.min(640, 48 + chartData.length * 28) }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 8, right: 24, left: 4, bottom: 8 }}
            barCategoryGap="10%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: AXIS_COLOR }}
              allowDecimals={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={128}
              tick={{ fontSize: 10, fill: AXIS_COLOR }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.98)',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${value}台`, '台数']}
            />
            <Bar dataKey="台数" radius={[0, 4, 4, 0]} barSize={12} name="台数">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-slate-500 text-center px-1 leading-relaxed">
        掲載有・在庫有 <span className="font-semibold text-slate-700">{totalOnSale}台</span>
        ＝内訳合計 {sumBands}台
        {sumBands === totalOnSale ? (
          <span className="text-emerald-600">（一致）</span>
        ) : (
          <span className="text-amber-600">（要確認）</span>
        )}
      </p>
    </div>
  )
}
