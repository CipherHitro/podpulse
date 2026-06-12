import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import 'reactflow/dist/style.css'
import { CheckCircle, Clock, Cpu, Gauge, RefreshCcw, Server } from 'lucide-react'
import AIInsightCard from './components/AIInsightCard'
import DependencyGraph from './components/DependencyGraph'
import KPICards from './components/KPICards'
import LiveEventLog from './components/LiveEventLog'
import PodDetailsModal from './components/PodDetailsModal'
import PodGrid from './components/PodGrid'
import ResourceCharts from './components/ResourceCharts'
import { StatusBadge, StatusDot } from './components/status'
import { getStatusMeta } from './components/statusMeta'
import './App.css'

function formatTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

function HeaderBadgeGroup({ criticalCount, warningCount }) {
  const allNominal = criticalCount === 0 && warningCount === 0

  return (
    <div className="mr-1 hidden items-center gap-2 rounded-md border border-[rgba(168,196,101,0.2)] bg-[rgba(255,255,255,0.05)] px-3 py-2 text-sm text-[#dad7cd] md:flex">
      <StatusDot status={allNominal ? 'healthy' : 'critical'} />
      <span>
        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs border ${
          allNominal 
            ? 'border-[rgba(34,197,94,0.35)] bg-[rgba(22,163,74,0.15)] text-[#22c55e]' 
            : 'border-[rgba(220,38,38,0.35)] bg-[rgba(220,38,38,0.12)] text-[#DC2626]'
        }`}>{criticalCount} critical</span>
      </span>
      <span className="text-[#555555]">/</span>
      <StatusDot status={allNominal ? 'healthy' : 'warning'} />
      <span>
        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs border ${
          allNominal 
            ? 'border-[rgba(34,197,94,0.35)] bg-[rgba(22,163,74,0.15)] text-[#22c55e]' 
            : 'border-[rgba(217,119,6,0.35)] bg-[rgba(217,119,6,0.12)] text-[#D97706]'
        }`}>{warningCount} warning</span>
      </span>
    </div>
  )
}

