'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface StagnationChartProps {
  data: Array<{
    name: string
    count: number
    percentage: number
  }>
}

/** 滞留が短い→長いの目安で緑系から赤系へ */
const COLORS = [
  '#22c55e',
  '#4ade80',
  '#3b82f6',
  '#0ea5e9',
  '#06b6d4',
  '#14b8a6',
  '#f59e0b',
  '#f97316',
  '#fb923c',
  '#f87171',
  '#ef4444',
  '#dc2626',
  '#b91c1c',
  '#991b1b',
  '#7f1d1d',
  '#450a0a',
]
const GRID_COLOR = '#f1f5f9'
const AXIS_COLOR = '#64748b'

export default function StagnationChart({ data }: StagnationChartProps) {
  return (
    <div className="h-[340px] min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
          barCategoryGap="8%"
          barSize={18}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, fill: AXIS_COLOR }}
            axisLine={{ stroke: AXIS_COLOR, strokeWidth: 1 }}
            tickLine={false}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={72}
          />
          <YAxis
            tick={{ fontSize: 11, fill: AXIS_COLOR }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255,255,255,0.98)',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              padding: '12px 16px',
            }}
            formatter={(value: number) => [`${value}台`, '台数']}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
