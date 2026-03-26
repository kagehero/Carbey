'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface DataPoint {
  name: string
  count: number
  ratio: number
}

interface PricingAnalyticsChartProps {
  data: DataPoint[]
  totalOnSale: number
}

const BAR_COLOR = '#f59e0b' // amber-500
const LINE_COLOR = '#8b5cf6' // violet-500
const GRID_COLOR = '#f1f5f9'
const AXIS_COLOR = '#64748b'

export default function PricingAnalyticsChart({ data, totalOnSale }: PricingAnalyticsChartProps) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 16, right: 36, left: 8, bottom: 16 }}
          barCategoryGap="20%"
          barGap={4}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            axisLine={{ stroke: AXIS_COLOR, strokeWidth: 1 }}
            tickLine={false}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={48}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            axisLine={false}
            tickLine={false}
            label={{ value: '台数', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: AXIS_COLOR } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 'auto']}
            label={{ value: '割合', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: AXIS_COLOR } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255,255,255,0.98)',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              padding: '12px 16px',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'count') return [`${value}台`, '対象台数']
              return [`${value}%`, '割合']
            }}
            labelFormatter={(label) => label}
          />
          <Legend
            wrapperStyle={{ paddingTop: '16px', paddingBottom: '4px' }}
            iconType="circle"
            iconSize={8}
            align="center"
            formatter={(value: string) =>
              value === 'count' ? '対象台数（棒）' : value === 'ratio' ? '割合（線）' : value
            }
          />
          <Bar
            yAxisId="left"
            dataKey="count"
            fill={BAR_COLOR}
            radius={[6, 6, 0, 0]}
            barSize={28}
            name="count"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="ratio"
            stroke={LINE_COLOR}
            strokeWidth={2.5}
            dot={{ r: 5, fill: LINE_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 6, stroke: LINE_COLOR, strokeWidth: 2 }}
            name="ratio"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500 mt-5 mb-1 text-center px-2">
        値下げ検討対象 = 滞留60日以上 または CVR 2%未満（掲載有・在庫有 {totalOnSale}台に対する割合）
      </p>
    </div>
  )
}
