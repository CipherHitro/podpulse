import { useState } from 'react'
import { AlertTriangle, CheckCircle, Copy, RefreshCcw, TerminalSquare } from 'lucide-react'
import { MetricBar, StatusBadge } from './status'
import { getStatusMeta } from './statusMeta'

export default function AIInsightCard({
  insight,
  podsById,
  isHighlighted,
  fixState,
  onApplyFix,
}) {
  const [copied, setCopied] = useState(false)
  const meta = getStatusMeta(insight.severity)
  const rootPod = podsById.get(insight.rootCause)
  const isFixing = fixState === 'terminating'
  const isFixed = fixState === 'running'

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(insight.recommendation)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <article
      id={`insight-${insight.id}`}
      className={`insight-card rounded-lg border bg-[#1a1d27] p-4 shadow-xl shadow-black/10 transition ${
        isHighlighted
          ? `${meta.border} ${meta.glow}`
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <StatusBadge status={insight.severity} label={insight.severity} />
        <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-400">
          {insight.timeToOOM ? `OOM in ${insight.timeToOOM}` : `${insight.confidence}% confidence`}
        </span>
      </div>

      <h3 className="text-base font-semibold leading-snug text-white">{insight.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{insight.summary}</p>

      <div className="mt-4 rounded-md border border-white/[0.06] bg-white/[0.03] p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-300">
          <AlertTriangle size={13} className={meta.text} />
          Evidence Chain
        </div>
        <ul className="space-y-2 text-xs leading-relaxed text-slate-400">
          {insight.evidence.map((item) => (
            <li key={item} className="flex gap-2">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-300">
          Downstream Impact
        </div>
        <div className="flex flex-wrap gap-1.5">
          {insight.impact.length > 0 ? (
            insight.impact.map((podId) => (
              <span
                key={podId}
                className="rounded-full border border-[#ff4444]/25 bg-[#ff4444]/10 px-2 py-1 text-xs font-medium text-[#ff9b9b]"
              >
                {podsById.get(podId)?.name ?? podId}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-[#00ff88]/25 bg-[#00ff88]/10 px-2 py-1 text-xs font-medium text-[#9dffc9]">
              No downstream pods affected
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-300">
            <TerminalSquare size={13} className="text-[#4488ff]" />
            Recommendation
          </div>
          <button
            type="button"
            onClick={copyCommand}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-[#4488ff]/50 hover:text-white"
            title="Copy command"
            aria-label="Copy command"
          >
            {copied ? <CheckCircle size={14} className="text-[#00ff88]" /> : <Copy size={14} />}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-md border border-white/[0.06] bg-[#0f1117] p-3 text-xs leading-relaxed text-[#8fb2ff]">
          <code>{insight.recommendation}</code>
        </pre>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
          <span>Confidence</span>
          <span className={meta.text}>{insight.confidence}%</span>
        </div>
        <MetricBar value={insight.confidence} status={insight.severity} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0 text-xs text-slate-500">
          Root cause:{' '}
          <span className="font-medium text-slate-300">{rootPod?.name ?? insight.rootCause}</span>
        </div>
        <button
          type="button"
          onClick={() => onApplyFix(insight)}
          disabled={isFixing || isFixed}
          className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition ${
            isFixed
              ? 'border border-[#00ff88]/25 bg-[#00ff88]/10 text-[#00ff88]'
              : 'border border-[#4488ff]/30 bg-[#4488ff]/[0.12] text-[#b8ccff] hover:border-[#4488ff]/70 hover:bg-[#4488ff]/[0.18] disabled:cursor-not-allowed disabled:opacity-70'
          }`}
        >
          {isFixing ? (
            <>
              <RefreshCcw size={14} className="animate-spin" />
              Restarting
            </>
          ) : isFixed ? (
            <>
              <CheckCircle size={14} />
              Fixed
            </>
          ) : (
            <>
              <RefreshCcw size={14} />
              Apply Fix
            </>
          )}
        </button>
      </div>
    </article>
  )
}
