import { useEffect, useMemo, useRef, useState } from 'react'
import 'reactflow/dist/style.css'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Cpu,
  Gauge,
  Play,
  RefreshCcw,
  Shield,
  Server,
} from 'lucide-react'
import AgentStatusPanel from './components/AgentStatusPanel'
import AIInsightCard from './components/AIInsightCard'
import AnomalyTimeline from './components/AnomalyTimeline'
import DependencyGraph from './components/DependencyGraph'
import KPICards from './components/KPICards'
import PodList from './components/PodList'
import ResourceCharts from './components/ResourceCharts'
import { StatusBadge, StatusDot } from './components/status'
import { getStatusMeta } from './components/statusMeta'
import {
  AI_INSIGHTS,
  ANOMALY_EVENTS,
  CPU_TIMELINE,
  KPI_STATS,
  MEMORY_TIMELINE,
  NETWORK_TIMELINE,
  PODS,
  PVC_TIMELINE,
} from './data/staticData'
import './App.css'

const RECOVERED_MEMORY_TIMELINE = MEMORY_TIMELINE.map((point, index) => ({
  ...point,
  authService: [42, 43, 44, 45, 46, 45, 44, 43][index],
  libraryService: [38, 39, 40, 42, 43, 44, 44, 43][index],
  studentPortal: [35, 42, 48, 53, 58, 56, 54, 52][index],
}))

const RECOVERED_CPU_TIMELINE = CPU_TIMELINE.map((point, index) => ({
  ...point,
  studentPortal: [18, 24, 34, 42, 48, 45, 43, 41][index],
  authService: [22, 25, 27, 29, 31, 28, 26, 24][index],
  apiGateway: [31, 34, 38, 42, 45, 43, 41, 39][index],
}))

const RECOVERED_PVC_TIMELINE = PVC_TIMELINE.map((point, index) => ({
  ...point,
  latency: [0.12, 0.14, 0.16, 0.2, 0.24, 0.22, 0.2, 0.18][index],
}))

const QUIET_NETWORK_TIMELINE = NETWORK_TIMELINE.map((point, index) => ({
  ...point,
  requests: [860, 930, 1040, 1220, 1360, 1290, 1180, 1100][index],
  errors: [4, 5, 6, 8, 9, 7, 6, 5][index],
}))

const ALERT_FEED = [
  {
    time: '09:45',
    severity: 'critical',
    title: 'auth-service memory at 89%',
    detail: 'Predicted OOM inside 18 minutes',
  },
  {
    time: '09:30',
    severity: 'critical',
    title: 'library-pvc latency at 5.1s',
    detail: 'Storage Agent correlated with memory pressure',
  },
  {
    time: '09:10',
    severity: 'warning',
    title: 'student-portal CPU at 78%',
    detail: 'Expected login surge, no action required',
  },
]

function findInsightForPod(podId) {
  return (
    AI_INSIGHTS.find((insight) => insight.rootCause === podId) ??
    AI_INSIGHTS.find((insight) => insight.impact.includes(podId))
  )
}

function findEventByInsight(insightId) {
  return ANOMALY_EVENTS.find((event) => event.insightId === insightId)
}

