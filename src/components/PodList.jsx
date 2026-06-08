import { useEffect, useRef } from 'react'
import { Cpu, Database } from 'lucide-react'
import { MetricBar, StatusDot } from './status'
import { getStatusMeta } from './statusMeta'

function metricStatus(value) {
  if (value >= 85) return 'critical'
  if (value >= 70) return 'warning'
  return 'healthy'
}

export default function PodList({ pods, selectedPodId, onSelectPod }) {
  const rowRefs = useRef({})

  useEffect(() => {
    rowRefs.current[selectedPodId]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedPodId])

  return (
    <section className="min-h-0 rounded-lg border border-white/10 bg-[#1a1d27] p-4 shadow-xl shadow-black/10">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Pods</h2>
          <p className="text-xs text-slate-500">minikube-node-1</p>
        </div>
        <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-400">
          {pods.length}
        </span>
      </div>

      <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
        {pods.map((pod) => {
          const isSelected = pod.id === selectedPodId
          const displayStatus = pod.phase === 'Terminating' ? 'warning' : pod.status
          const meta = getStatusMeta(displayStatus)

          return (
            <button
              key={pod.id}
              ref={(node) => {
                rowRefs.current[pod.id] = node
              }}
              type="button"
              onClick={() => onSelectPod(pod.id)}
              className={`w-full rounded-md border p-3 text-left transition ${
                isSelected
                  ? `${meta.border} ${meta.bg}`
                  : 'border-white/[0.06] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusDot status={displayStatus} />
                    <span className="truncate text-sm font-medium text-slate-100">{pod.name}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-[18px]">
                    <span className="rounded bg-[#4488ff]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8fb2ff]">
                      {pod.namespace}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${meta.text}`}>
                      {pod.phase ?? meta.label}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-slate-500">{pod.age}</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 pl-[18px]">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Cpu size={11} />
                      CPU
                    </span>
                    <span>{pod.cpu}%</span>
                  </div>
                  <MetricBar value={pod.cpu} status={metricStatus(pod.cpu)} compact />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Database size={11} />
                      MEM
                    </span>
                    <span>{pod.memory}%</span>
                  </div>
                  <MetricBar value={pod.memory} status={metricStatus(pod.memory)} compact />
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
