import { BrainCircuit } from 'lucide-react'
import { AGENTS } from '../data/staticData'
import { MetricBar, StatusDot } from './status'
import { getStatusMeta } from './statusMeta'

export default function AgentStatusPanel() {
  return (
    <section className="rounded-lg border border-white/10 bg-[#1a1d27] p-4 shadow-xl shadow-black/10">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Agent Status</h2>
          <p className="text-xs text-slate-500">5 active detection models</p>
        </div>
        <span className="grid h-8 w-8 place-items-center rounded-md bg-[#4488ff]/10 text-[#4488ff]">
          <BrainCircuit size={17} />
        </span>
      </div>

      <div className="space-y-3">
        {AGENTS.map((agent) => {
          const meta = getStatusMeta(agent.status)

          return (
            <button
              key={agent.name}
              type="button"
              className="w-full rounded-md border border-white/[0.06] bg-white/[0.03] p-3 text-left transition hover:border-white/15 hover:bg-white/[0.05]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusDot status={agent.status} />
                    <span className="truncate text-sm font-medium text-slate-100">{agent.name}</span>
                  </div>
                  <p className="mt-0.5 truncate pl-[18px] text-xs text-slate-500">
                    {agent.algorithm}
                  </p>
                </div>
                <span className={`text-xs font-semibold ${meta.text}`}>
                  {agent.confidence}%
                </span>
              </div>
              <div className="mt-2 pl-[18px]">
                <MetricBar value={agent.confidence} status={agent.status} compact />
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