function ClusterHeader({
  criticalCount,
  warningCount,
  activeAnomalies,
  clockText,
  lastScanAge,
  onReset,
}) {
  const clusterStatus = activeAnomalies > 0 ? 'critical' : 'healthy'

  return (
    <header className="sticky top-0 z-20 border-b border-[rgba(168,196,101,0.2)] bg-[#111111]/95 px-4 py-3 backdrop-blur" style={{boxShadow:'0 1px 0 rgba(168,196,101,0.08)'}}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[rgba(168,196,101,0.2)] bg-[rgba(168,196,101,0.05)] overflow-hidden">
            <img src="/logo.png" alt="PodPulse Logo" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-white">PodPulse</h1>
              <StatusBadge
                status={clusterStatus}
                label={activeAnomalies > 0 ? 'cluster degraded' : 'cluster nominal'}
              />
            </div>
            <p className="text-xs text-[#555555]">
              AI-powered Kubernetes observability for campus services
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <HeaderBadgeGroup criticalCount={criticalCount} warningCount={warningCount} />
          <div className="flex items-center gap-2 rounded-md border border-[rgba(168,196,101,0.2)] bg-[rgba(168,196,101,0.08)] px-2.5 py-1 text-sm">
            <Clock size={15} className="text-[#A8C465]" />
            <span className="font-mono text-[#A8C465]">{clockText}</span>
            <span className="text-xs text-[#A8C465]">Last scan: {lastScanAge}s ago</span>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[rgba(168,196,101,0.2)] bg-[rgba(255,255,255,0.05)] text-[#555555] transition hover:text-[#A8C465] hover:border-[rgba(168,196,101,0.4)]"
            title="Refresh data"
            aria-label="Refresh data"
          >
            <RefreshCcw size={15} />
          </button>
        </div>
      </div>
    </header>
  )
}

function formatMetricValue(value, unit = '') {
  return Number.isFinite(value) ? `${value}${unit}` : '—'
}

function SignalStrip({ clusterCpu, clusterMemory, healthyCount, restartCount }) {
  return (
    <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {[
        { label: 'Cluster CPU', value: formatMetricValue(clusterCpu, '%'), icon: Cpu, status: clusterCpu >= 70 ? 'warning' : 'info' },
        {
          label: 'Cluster Memory',
          value: formatMetricValue(clusterMemory, '%'),
          icon: Gauge,
          status: clusterMemory >= 80 ? 'critical' : clusterMemory >= 60 ? 'warning' : 'healthy',
        },
        { label: 'Healthy Pods', value: healthyCount, icon: CheckCircle, status: 'healthy' },
        { label: 'Restarts', value: restartCount, icon: Server, status: restartCount > 0 ? 'warning' : 'healthy' },
      ].map((item) => {
        const Icon = item.icon
        const meta = getStatusMeta(item.status)

        return (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 rounded-[10px] border border-[rgba(168,196,101,0.2)] bg-[rgba(255,255,255,0.05)] px-4 py-3 transition duration-200 hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(168,196,101,0.4)]"
          >
            <div>
              <div className="text-xs uppercase tracking-[0.08em] text-[#555555]">{item.label}</div>
              <div className="mt-1 text-lg font-bold text-white">{item.value}</div>
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

function RightPanel({
  insights,
  podsById,
  spotlightInsightId,
  fixStates,
  onApplyFix,
}) {
  useEffect(() => {
    if (spotlightInsightId !== null) {
      document
        .getElementById(`insight-${spotlightInsightId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [spotlightInsightId])

  const orderedInsights = useMemo(() => {
    const active = insights.filter((insight) => insight.active)
    if (spotlightInsightId === null) return active
    const spotlight = active.find((insight) => insight.id === spotlightInsightId)
    const rest = active.filter((insight) => insight.id !== spotlightInsightId)
    return spotlight ? [spotlight, ...rest] : active
  }, [insights, spotlightInsightId])

  const activeCount = useMemo(() => {
    return insights.filter((insight) => insight.active && !insight.resolved).length
  }, [insights])

  return (
    <aside className="rounded-lg border border-[rgba(168,196,101,0.2)] bg-[#111111] p-4 h-full flex flex-col">
      <div className="mb-3 flex items-center justify-between pb-3 border-b border-[rgba(168,196,101,0.08)]">
        <div>
          <h2 className="text-sm font-semibold text-white">AI Insights</h2>
          <p className="text-xs text-[#555555]">Root cause cards and commands</p>
        </div>
        <StatusBadge
          status={activeCount > 0 ? 'critical' : 'healthy'}
          label={`${activeCount} active`}
        />
      </div>
      <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
        {orderedInsights.length === 0 ? (
          <div className="rounded-[10px] border border-[rgba(168,196,101,0.15)] bg-[rgba(255,255,255,0.05)] p-4 text-center text-xs text-[#555555]">
            No active anomalies or insights detected.
          </div>
        ) : (
          orderedInsights.map((insight) => (
            <AIInsightCard
              key={insight.id}
              insight={insight}
              podsById={podsById}
              isHighlighted={insight.id === spotlightInsightId}
              fixState={fixStates[insight.id]}
              onApplyFix={onApplyFix}
            />
          ))
        )}
      </div>
    </aside>
  )
}

export default function App() {
  const [pods, setPods] = useState([])
  const [insights, setInsights] = useState([])
  const [selectedPodId, setSelectedPodId] = useState(null)
  const [spotlightInsightId, setSpotlightInsightId] = useState(null)
  const [pulsePodId, setPulsePodId] = useState(null)
  const [animationKey, setAnimationKey] = useState(0)
  const [memoryData, setMemoryData] = useState([])
  const [cpuData, setCpuData] = useState([])
  const [pvcData, setPvcData] = useState([])
  const [networkData, setNetworkData] = useState([])
  const [fixStates, setFixStates] = useState({})
  const [eventLog, setEventLog] = useState([])
  const [clockNow, setClockNow] = useState(() => new Date())
  const [lastScanAge, setLastScanAge] = useState(0)
  
  const [isPodModalOpen, setIsPodModalOpen] = useState(false)
  const [modalScrollPodId, setModalScrollPodId] = useState(null)
  const [modalHighlightPodId, setModalHighlightPodId] = useState(null)

  const timersRef = useRef([])

  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch pods
      const podsRes = await fetch('http://localhost:8000/api/pods')
      if (podsRes.ok) {
        const podsData = await podsRes.json()
        setPods(podsData)
      }
      
      // 2. Fetch events
      const eventsRes = await fetch('http://localhost:8000/api/events')
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json()
        setEventLog(eventsData)
      }
      
      // 3. Fetch insights
      const insightsRes = await fetch('http://localhost:8000/api/insights')
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json()
        setInsights(insightsData)
      }
      
      // 4. Fetch metrics
      const metricsRes = await fetch('http://localhost:8000/api/metrics')
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        if (metricsData.memoryData) setMemoryData(metricsData.memoryData)
        if (metricsData.cpuData) setCpuData(metricsData.cpuData)
        if (metricsData.pvcData) setPvcData(metricsData.pvcData)
        if (metricsData.networkData) setNetworkData(metricsData.networkData)
      }
      
      setLastScanAge(0)
      setAnimationKey((k) => k + 1)
    } catch (err) {
      console.error('Error polling dashboard API:', err)
    }
  }, [])

  useEffect(() => {
    const initialPulse = window.setTimeout(() => setPulsePodId(null), 1800)
    const scheduledTimers = timersRef.current

    return () => {
      window.clearTimeout(initialPulse)
      scheduledTimers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  useEffect(() => {
    const clockTimer = window.setInterval(() => setClockNow(new Date()), 1000)
    return () => window.clearInterval(clockTimer)
  }, [])

  useEffect(() => {
    const initialFetchTimer = window.setTimeout(fetchData, 0)
    const ageTimer = window.setInterval(() => {
      setLastScanAge((current) => current + 1)
    }, 1000)
    const scanTimer = window.setInterval(() => {
      fetchData()
    }, 10000)

    return () => {
      window.clearTimeout(initialFetchTimer)
      window.clearInterval(ageTimer)
      window.clearInterval(scanTimer)
    }
  }, [fetchData])

  const podsById = useMemo(() => new Map(pods.map((pod) => [pod.id, pod])), [pods])
  const criticalCount = useMemo(
    () => pods.filter((pod) => pod.status === 'critical').length,
    [pods],
  )
  const warningCount = useMemo(
    () => pods.filter((pod) => pod.status === 'warning').length,
    [pods],
  )
  const healthyCount = useMemo(
    () => pods.filter((pod) => pod.status === 'healthy').length,
    [pods],
  )
  const activeAnomalies = useMemo(
    () => pods.filter((pod) => pod.status === 'critical' || pod.status === 'warning').length,
    [pods],
  )
  const clusterCpu = useMemo(() => {
    const values = pods.map((pod) => pod.cpu).filter(Number.isFinite)
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null
  }, [pods])
  const clusterMemory = useMemo(() => {
    const values = pods.map((pod) => pod.memory).filter(Number.isFinite)
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null
  }, [pods])
  const restartCount = useMemo(
    () => pods.reduce((sum, pod) => sum + pod.restarts, 0),
    [pods],
  )
  const clockText = useMemo(() => formatTime(clockNow), [clockNow])

  function schedule(callback, delay) {
    const timer = window.setTimeout(callback, delay)
    timersRef.current.push(timer)
  }

  function getInsightForPod(podId) {
    return (
      insights.find((insight) => insight.rootCause === podId && !insight.resolved) ??
      insights.find((insight) => insight.impact.includes(podId) && !insight.resolved) ??
      insights.find((insight) => insight.rootCause === podId || insight.impact.includes(podId))
    )
  }

  function highlightPodAndInsight(podId, insightId) {
    setSelectedPodId(podId)
    setPulsePodId(podId)
    if (insightId) setSpotlightInsightId(insightId)
    schedule(() => setPulsePodId(null), 2000)
  }

  function handleSelectPod(podId) {
    const insight = getInsightForPod(podId)
    highlightPodAndInsight(podId, insight?.id)
  }

  function handlePodGridClick(podId) {
    const pod = podsById.get(podId)
    setIsPodModalOpen(true)
    setModalScrollPodId(podId)
    if (pod?.status === 'critical' || pod?.status === 'warning') {
      setModalHighlightPodId(podId)
      schedule(() => setModalHighlightPodId(null), 1600)
    } else {
      setModalHighlightPodId(null)
    }
  }

  function handleViewInsightFromModal(podId) {
    setIsPodModalOpen(false)
    handleSelectPod(podId)
  }

  function refreshData() {
    fetchData()
  }

  async function applyFix(insight) {
    const podId = insight.rootCause
    const pod = podsById.get(podId)
    if (!pod) return

    setSelectedPodId(podId)
    setSpotlightInsightId(insight.id)
    setPulsePodId(podId)
    setFixStates((current) => ({ ...current, [insight.id]: 'terminating' }))
    setPods((current) =>
      current.map((item) =>
        item.id === podId ? { ...item, status: 'warning', phase: 'Terminating' } : item,
      ),
    )

    try {
      const res = await fetch(`http://localhost:8000/api/pods/${pod.namespace}/${pod.name}/restart`, {
        method: 'POST'
      })
      if (!res.ok) {
        throw new Error('Failed to restart pod via API')
      }
      
      window.setTimeout(() => {
        setFixStates((current) => ({ ...current, [insight.id]: 'running' }))
        fetchData()
      }, 2000)
    } catch (err) {
      console.error(err)
      setFixStates((current) => {
        const next = { ...current }
        delete next[insight.id]
        return next
      })
      alert('Failed to apply fix on the live cluster. Check API server.')
    }

    schedule(() => setPulsePodId(null), 2600)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#dad7cd]">
      <ClusterHeader
        criticalCount={criticalCount}
        warningCount={warningCount}
        activeAnomalies={activeAnomalies}
        clockText={clockText}
        lastScanAge={lastScanAge}
        onReset={refreshData}
      />

      <main className="w-full space-y-4 p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_360px] lg:h-[750px] items-stretch">
          <aside className="flex flex-col gap-3 h-full min-h-0">
            <KPICards pods={pods} />
            <div className="flex-1 min-h-0">
              <PodGrid 
                pods={pods} 
                selectedPodId={selectedPodId} 
                onPodClick={handlePodGridClick} 
                onOpenModal={() => {
                  setModalScrollPodId(null)
                  setModalHighlightPodId(null)
                  setIsPodModalOpen(true)
                }}
              />
            </div>
          </aside>

          <div className="flex flex-col gap-3 h-full min-h-0">
            <SignalStrip
              clusterCpu={clusterCpu}
              clusterMemory={clusterMemory}
              healthyCount={healthyCount}
              restartCount={restartCount}
            />
            <div className="flex-grow min-h-0">
              <DependencyGraph
                pods={pods}
                selectedPodId={selectedPodId}
                pulsePodId={pulsePodId}
                criticalCount={criticalCount}
                warningCount={warningCount}
                onSelectPod={handleSelectPod}
              />
            </div>
          </div>

          <div className="h-full min-h-0">
            <RightPanel
              insights={insights}
              podsById={podsById}
              spotlightInsightId={spotlightInsightId}
              fixStates={fixStates}
              onApplyFix={applyFix}
            />
          </div>
        </div>

        <div className="space-y-4">
          <ResourceCharts
            pods={pods}
            memoryData={memoryData}
            cpuData={cpuData}
            pvcData={pvcData}
            networkData={networkData}
            animationKey={animationKey}
          />
          <LiveEventLog events={eventLog} onClear={() => setEventLog([])} />
        </div>
      </main>

      <footer className="border-t border-[rgba(168,196,101,0.2)] bg-[#111111] px-4 py-4 text-center text-xs font-mono text-[#555555]">
        Kubernetes API: localhost:8000
      </footer>

      <PodDetailsModal
        isOpen={isPodModalOpen}
        onClose={() => setIsPodModalOpen(false)}
        pods={pods}
        insights={insights}
        onViewInsight={handleViewInsightFromModal}
        scrollPodId={modalScrollPodId}
        highlightPodId={modalHighlightPodId}
      />
    </div>
  )
}
