import { useMemo, useState } from 'react'
import { StatusDot } from './status'
import { getStatusMeta } from './statusMeta'

const FILTERS = ['all', 'critical', 'warning', 'healthy']

function metricTone(value) {
  if (value >= 85) return '#ff4444'
  if (value >= 70) return '#ffaa00'
  return '#00ff88'
}

function MiniMetric({ label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-[2px]">
      <span className="text-[8px] font-semibold uppercase text-slate-500">
        {label}
      </span>
      <span className="h-1 w-4 overflow-hidden rounded-full bg-white/[0.08] sm:w-5">
        <span
          className="block h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: metricTone(value) }}
        />
      </span>
      <span className="w-4 text-right text-[8px] tabular-nums text-slate-400">{value}%</span>
    </div>
  )
}

export default function PodGrid({ pods, selectedPodId, onSelectPod }) {
  const [filter, setFilter] = useState('all')
  const visiblePods = useMemo(
    () => (filter === 'all' ? pods : pods.filter((pod) => pod.status === filter)),
    [filter, pods],
  )

  return (
    <section className="rounded-lg border border-white/10 bg-[#1a1d27] p-4 shadow-xl shadow-black/10">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Pods</h2>
          <p className="text-xs text-slate-500">Pod Health Grid</p>
        </div>
        <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-400">
          {pods.length}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {FILTERS.map((item) => {
          const active = filter === item
          const status = item === 'all' ? 'info' : item
          const meta = getStatusMeta(status)

          return (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition ${
                active
                  ? `${meta.border} ${meta.bg} ${meta.text}`
                  : 'border-white/[0.07] bg-white/[0.03] text-slate-500 hover:border-white/15 hover:text-slate-300'
              }`}
            >
              {item}
            </button>
          )
        })}
      </div>

      <div className="grid max-h-[420px] grid-cols-2 gap-2 overflow-y-auto pr-1">
        {visiblePods.map((pod) => {
          const meta = getStatusMeta(pod.status)
          const selected = pod.id === selectedPodId

          return (
            <button
              key={pod.id}
              type="button"
              onClick={() => onSelectPod(pod.id)}
              title={`${pod.id}\nNamespace: ${pod.namespace}\nRestarts: ${pod.restarts}\nAge: ${pod.age}`}
              className={`pod-tile h-[60px] rounded-md border border-white/[0.06] bg-white/[0.045] px-2 py-2 text-left transition duration-300 hover:border-white/[0.18] hover:bg-white/[0.07] ${
                selected ? 'ring-2 ring-[#4488ff]/70' : ''
              } ${pod.status === 'warning' ? 'shadow-[0_0_18px_rgba(255,170,0,0.12)]' : ''}`}
              style={{ borderLeft: `3px solid ${meta.line}` }}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <StatusDot
                  status={pod.status}
                  className={`h-2 w-2 ${pod.status === 'critical' ? 'pod-dot-critical' : ''}`}
                />
                <span className="min-w-0 flex-1 truncate text-[11px] font-bold leading-none text-slate-100">
                  {pod.name}
                </span>
                <span className="max-w-[58px] truncate rounded-full border border-[#4488ff]/20 bg-[#4488ff]/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-[#8fb2ff]">
                  {pod.namespace}
                </span>
              </div>
              <div className="mt-2 flex min-w-0 items-center justify-between gap-1">
                <MiniMetric label="CPU" value={pod.cpu} />
                <MiniMetric label="MEM" value={pod.memory} />
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
