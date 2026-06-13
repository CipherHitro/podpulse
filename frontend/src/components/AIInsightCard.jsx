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
  const isResolved = Boolean(insight.resolved)
  const displayStatus = isResolved ? 'healthy' : insight.severity
  const meta = getStatusMeta(displayStatus)
  const rootPod = podsById.get(insight.rootCause)
  const isFixing = fixState === 'terminating'
  const isFixed = isResolved || fixState === 'running'

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(insight.recommendation)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  const cardBorderStyle = isResolved
    ? { borderLeft: '3px solid #A8C465' }
    : insight.severity === 'critical'
      ? { borderLeft: '3px solid #DC2626' }
      : insight.severity === 'warning'
        ? { borderLeft: '3px solid #D97706' }
        : undefined

  const cardShadow = isResolved
    ? undefined
    : insight.severity === 'critical'
      ? '0 0 16px rgba(220,38,38,0.2), inset 0 0 20px rgba(220,38,38,0.03)'
      : insight.severity === 'warning'
        ? '0 0 16px rgba(217,119,6,0.2), inset 0 0 20px rgba(217,119,6,0.03)'
        : undefined

  return (
    <article
      id={`insight-${insight.id}`}
      className={`insight-card rounded-[10px] border p-4 transition ${
        isHighlighted
          ? `${meta.border} ${meta.glow}`
          : isResolved
            ? 'border-[rgba(168,196,101,0.3)] hover:border-[rgba(168,196,101,0.5)]'
            : 'border-[rgba(168,196,101,0.2)] hover:border-[rgba(168,196,101,0.4)]'
      } ${isResolved ? 'opacity-85' : ''} ${!isResolved && insight.severity === 'critical' ? 'glow-critical-anim' : ''}`}
      style={{
        background: isResolved ? 'rgba(168,196,101,0.1)' : 'rgba(255,255,255,0.05)',
        ...cardBorderStyle,
        boxShadow: isHighlighted ? undefined : cardShadow,
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <StatusBadge
          status={displayStatus}
          label={isResolved ? 'resolved' : insight.severity}
        />
        <span className={`rounded-md border px-2 py-1 text-xs font-mono ${
          insight.timeToOOM
            ? 'border-[rgba(220,38,38,0.35)] bg-[rgba(220,38,38,0.12)] text-[#DC2626] text-[11px]'
            : 'border-[rgba(168,196,101,0.2)] bg-[rgba(255,255,255,0.05)] text-[#555555]'
        }`}>
          {insight.timeToOOM ? `OOM in ${insight.timeToOOM}` : `${insight.confidence}% confidence`}
        </span>
      </div>

      <h3 className="flex items-start gap-2 text-[15px] font-bold leading-snug text-white">
        {isResolved && <CheckCircle size={17} className="mt-0.5 shrink-0 text-[#A8C465]" />}
        <span>{insight.title}</span>
      </h3>
      <p className="mt-2 text-[13px] leading-relaxed text-[#dad7cd]">{insight.summary}</p>

      <div className="mt-4 rounded-lg border border-[rgba(168,196,101,0.2)] bg-[rgba(168,196,101,0.08)] p-3">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A8C465]">
          <AlertTriangle size={13} className={meta.text} />
          Evidence Chain
        </div>
        <ul className="space-y-2 text-xs leading-relaxed text-[#dad7cd]">
          {insight.evidence.map((item) => (
            <li key={item} className="flex gap-2">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#555555]">
          Downstream Impact
        </div>
        <div className="flex flex-wrap gap-1.5">
          {insight.impact.length > 0 ? (
            insight.impact.map((podId) => (
              <span
                key={podId}
                className="rounded-md border border-[rgba(217,119,6,0.35)] bg-[rgba(217,119,6,0.12)] px-2 py-1 text-xs font-medium text-[#D97706]"
              >
                {podsById.get(podId)?.name ?? podId}
              </span>
            ))
          ) : (
            <span className="rounded-md border border-[rgba(168,196,101,0.35)] bg-[rgba(168,196,101,0.12)] px-2 py-1 text-xs font-medium text-[#A8C465]">
              No downstream pods affected
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#555555]">
            <TerminalSquare size={13} className="text-[#A8C465]" />
            Recommendation
          </div>
          <button
            type="button"
            onClick={copyCommand}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[rgba(168,196,101,0.2)] bg-[rgba(255,255,255,0.05)] text-[#555555] transition hover:text-[#A8C465]"
            title="Copy command"
            aria-label="Copy command"
          >
            {copied ? <CheckCircle size={14} className="text-[#A8C465]" /> : <Copy size={14} />}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-md border border-[rgba(168,196,101,0.2)] bg-[#0a0a0a] p-2.5 text-[11px] font-mono leading-relaxed text-[#A8C465]">
          <code>{insight.recommendation}</code>
        </pre>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-[#555555]">
          <span>Confidence</span>
          <span className={meta.text}>{insight.confidence}%</span>
        </div>
        <MetricBar value={insight.confidence} status={displayStatus} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0 text-xs text-[#555555]">
          Root cause:{' '}
          <span className="font-medium text-[#dad7cd]">{rootPod?.name ?? insight.rootCause}</span>
        </div>
        <button
          type="button"
          onClick={() => onApplyFix(insight)}
          disabled={isFixing || isFixed}
          className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition ${
            isFixed
              ? 'border border-[rgba(168,196,101,0.3)] bg-[rgba(168,196,101,0.1)] text-[#A8C465] cursor-default'
              : 'border border-[rgba(220,38,38,0.35)] bg-[rgba(220,38,38,0.12)] text-[#DC2626] hover:bg-[#DC2626] hover:text-white hover:shadow-[0_0_12px_rgba(220,38,38,0.2)] disabled:cursor-not-allowed disabled:opacity-70'
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
