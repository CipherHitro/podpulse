import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { StatusBadge } from './status'

const tooltipStyle = {
  background: '#111111',
  border: '1px solid rgba(168,196,101,0.2)',
  borderRadius: 8,
  color: '#dad7cd',
  boxShadow: '0 18px 50px rgba(0,0,0,0.38)',
}

function ChartShell({ title, subtitle, status = 'info', children }) {
  return (
    <section className="min-h-[230px] rounded-xl border border-[rgba(168,196,101,0.2)] bg-[#111111] p-4 transition duration-200 hover:border-[rgba(168,196,101,0.4)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white">{title}</h3>
          <p className="truncate text-xs text-[#555555]">{subtitle}</p>
        </div>
        <StatusBadge status={status} label={status} />
      </div>
      <div className="h-[164px]">{children}</div>
    </section>
  )
}

function baseAxes(unit = '%') {
  return (
    <>
      <CartesianGrid stroke="rgba(168,196,101,0.08)" strokeDasharray="3 3" vertical={false} />
      <XAxis
        dataKey="time"
        stroke="#555555"
        tick={{ fill: '#555555', fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        minTickGap={12}
      />
      <YAxis
        stroke="#555555"
        tick={{ fill: '#555555', fontSize: 11 }}
        tickFormatter={(value) => `${value}${unit}`}
        tickLine={false}
        axisLine={false}
        width={36}
      />
      <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#A8C465' }} cursor={{ stroke: 'rgba(168,196,101,0.3)' }} />
    </>
  )
}

export default function ResourceCharts({
  pods,
  memoryData,
  cpuData,
  pvcData,
  networkData,
  animationKey,
}) {
  const podById = new Map(pods.map((pod) => [pod.id, pod]))
  const statusForPods = (ids, fallback = 'healthy') => {
    const statuses = ids.map((id) => podById.get(id)?.status).filter(Boolean)
    if (statuses.includes('critical')) return 'critical'
    if (statuses.includes('warning')) return 'warning'
    if (statuses.includes('healthy')) return 'healthy'
    return fallback
  }
  const memoryStatus = statusForPods([
    'auth-service-5b2c',
    'library-service-8a1e',
    'student-portal-7d9f',
  ])
  const cpuStatus = statusForPods(['student-portal-7d9f', 'auth-service-5b2c', 'api-gateway-2f8a'])
  const pvcStatus = statusForPods(['library-service-8a1e'])
  const networkStatus = statusForPods(['api-gateway-2f8a', 'student-portal-7d9f'], 'info')

  const pvcSegmentData = pvcData.map((point) => ({
    ...point,
    latencyNormal: point.latency <= 1 ? point.latency : null,
    latencyAlert: point.latency > 1 ? point.latency : null,
  }))

  return (
    <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <ChartShell title="Memory Usage Over Time" subtitle="Auth, library, student portal" status={memoryStatus}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={memoryData} key={`memory-${animationKey}`}>
            {baseAxes('%')}
            <ReferenceLine y={85} stroke="#D97706" strokeDasharray="4 2" ifOverflow="extendDomain" />
            <Line
              type="monotone"
              dataKey="authService"
              name="auth-service"
              stroke="#DC2626"
              strokeWidth={2.4}
              dot={false}
              isAnimationActive
              animationDuration={900}
            />
            <Line
              type="monotone"
              dataKey="libraryService"
              name="library-service"
              stroke="#D97706"
              strokeWidth={2.4}
              dot={false}
              isAnimationActive
              animationDuration={900}
            />
            <Line
              type="monotone"
              dataKey="studentPortal"
              name="student-portal"
              stroke="#A8C465"
              strokeWidth={2.4}
              dot={false}
              isAnimationActive
              animationDuration={900}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="CPU Usage Over Time" subtitle="Login surge correlation" status={cpuStatus}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={cpuData} key={`cpu-${animationKey}`}>
            {baseAxes('%')}
            <ReferenceLine y={70} stroke="#D97706" strokeDasharray="4 2" ifOverflow="extendDomain" />
            <Line
              type="monotone"
              dataKey="studentPortal"
              name="student-portal"
              stroke="#A8C465"
              strokeWidth={2.4}
              dot={false}
              isAnimationActive
              animationDuration={900}
            />
            <Line
              type="monotone"
              dataKey="authService"
              name="auth-service"
              stroke="#D97706"
              strokeWidth={2.1}
              dot={false}
              isAnimationActive
              animationDuration={900}
            />
            <Line
              type="monotone"
              dataKey="apiGateway"
              name="api-gateway"
              stroke="#7A9E97"
              strokeWidth={2.1}
              dot={false}
              isAnimationActive
              animationDuration={900}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="PVC I/O Latency" subtitle="library-pvc read latency" status={pvcStatus}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pvcSegmentData} key={`pvc-${animationKey}`}>
            {baseAxes('s')}
            <ReferenceLine y={1} stroke="#D97706" strokeDasharray="4 2" ifOverflow="extendDomain" />
            <Line
              type="monotone"
              dataKey="latencyNormal"
              name="latency"
              stroke="#A8C465"
              strokeWidth={2.4}
              dot={false}
              connectNulls={false}
              isAnimationActive
              animationDuration={900}
            />
            <Line
              type="monotone"
              dataKey="latencyAlert"
              name="latency over threshold"
              stroke="#DC2626"
              strokeWidth={2.8}
              dot={false}
              connectNulls={false}
              isAnimationActive
              animationDuration={900}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="Network Requests" subtitle="Cluster ingress volume" status={networkStatus}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={networkData} key={`network-${animationKey}`}>
            {baseAxes('')}
            <ReferenceLine y={2000} stroke="#D97706" strokeDasharray="4 2" ifOverflow="extendDomain" />
            <Line
              type="monotone"
              dataKey="requests"
              name="requests"
              stroke="#A8C465"
              strokeWidth={2.4}
              dot={false}
              isAnimationActive
              animationDuration={900}
            />
            <Line
              type="monotone"
              dataKey="errors"
              name="errors"
              stroke="#DC2626"
              strokeWidth={1.8}
              dot={false}
              isAnimationActive
              animationDuration={900}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>
    </section>
  )
}
