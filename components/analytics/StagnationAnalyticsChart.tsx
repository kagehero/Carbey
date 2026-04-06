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

interface StagnationAnalyticsChartProps {
  data: DataPoint[]
  totalOnSale: number
}

const GRID_COLOR = '#e2e8f0'
const AXIS_COLOR = '#64748b'
const LINE_COLOR = '#4f46e5' // indigo-600

function StagnationTooltip({
  active,
  payload,
  label,
  totalOnSale,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; dataKey?: string; color?: string }>
  label?: string
  totalOnSale: number
}) {
  if (!active || !payload?.length) return null
  const count = payload.find((p) => p.dataKey === 'count')?.value
  const ratio = payload.find((p) => p.dataKey === 'ratio')?.value
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-lg">
      <p className="text-xs font-semibold text-slate-500 mb-2">{label}</p>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between gap-6">
          <span className="text-slate-600">滞留台数</span>
          <span className="font-semibold tabular-nums text-rose-600">{count ?? 0}台</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-slate-600">全体に占める割合</span>
          <span className="font-semibold tabular-nums text-indigo-600">{ratio ?? 0}%</span>
        </div>
        <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100 mt-2">
          分母: 掲載有・在庫有 {totalOnSale}台
        </p>
      </div>
    </div>
  )
}

export default function StagnationAnalyticsChart({ data, totalOnSale }: StagnationAnalyticsChartProps) {
  const totalBadUnits = data.reduce((sum, d) => sum + d.count, 0)
  const maxRatio = Math.max(8, ...data.map((d) => d.ratio), 1)
  const rightAxisMax = Math.min(100, Math.ceil(maxRatio / 5) * 5 + 5)

  return (
    <div className="space-y-3">
      {totalOnSale > 0 && (
        <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-slate-50/90 px-3 py-2.5 border border-slate-100">
          <span className="text-xs font-medium text-slate-600">滞留60日超（不良在庫）合計</span>
          <span className="text-lg font-bold tabular-nums text-rose-700">
            {totalBadUnits}
            <span className="text-sm font-semibold text-slate-500 ml-0.5">台</span>
          </span>
        </div>
      )}

      <div className="h-[360px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
            barCategoryGap="12%"
            barGap={1}
          >
            <defs>
              <linearGradient id="stagnationBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#e11d48" stopOpacity={0.85} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: AXIS_COLOR }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
              interval={0}
              angle={-32}
              textAnchor="end"
              height={78}
              tickMargin={6}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: AXIS_COLOR }}
              axisLine={false}
              tickLine={false}
              width={36}
              allowDecimals={false}
              label={{
                value: '台数',
                angle: -90,
                position: 'insideLeft',
                offset: 4,
                style: { fontSize: 10, fill: AXIS_COLOR, fontWeight: 500 },
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: AXIS_COLOR }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(v) => `${v}%`}
              domain={[0, rightAxisMax]}
              label={{
                value: '割合',
                angle: 90,
                position: 'insideRight',
                offset: 2,
                style: { fontSize: 10, fill: AXIS_COLOR, fontWeight: 500 },
              }}
            />
            <Tooltip
              content={<StagnationTooltip totalOnSale={totalOnSale} />}
              cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
            />
            <Legend
              wrapperStyle={{ paddingTop: 12 }}
              iconType="circle"
              iconSize={8}
              align="center"
              formatter={(value: string) =>
                value === 'count' ? '滞留台数（棒）' : value === 'ratio' ? '割合（線）' : value
              }
            />
            <Bar
              yAxisId="left"
              dataKey="count"
              fill="url(#stagnationBarGrad)"
              radius={[6, 6, 0, 0]}
              maxBarSize={26}
              name="count"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="ratio"
              stroke={LINE_COLOR}
              strokeWidth={2.5}
              dot={{ r: 4, fill: LINE_COLOR, strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
              name="ratio"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg bg-slate-50/80 px-3 py-2.5 border border-slate-100/80">
        <p className="text-[11px] leading-relaxed text-slate-600 text-center">
          <span className="font-medium text-slate-700">不良在庫</span>
          ＝掲載から61日目以降の滞留（60日超）。帯は約2週間単位で細分化。
          <span className="text-slate-500">
            線グラフは、掲載有・在庫有{totalOnSale}台に対する各帯の割合です。
          </span>
        </p>
      </div>
    </div>
  )
}