function DemoButton({ children, onClick, tone = 'info' }) {
  const meta = getStatusMeta(tone)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${meta.border} ${meta.bg} ${meta.text} hover:bg-white/[0.08]`}
    >
      <Play size={15} fill="currentColor" strokeWidth={2.2} />
      {children}
    </button>
  )
}

function ClusterHeader({ onRunMemoryDemo, onRunPvcDemo, onReset }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0f1117]/95 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg border border-[#4488ff]/30 bg-[#4488ff]/10 text-[#8fb2ff] shadow-[0_0_28px_rgba(68,136,255,0.18)]">
            <Shield size={21} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-white">CampusGuardian</h1>
              <StatusBadge status="critical" label="cluster degraded" />
            </div>
            <p className="text-xs text-slate-500">
              AI-powered Kubernetes observability for campus services
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-1 hidden items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 md:flex">
            <StatusDot status="critical" />
            <span>{KPI_STATS.criticalPods} critical</span>
            <span className="text-slate-600">/</span>
            <StatusDot status="warning" />
            <span>{KPI_STATS.warningPods} warning</span>
          </div>
          <DemoButton onClick={onRunMemoryDemo} tone="critical">
            Run Demo: Memory Leak
          </DemoButton>
          <DemoButton onClick={onRunPvcDemo} tone="warning">
            Run Demo: PVC Bottleneck
          </DemoButton>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            title="Reset demo"
            aria-label="Reset demo"
          >
            <RefreshCcw size={15} />
          </button>
        </div>
      </div>
    </header>
  )
}

function SignalStrip() {
  return (
    <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {[
        { label: 'Cluster CPU', value: `${KPI_STATS.clusterCPU}%`, icon: Cpu, status: 'info' },
        {
          label: 'Cluster Memory',
          value: `${KPI_STATS.clusterMemory}%`,
          icon: Gauge,
          status: 'warning',
        },
        { label: 'Healthy Pods', value: KPI_STATS.healthyPods, icon: CheckCircle, status: 'healthy' },
        { label: 'Detection', value: KPI_STATS.detectionLatency, icon: Activity, status: 'info' },
      ].map((item) => {
        const Icon = item.icon
        const meta = getStatusMeta(item.status)

        return (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#1a1d27] px-4 py-3"
          >
            <div>
              <div className="text-xs uppercase tracking-[0.08em] text-slate-500">{item.label}</div>
              <div className="mt-1 text-lg font-semibold text-white">{item.value}</div>
            </div>
            <span className={`grid h-9 w-9 place-items-center rounded-md ${meta.bg} ${meta.text}`}>
              <Icon size={18} />
            </span>
          </div>
        )
      })}
    </section>
  )
}

function AlertFeed({ fixedInsights }) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#1a1d27] p-4 shadow-xl shadow-black/10">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Active Alerts Feed</h2>
          <p className="text-xs text-slate-500">Deduped by agent consensus</p>
        </div>
        <span className="rounded-md border border-[#ff4444]/30 bg-[#ff4444]/10 px-2 py-1 text-xs font-semibold text-[#ff9b9b]">
          47 -&gt; 3
        </span>
      </div>
      <div className="space-y-3">
        {ALERT_FEED.map((alert, index) => {
          const meta = getStatusMeta(alert.severity)
          const isResolved = fixedInsights.has(index + 1)

          return (
            <div
              key={`${alert.time}-${alert.title}`}
              className={`rounded-md border p-3 ${
                isResolved
                  ? 'border-[#00ff88]/20 bg-[#00ff88]/5'
                  : `${meta.border} bg-white/[0.03]`
              }`}
            >
              <div className="flex items-start gap-2">
                {isResolved ? (
                  <CheckCircle size={14} className="mt-0.5 shrink-0 text-[#00ff88]" />
                ) : (
                  <AlertTriangle size={14} className={`mt-0.5 shrink-0 ${meta.text}`} />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">{alert.time}</span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${
                        isResolved ? 'text-[#00ff88]' : meta.text
                      }`}
                    >
                      {isResolved ? 'resolved' : alert.severity}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-white">{alert.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{alert.detail}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function RightPanel({ podsById, spotlightInsightId, fixStates, onApplyFix, fixedInsights }) {
  useEffect(() => {
    document
      .getElementById(`insight-${spotlightInsightId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [spotlightInsightId])

  const orderedInsights = useMemo(() => {
    const spotlight = AI_INSIGHTS.find((insight) => insight.id === spotlightInsightId)
    const rest = AI_INSIGHTS.filter((insight) => insight.id !== spotlightInsightId)
    return spotlight ? [spotlight, ...rest] : AI_INSIGHTS
  }, [spotlightInsightId])

  return (
    <aside className="min-h-0 space-y-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-sm font-semibold text-white">AI Insights</h2>
          <p className="text-xs text-slate-500">Root cause cards and commands</p>
        </div>
        <StatusBadge status="critical" label="2 active" />
      </div>
      <div className="max-h-[calc(100vh-224px)] space-y-3 overflow-y-auto pr-1 lg:max-h-[calc(100vh-154px)]">
        {orderedInsights.map((insight) => (
          <AIInsightCard
            key={insight.id}
            insight={insight}
            podsById={podsById}
            isHighlighted={insight.id === spotlightInsightId}
            fixState={fixStates[insight.id]}
            onApplyFix={onApplyFix}
          />
        ))}
        <AlertFeed fixedInsights={fixedInsights} />
      </div>
    </aside>
  )
}

export default function App() {
  const [selectedPodId, setSelectedPodId] = useState('auth-service-5b2c')
  const [spotlightInsightId, setSpotlightInsightId] = useState(1)
  const [activeEventId, setActiveEventId] = useState('memory-leak')
  const [pulsePodId, setPulsePodId] = useState('auth-service-5b2c')
  const [animationKey, setAnimationKey] = useState(0)
  const [memoryData, setMemoryData] = useState(MEMORY_TIMELINE)
  const [cpuData, setCpuData] = useState(CPU_TIMELINE)
  const [pvcData, setPvcData] = useState(PVC_TIMELINE)
  const [networkData, setNetworkData] = useState(NETWORK_TIMELINE)
  const [podOverrides, setPodOverrides] = useState({})
  const [fixStates, setFixStates] = useState({})
  const [fixedInsights, setFixedInsights] = useState(new Set())
  const timersRef = useRef([])

  useEffect(() => {
    const initialPulse = window.setTimeout(() => setPulsePodId(null), 1800)
    return () => {
      window.clearTimeout(initialPulse)
      timersRef.current.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  const pods = useMemo(
    () =>
      PODS.map((pod) => ({
        ...pod,
        ...(podOverrides[pod.id] ?? {}),
      })),
    [podOverrides],
  )

  const podsById = useMemo(() => new Map(pods.map((pod) => [pod.id, pod])), [pods])

  function schedule(callback, delay) {
    const timer = window.setTimeout(callback, delay)
    timersRef.current.push(timer)
  }

  function highlightInsight(insight) {
    if (!insight) return
    const event = findEventByInsight(insight.id)
    setSpotlightInsightId(insight.id)
    setActiveEventId(event?.id ?? activeEventId)
  }

  function handleSelectPod(podId) {
    setSelectedPodId(podId)
    highlightInsight(findInsightForPod(podId))
  }

  function handleSelectTimelineEvent(event) {
    setActiveEventId(event.id)
    setSelectedPodId(event.podId)
    setPulsePodId(event.podId)
    setSpotlightInsightId(event.insightId)
    schedule(() => setPulsePodId(null), 1800)
  }

  function runMemoryDemo() {
    setSelectedPodId('auth-service-5b2c')
    setSpotlightInsightId(1)
    setActiveEventId('memory-leak')
    setPulsePodId('auth-service-5b2c')
    setMemoryData(RECOVERED_MEMORY_TIMELINE)
    setCpuData(RECOVERED_CPU_TIMELINE)
    setAnimationKey((key) => key + 1)
    schedule(() => {
      setMemoryData(MEMORY_TIMELINE)
      setCpuData(CPU_TIMELINE)
      setAnimationKey((key) => key + 1)
    }, 180)
    schedule(() => setPulsePodId(null), 2400)
  }

  function runPvcDemo() {
    setSelectedPodId('library-service-8a1e')
    setSpotlightInsightId(2)
    setActiveEventId('pvc-bottleneck')
    setPulsePodId('library-service-8a1e')
    setPvcData(RECOVERED_PVC_TIMELINE)
    setMemoryData(RECOVERED_MEMORY_TIMELINE)
    setAnimationKey((key) => key + 1)
    schedule(() => {
      setPvcData(PVC_TIMELINE)
      setMemoryData(MEMORY_TIMELINE)
      setAnimationKey((key) => key + 1)
    }, 180)
    schedule(() => setPulsePodId(null), 2400)
  }

  function resetDemo() {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current = []
    setSelectedPodId('auth-service-5b2c')
    setSpotlightInsightId(1)
    setActiveEventId('memory-leak')
    setPulsePodId('auth-service-5b2c')
    setMemoryData(MEMORY_TIMELINE)
    setCpuData(CPU_TIMELINE)
    setPvcData(PVC_TIMELINE)
    setNetworkData(NETWORK_TIMELINE)
    setPodOverrides({})
    setFixStates({})
    setFixedInsights(new Set())
    setAnimationKey((key) => key + 1)
    schedule(() => setPulsePodId(null), 1800)
  }

  function applyFix(insight) {
    const podId = insight.rootCause
    const pod = podsById.get(podId)

    setSelectedPodId(podId)
    setSpotlightInsightId(insight.id)
    setPulsePodId(podId)
    setFixStates((current) => ({ ...current, [insight.id]: 'terminating' }))
    setPodOverrides((current) => ({
      ...current,
      [podId]: {
        ...(current[podId] ?? {}),
        status: 'warning',
        phase: 'Terminating',
      },
    }))

    if (insight.id === 1) {
      setMemoryData(RECOVERED_MEMORY_TIMELINE)
      setCpuData(RECOVERED_CPU_TIMELINE)
    }

    if (insight.id === 2) {
      setPvcData(RECOVERED_PVC_TIMELINE)
      setMemoryData(RECOVERED_MEMORY_TIMELINE)
    }

    if (insight.id === 3) {
      setCpuData(RECOVERED_CPU_TIMELINE)
      setNetworkData(QUIET_NETWORK_TIMELINE)
    }

    setAnimationKey((key) => key + 1)

    schedule(() => {
      const recoveredMetrics =
        insight.id === 1
          ? { cpu: 24, memory: 43, restarts: (pod?.restarts ?? 0) + 1 }
          : insight.id === 2
            ? { cpu: 22, memory: 44, restarts: (pod?.restarts ?? 0) + 1 }
            : { cpu: 41, memory: 52, restarts: pod?.restarts ?? 0 }

      setPodOverrides((current) => ({
        ...current,
        [podId]: {
          ...(current[podId] ?? {}),
          ...recoveredMetrics,
          status: 'healthy',
          phase: 'Running',
        },
      }))
      setFixStates((current) => ({ ...current, [insight.id]: 'running' }))
      setFixedInsights((current) => new Set([...current, insight.id]))
    }, 1100)

    schedule(() => setPulsePodId(null), 2600)
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100">
      <ClusterHeader
        onRunMemoryDemo={runMemoryDemo}
        onRunPvcDemo={runPvcDemo}
        onReset={resetDemo}
      />

      <main className="grid min-h-[calc(100vh-65px)] grid-cols-1 gap-3 p-3 lg:grid-cols-[250px_minmax(0,1fr)_320px]">
        <aside className="min-h-0 space-y-3">
          <KPICards />
          <AgentStatusPanel />
          <PodList pods={pods} selectedPodId={selectedPodId} onSelectPod={handleSelectPod} />
        </aside>

        <section className="min-w-0 space-y-3">
          <SignalStrip />
          <DependencyGraph
            pods={pods}
            selectedPodId={selectedPodId}
            pulsePodId={pulsePodId}
            onSelectPod={handleSelectPod}
          />
          <ResourceCharts
            memoryData={memoryData}
            cpuData={cpuData}
            pvcData={pvcData}
            networkData={networkData}
            animationKey={animationKey}
          />
          <AnomalyTimeline activeEventId={activeEventId} onSelectEvent={handleSelectTimelineEvent} />
        </section>

        <RightPanel
          podsById={podsById}
          spotlightInsightId={spotlightInsightId}
          fixStates={fixStates}
          onApplyFix={applyFix}
          fixedInsights={fixedInsights}
        />
      </main>

      <div className="fixed bottom-3 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#1a1d27]/90 px-3 py-2 text-xs text-slate-400 shadow-2xl shadow-black/30 backdrop-blur md:flex">
        <Server size={13} className="text-[#4488ff]" />
        <span>minikube-node-1</span>
        <span className="h-1 w-1 rounded-full bg-slate-600" />
        <span>8 pods observed</span>
      </div>
    </div>
  )
}
