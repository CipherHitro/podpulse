import { Activity } from 'lucide-react'
import { ANOMALY_EVENTS } from '../data/staticData'
import { getStatusMeta } from './statusMeta'

export default function AnomalyTimeline({ activeEventId, onSelectEvent }) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#1a1d27] p-4 shadow-xl shadow-black/10">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Anomaly Timeline</h2>
          <p className="text-xs text-slate-500">Agent correlation sequence</p>
        </div>
        <span className="grid h-8 w-8 place-items-center rounded-md bg-[#4488ff]/10 text-[#4488ff]">
          <Activity size={17} />
        </span>
      </div>

      <div className="relative grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="pointer-events-none absolute left-4 right-4 top-[19px] hidden h-px bg-gradient-to-r from-[#4488ff]/15 via-[#ffaa00]/50 to-[#ff4444]/50 md:block" />
        {ANOMALY_EVENTS.map((event) => {
          const meta = getStatusMeta(event.severity)
          const isActive = event.id === activeEventId

          return (
            <button
              key={event.id}
              type="button"
              onClick={() => onSelectEvent(event)}
              className={`relative rounded-md border p-3 text-left transition ${
                isActive
                  ? `${meta.border} ${meta.bg} ${meta.glow}`
                  : 'border-white/[0.06] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]'
              }`}
            >
              <span
                className={`absolute left-3 top-3 h-3.5 w-3.5 rounded-full border-2 border-[#1a1d27] ${meta.dot} ${
                  isActive ? 'timeline-ping' : ''
                }`}
              />
              <div className="pl-6">
                <div className="text-xs font-semibold text-slate-100">{event.time}</div>
                <div className="mt-1 text-sm font-medium text-white">{event.label}</div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
