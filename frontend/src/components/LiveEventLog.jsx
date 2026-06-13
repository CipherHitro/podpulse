import { useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { getStatusMeta } from './statusMeta'

function EventBadge({ severity }) {
  const status = severity === 'resolved' ? 'healthy' : severity
  const meta = getStatusMeta(status)
  const isResolved = severity === 'resolved'

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
        isResolved
          ? 'border-[rgba(168,196,101,0.3)] bg-[rgba(168,196,101,0.1)] text-[#A8C465]'
          : `${meta.bg} ${meta.border} ${meta.text}`
      } ${severity === 'critical' ? 'shadow-[0_0_6px_rgba(220,38,38,0.2)]' : ''}`}
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
    <section className="rounded-xl border border-[rgba(168,196,101,0.2)] bg-[#111111] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="live-dot h-2 w-2 rounded-full bg-[#A8C465]" />
            <h2 className="text-sm font-semibold text-white">Live Event Log</h2>
          </div>
          <p className="mt-1 text-xs text-[#555555]">Newest events first</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(168,196,101,0.2)] bg-transparent px-2.5 py-1.5 text-xs font-semibold text-[#555555] transition hover:border-[rgba(220,38,38,0.35)] hover:text-[#DC2626]"
        >
          <Trash2 size={13} />
          Clear
        </button>
      </div>

      <div ref={listRef} className="max-h-[180px] space-y-2 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <div className="rounded-md border border-[rgba(168,196,101,0.08)] bg-[rgba(255,255,255,0.05)] p-3 text-sm text-[#555555]">
            Event log cleared. New scan events will appear here.
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="grid grid-cols-[72px_auto_1fr] items-start gap-2 rounded-md border-b border-[rgba(168,196,101,0.08)] bg-transparent p-2.5 text-xs transition hover:bg-[rgba(255,255,255,0.05)]"
            >
              <span className="font-mono text-xs text-[#555555]">{event.time}</span>
              <EventBadge severity={event.severity} />
              <span className="min-w-0 text-[13px] leading-relaxed text-[#dad7cd]">{event.description}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
