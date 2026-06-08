import { useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { getStatusMeta } from './statusMeta'

function EventBadge({ severity }) {
  const status = severity === 'resolved' ? 'healthy' : severity
  const meta = getStatusMeta(status)

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${meta.bg} ${meta.border} ${meta.text}`}
    >
      {severity}
    </span>
  )
}

export default function LiveEventLog({ events, onClear }) {
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [events])

  return (
    <section className="rounded-lg border border-white/10 bg-[#1a1d27] p-4 shadow-xl shadow-black/10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="live-dot h-2 w-2 rounded-full bg-[#00ff88]" />
            <h2 className="text-sm font-semibold text-white">Live Event Log</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">Newest events first</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-white/20 hover:text-white"
        >
          <Trash2 size={13} />
          Clear
        </button>
      </div>

      <div ref={listRef} className="max-h-[180px] space-y-2 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <div className="rounded-md border border-white/[0.06] bg-white/[0.03] p-3 text-sm text-slate-500">
            Event log cleared. New scan events will appear here.
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="grid grid-cols-[72px_auto_1fr] items-start gap-2 rounded-md border border-white/[0.06] bg-white/[0.03] p-2.5 text-xs transition hover:border-white/15 hover:bg-white/[0.05]"
            >
              <span className="font-mono text-slate-500">{event.time}</span>
              <EventBadge severity={event.severity} />
              <span className="min-w-0 leading-relaxed text-slate-300">{event.description}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
