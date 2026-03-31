'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type PriceTrendPoint = { date: string; count: number }

const GRID = '#e2e8f0'
const AXIS = '#64748b'

export default function PriceChangeTrendChart({ data }: { data: PriceTrendPoint[] }) {
  if (!data.length) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">直近30日の価格変更データがありません</p>
    )
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: AXIS }}
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            width={28}
            tick={{ fontSize: 10, fill: AXIS }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
            }}
            formatter={(v: number) => [`${v}件`, '価格変更']}
            labelFormatter={(l) => l}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#0284c7"
            strokeWidth={2}
            fill="url(#priceTrendFill)"
            name="count"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
