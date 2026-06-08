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
    <div className="rounded-[10px] border border-[rgba(168,196,101,0.2)] bg-[rgba(255,255,255,0.05)] p-3 transition duration-200 hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(168,196,101,0.4)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#555555]">
          {item.label}
        </span>
        <span className={`grid h-7 w-7 place-items-center rounded-md ${item.iconTone}`}>
          <Icon size={15} strokeWidth={2.2} />
        </span>
      </div>
      <div className={`text-2xl font-bold leading-none ${item.valueTone}`}>{item.value}</div>
      <div
        className={`mt-3 ${
          item.nominal ? 'space-y-1' : 'flex items-center justify-between gap-2'
        }`}
      >
        <span className="block truncate text-xs text-[#555555]">{item.detail}</span>
        {item.nominal ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(34,197,94,0.35)] bg-[rgba(22,163,74,0.15)] px-2 py-0.5 text-[11px] font-semibold text-[#22c55e]">
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
        iconTone: 'bg-[rgba(168,196,101,0.2)] text-[#A8C465]',
      },
      {
        label: 'Healthy Pods',
        value: healthyPods,
        detail: `${totalPods - healthyPods} need attention`,
        icon: CheckCircle,
        status: 'healthy',
        badge: 'healthy',
        valueTone: 'text-[#22c55e]',
        iconTone: 'bg-[rgba(22,163,74,0.15)] text-[#22c55e]',
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
            ? 'text-[#22c55e]'
            : healthStatus === 'warning'
              ? 'text-[#D97706]'
              : 'text-[#DC2626]',
        iconTone:
          healthStatus === 'healthy'
            ? 'bg-[rgba(22,163,74,0.15)] text-[#22c55e]'
            : healthStatus === 'warning'
              ? 'bg-[rgba(217,119,6,0.12)] text-[#D97706]'
              : 'bg-[rgba(220,38,38,0.12)] text-[#DC2626]',
      },
      {
        label: 'Active Anomalies',
        value: activeAnomalies,
        detail: 'Pods needing attention',
        icon: activeAnomalies > 0 ? AlertTriangle : Activity,
        status: anomalyStatus,
        badge: anomalyStatus,
        nominal: activeAnomalies === 0,
        valueTone: activeAnomalies > 0 ? 'text-[#DC2626]' : 'text-[#22c55e]',
        iconTone:
          activeAnomalies > 0
            ? 'bg-[rgba(220,38,38,0.12)] text-[#DC2626]'
            : 'bg-[rgba(22,163,74,0.15)] text-[#22c55e]',
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
