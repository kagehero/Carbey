'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface StagnationChartProps {
  data: Array<{
    name: string
    count: number
    percentage: number
  }>
}

const COLORS = [
  '#22c55e', // green-500
  '#3b82f6', // blue-500
  '#0ea5e9', // sky-500
  '#f59e0b', // amber-500
  '#f97316', // orange-500
  '#ef4444', // red-500
  '#dc2626', // red-600
  '#b91c1c', // red-700
]
const GRID_COLOR = '#f1f5f9'
const AXIS_COLOR = '#64748b'

export default function StagnationChart({ data }: StagnationChartProps) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 16, right: 16, left: 8, bottom: 8 }}
          barCategoryGap="12%"
          barSize={24}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: AXIS_COLOR }}
            axisLine={{ stroke: AXIS_COLOR, strokeWidth: 1 }}
            tickLine={false}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={56}
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
