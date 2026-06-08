import { useMemo } from 'react'
import { Activity, AlertTriangle, Boxes, CheckCircle, Gauge } from 'lucide-react'
import { StatusBadge } from './status'

function scoreStatus(score) {
  if (score >= 80) return 'healthy'
  if (score >= 50) return 'warning'
  return 'critical'
}

function KPICard({ item }) {
  const Icon = item.icon

  return (
    <div className="rounded-lg border border-white/10 bg-[#1a1d27] p-3 shadow-xl shadow-black/10 transition duration-300">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
          {item.label}
        </span>
        <span className={`grid h-7 w-7 place-items-center rounded-md ${item.iconTone}`}>
          <Icon size={15} strokeWidth={2.2} />
        </span>
      </div>
      <div className={`text-2xl font-semibold leading-none ${item.valueTone}`}>{item.value}</div>
      <div
        className={`mt-3 ${
          item.nominal ? 'space-y-1' : 'flex items-center justify-between gap-2'
        }`}
      >
        <span className="block truncate text-xs text-slate-500">{item.detail}</span>
        {item.nominal ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#00ff88]/25 bg-[#00ff88]/10 px-2 py-0.5 text-[11px] font-semibold text-[#00ff88]">
            <CheckCircle size={12} />
            All systems nominal
          </span>
        ) : (
          <StatusBadge status={item.status} label={item.badge} className="px-1.5" />
        )}
      </div>
    </div>
  )
}

export default function KPICards({ pods }) {
  const cards = useMemo(() => {
    const totalPods = pods.length
    const healthyPods = pods.filter((pod) => pod.status === 'healthy').length
    const activeAnomalies = pods.filter(
      (pod) => pod.status === 'critical' || pod.status === 'warning',
    ).length
    const clusterHealthScore =
      totalPods > 0 ? Math.round((healthyPods / totalPods) * 100) : 100
    const healthStatus = scoreStatus(clusterHealthScore)
    const anomalyStatus = activeAnomalies > 0 ? 'critical' : 'healthy'

    return [
      {
        label: 'Total Pods',
        value: totalPods,
        detail: `${healthyPods} healthy`,
        icon: Boxes,
        status: 'info',
        badge: 'live',
        valueTone: 'text-white',
        iconTone: 'bg-[#4488ff]/10 text-[#8fb2ff]',
      },
      {
        label: 'Healthy Pods',
        value: healthyPods,
        detail: `${totalPods - healthyPods} need attention`,
        icon: CheckCircle,
        status: 'healthy',
        badge: 'healthy',
        valueTone: 'text-[#00ff88]',
        iconTone: 'bg-[#00ff88]/10 text-[#00ff88]',
      },
      {
        label: 'Cluster Health Score',
        value: `${clusterHealthScore}%`,
        detail: 'Overall cluster health',
        icon: Gauge,
        status: healthStatus,
        badge: healthStatus,
        valueTone:
          healthStatus === 'healthy'
            ? 'text-[#00ff88]'
            : healthStatus === 'warning'
              ? 'text-[#ffaa00]'
              : 'text-[#ff4444]',
        iconTone:
          healthStatus === 'healthy'
            ? 'bg-[#00ff88]/10 text-[#00ff88]'
            : healthStatus === 'warning'
              ? 'bg-[#ffaa00]/10 text-[#ffaa00]'
              : 'bg-[#ff4444]/10 text-[#ff4444]',
      },
      {
        label: 'Active Anomalies',
        value: activeAnomalies,
        detail: 'Pods needing attention',
        icon: activeAnomalies > 0 ? AlertTriangle : Activity,
        status: anomalyStatus,
        badge: anomalyStatus,
        nominal: activeAnomalies === 0,
        valueTone: activeAnomalies > 0 ? 'text-[#ff4444]' : 'text-[#00ff88]',
        iconTone:
          activeAnomalies > 0
            ? 'bg-[#ff4444]/10 text-[#ff4444]'
            : 'bg-[#00ff88]/10 text-[#00ff88]',
      },
    ]
  }, [pods])

  return (
    <section className="grid grid-cols-2 gap-2.5">
      {cards.map((item) => (
        <KPICard key={item.label} item={item} />
      ))}
    </section>
  )
}
