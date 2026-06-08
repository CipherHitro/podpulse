import { getStatusMeta } from './statusMeta'

export function StatusDot({ status, className = '' }) {
  const meta = getStatusMeta(status)

  return (
    <span
      className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot} ${meta.glow} ${className}`}
      aria-hidden="true"
    />
  )
}

export function StatusBadge({ status, label, className = '' }) {
  const meta = getStatusMeta(status)

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${meta.bg} ${meta.border} ${meta.text} ${className}`}
    >
      <StatusDot status={status} className="h-1.5 w-1.5" />
      {label ?? meta.label}
    </span>
  )
}

export function MetricBar({ value, status = 'info', compact = false }) {
  const meta = getStatusMeta(status)

  return (
    <div className={`${compact ? 'h-1' : 'h-1.5'} overflow-hidden rounded-full bg-white/[0.08]`}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${Math.min(value, 100)}%`,
          backgroundColor: meta.line,
          boxShadow: `0 0 14px ${meta.line}55`,
        }}
      />
    </div>
  )
}
