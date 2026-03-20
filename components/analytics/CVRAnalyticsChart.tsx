'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface DataPoint {
  name: string
  要改善: number
  改善見込み: number
  優秀?: number
}

interface CVRAnalyticsChartProps {
  data: DataPoint[]
  total: number
}

const COLORS = {
  要改善: '#f43f5e', // rose-500
  改善見込み: '#0ea5e9', // sky-500
  優秀: '#10b981', // emerald-500
}
const GRID_COLOR = '#f1f5f9'
const AXIS_COLOR = '#64748b'

export default function CVRAnalyticsChart({ data, total }: CVRAnalyticsChartProps) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 16, right: 20, left: 8, bottom: 16 }}
          barCategoryGap="30%"
          barGap={12}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            axisLine={{ stroke: AXIS_COLOR, strokeWidth: 1 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            axisLine={false}
            tickLine={false}
            label={{ value: '台数', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: AXIS_COLOR } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255,255,255,0.98)',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              padding: '12px 16px',
            }}
            formatter={(value: number, name: string) => [`${value}台`, name]}
          />
          <Legend wrapperStyle={{ paddingTop: '8px' }} iconType="circle" iconSize={8} />
          <Bar
            dataKey="要改善"
            fill={COLORS.要改善}
            radius={[6, 6, 0, 0]}
            barSize={32}
            name="要改善（CVR&lt;2%）"
          />
          <Bar
            dataKey="改善見込み"
            fill={COLORS.改善見込み}
            radius={[6, 6, 0, 0]}
            barSize={32}
            name="改善見込み（CVR 2-5%）"
          />
          {data.some((d) => (d as DataPoint).優秀 != null) && (
            <Bar
              dataKey="優秀"
              fill={COLORS.優秀}
              radius={[6, 6, 0, 0]}
              barSize={32}
              name="優秀（CVR≥5%）"
            />
          )}
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500 mt-5 mb-1 text-center px-2">
        要改善: CVR 2%未満 / 改善見込み: CVR 2-5% / 優秀: CVR 5%以上（全{total}台）
      </p>
    </div>
  )
}
