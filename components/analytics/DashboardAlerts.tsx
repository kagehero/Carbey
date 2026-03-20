import Link from "next/link"
import { AlertTriangle, TrendingDown, DollarSign, Activity } from "lucide-react"

type Props = {
  stagnation60: number
  stagnation90: number
  stagnation180: number
  lowCVR: number
  pricingCandidates: number
}

export default function DashboardAlerts({
  stagnation60,
  stagnation90,
  stagnation180,
  lowCVR,
  pricingCandidates,
}: Props) {
  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  })

  const alerts = [
    {
      href: "/admin/analytics/stagnation",
      icon: AlertTriangle,
      label: "滞留180日超",
      count: stagnation180,
      unit: "台",
      level: stagnation180 > 0 ? "urgent" : "ok",
      detail: "即時値下げ検討",
    },
    {
      href: "/admin/analytics/stagnation",
      icon: AlertTriangle,
      label: "滞留90〜179日",
      count: stagnation90,
      unit: "台",
      level: stagnation90 > 0 ? "warn" : "ok",
      detail: "値下げ要検討",
    },
    {
      href: "/admin/analytics/stagnation",
      icon: TrendingDown,
      label: "滞留60〜89日",
      count: stagnation60,
      unit: "台",
      level: stagnation60 > 0 ? "info" : "ok",
      detail: "注視",
    },
    {
      href: "/admin/analytics/cvr",
      icon: Activity,
      label: "CVR 2%未満",
      count: lowCVR,
      unit: "台",
      level: lowCVR > 0 ? "warn" : "ok",
      detail: "反応率低下",
    },
    {
      href: "/admin/analytics/pricing",
      icon: DollarSign,
      label: "価格見直し対象",
      count: pricingCandidates,
      unit: "台",
      level: pricingCandidates > 0 ? "info" : "ok",
      detail: "AI・最適化提案あり",
    },
  ]

  const levelStyles = {
    urgent: {
      card: "border-l-4 border-red-500 bg-red-50",
      badge: "bg-red-100 text-red-700",
      icon: "text-red-500",
      count: "text-red-700",
    },
    warn: {
      card: "border-l-4 border-orange-500 bg-orange-50",
      badge: "bg-orange-100 text-orange-700",
      icon: "text-orange-500",
      count: "text-orange-700",
    },
    info: {
      card: "border-l-4 border-yellow-500 bg-yellow-50",
      badge: "bg-yellow-100 text-yellow-700",
      icon: "text-yellow-500",
      count: "text-yellow-700",
    },
    ok: {
      card: "border-l-4 border-green-400 bg-green-50",
      badge: "bg-green-100 text-green-700",
      icon: "text-green-400",
      count: "text-green-700",
    },
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">本日の確認事項</h2>
          <p className="text-xs text-slate-400 mt-0.5">{today}</p>
        </div>
        <Link
          href="/admin/analytics/integrated"
          className="text-sm text-sky-600 hover:text-sky-700 hover:underline font-medium transition-colors"
        >
          統合分析ビュー →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {alerts.map((a) => {
          const style = levelStyles[a.level as keyof typeof levelStyles]
          return (
            <Link
              key={a.label}
              href={a.href}
              className={`rounded-xl p-4 flex flex-col gap-1 hover:opacity-90 transition-opacity ${style.card}`}
            >
              <div className="flex items-center justify-between">
                <a.icon className={`w-4 h-4 ${style.icon}`} />
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${style.badge}`}>
                  {a.detail}
                </span>
              </div>
              <div className={`text-2xl font-bold mt-1 ${style.count}`}>
                {a.count}
                <span className="text-base font-normal ml-0.5">{a.unit}</span>
              </div>
              <div className="text-xs text-gray-600 font-medium">{a.label}</div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
