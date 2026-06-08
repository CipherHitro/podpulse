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
  background: '#111522',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: '#e2e8f0',
  boxShadow: '0 18px 50px rgba(0,0,0,0.38)',
}

function ChartShell({ title, subtitle, status = 'info', children }) {
  return (
    <section className="min-h-[230px] rounded-lg border border-white/10 bg-[#1a1d27] p-4 shadow-xl shadow-black/10">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white">{title}</h3>
          <p className="truncate text-xs text-slate-500">{subtitle}</p>
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
      <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" vertical={false} />
      <XAxis
        dataKey="time"
        stroke="#64748b"
        tick={{ fill: '#94a3b8', fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        minTickGap={12}
      />
      <YAxis
        stroke="#64748b"
        tick={{ fill: '#94a3b8', fontSize: 11 }}
        tickFormatter={(value) => `${value}${unit}`}
        tickLine={false}
        axisLine={false}
        width={36}
      />
      <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#f8fafc' }} cursor={{ stroke: '#4488ff55' }} />
    </>
  )
}

export default function ResourceCharts({
  memoryData,
  cpuData,
  pvcData,
  networkData,
  animationKey,
}) {
  const pvcSegmentData = pvcData.map((point) => ({
    ...point,
    latencyNormal: point.latency <= 1 ? point.latency : null,
    latencyAlert: point.latency > 1 ? point.latency : null,
  }))

  return (
    <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <ChartShell title="Memory Usage Over Time" subtitle="Auth, library, student portal" status="critical">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={memoryData} key={`memory-${animationKey}`}>
            {baseAxes('%')}
            <ReferenceLine y={85} stroke="#ff4444" strokeDasharray="5 5" ifOverflow="extendDomain" />
            <Line
              type="monotone"
              dataKey="authService"
              name="auth-service"
              stroke="#ff4444"
              strokeWidth={2.4}
              dot={false}
              isAnimationActive
              animationDuration={900}
            />
            <Line
              type="monotone"
              dataKey="libraryService"
              name="library-service"
              stroke="#ffaa00"
              strokeWidth={2.4}
              dot={false}
              isAnimationActive
              animationDuration={900}
            />
            <Line
              type="monotone"
              dataKey="studentPortal"
              name="student-portal"
              stroke="#4488ff"
              strokeWidth={2.4}
              dot={false}
              isAnimationActive
              animationDuration={900}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="CPU Usage Over Time" subtitle="Login surge correlation" status="warning">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={cpuData} key={`cpu-${animationKey}`}>
            {baseAxes('%')}
            <ReferenceLine y={70} stroke="#ff4444" strokeDasharray="5 5" ifOverflow="extendDomain" />
            <Line
              type="monotone"
              dataKey="studentPortal"
              name="student-portal"
              stroke="#4488ff"
              strokeWidth={2.4}
              dot={false}
              isAnimationActive
              animationDuration={900}
            />
            <Line
              type="monotone"
              dataKey="authService"
              name="auth-service"
              stroke="#ff4444"
              strokeWidth={2.1}
              dot={false}
              isAnimationActive
              animationDuration={900}
            />
            <Line
              type="monotone"
              dataKey="apiGateway"
              name="api-gateway"
              stroke="#ffaa00"
              strokeWidth={2.1}
              dot={false}
              isAnimationActive
              animationDuration={900}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="PVC I/O Latency" subtitle="library-pvc read latency" status="critical">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pvcSegmentData} key={`pvc-${animationKey}`}>
            {baseAxes('s')}
            <ReferenceLine y={1} stroke="#ff4444" strokeDasharray="5 5" ifOverflow="extendDomain" />
            <Line
              type="monotone"
              dataKey="latencyNormal"
              name="latency"
              stroke="#00ff88"
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
              stroke="#ff4444"
              strokeWidth={2.8}
              dot={false}
              connectNulls={false}
              isAnimationActive
              animationDuration={900}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="Network Requests" subtitle="Cluster ingress volume" status="info">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={networkData} key={`network-${animationKey}`}>
            {baseAxes('')}
            <ReferenceLine y={2000} stroke="#ff4444" strokeDasharray="5 5" ifOverflow="extendDomain" />
            <Line
              type="monotone"
              dataKey="requests"
              name="requests"
              stroke="#4488ff"
              strokeWidth={2.4}
              dot={false}
              isAnimationActive
              animationDuration={900}
            />
            <Line
              type="monotone"
              dataKey="errors"
              name="errors"
              stroke="#ff4444"
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
