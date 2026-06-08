import { AlertTriangle, Bell, Boxes, Clock } from 'lucide-react'
import { KPI_STATS } from '../data/staticData'
import { StatusBadge } from './status'

const KPI_CARDS = [
  {
    label: 'Total Pods',
    value: KPI_STATS.totalPods,
    detail: `${KPI_STATS.healthyPods} healthy`,
    icon: Boxes,
    status: 'healthy',
  },
  {
    label: 'Critical Issues',
    value: KPI_STATS.criticalPods,
    detail: `${KPI_STATS.warningPods} warnings`,
    icon: AlertTriangle,
    status: 'critical',
  },
  {
    label: 'MTTR',
    value: KPI_STATS.mttr,
    detail: 'claimed recovery',
    icon: Clock,
    status: 'info',
  },
  {
    label: 'Alerts Deduped',
    value: KPI_STATS.alertsDeduped,
    detail: `${KPI_STATS.detectionLatency} latency`,
    icon: Bell,
    status: 'warning',
  },
]

function KPICard({ item }) {
  const Icon = item.icon

  return (
    <div className="rounded-lg border border-white/10 bg-[#1a1d27] p-3 shadow-xl shadow-black/10">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
          {item.label}
        </span>
        <span className="grid h-7 w-7 place-items-center rounded-md bg-white/[0.06] text-slate-200">
          <Icon size={15} strokeWidth={2.2} />
        </span>
      </div>
      <div className="text-2xl font-semibold leading-none text-white">{item.value}</div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="truncate text-xs text-slate-500">{item.detail}</span>
        <StatusBadge status={item.status} label={item.status} className="px-1.5" />
      </div>
    </div>
  )
}

export default function KPICards() {
  return (
    <section className="grid grid-cols-2 gap-2.5">
      {KPI_CARDS.map((item) => (
        <KPICard key={item.label} item={item} />
      ))}
    </section>
  )
}
