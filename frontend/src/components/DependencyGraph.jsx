import { memo, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
} from 'reactflow'
import { StatusBadge } from './status'

// Graph-specific node colors — separate from badge/status colors
const GRAPH_NODE_META = {
  healthy: { fill: '#16a34a', border: '#22c55e', glow: 'rgba(34, 197, 94, 0.3)' },
  warning: { fill: '#d97706', border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' },
  critical: { fill: '#dc2626', border: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)' },
}

const nodeTypes = {
  service: memo(function ServiceNode({ data }) {
    const gn = GRAPH_NODE_META[data.status] || GRAPH_NODE_META.healthy

    return (
      <div className="relative flex w-[112px] flex-col items-center">
        <Handle
          type="target"
          position={Position.Left}
          className="!h-2 !w-2 !border-0 !bg-white/30"
        />
        <div
          className={`grid h-16 w-16 place-items-center rounded-full text-center transition ${
            data.isSelected ? 'scale-105' : ''
          } ${data.isPulsing ? 'pulse-critical' : ''}`}
          style={{
            background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.22), ${gn.fill} 72%)`,
            border: data.isSelected ? `3px solid ${gn.border}` : `2px solid ${gn.border}`,
            boxShadow: `0 0 ${data.isSelected ? '20' : '12'}px ${gn.glow}`,
          }}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-white/90 shadow-[0_0_18px_rgba(255,255,255,0.55)]" />
        </div>
        <div className="mt-2 max-w-[120px] text-center text-xs font-semibold leading-tight text-[#dad7cd]">
          {data.label}
        </div>
        <div className="mt-1">
          <StatusBadge status={data.status} label={data.phase ?? data.status} className="scale-90" />
        </div>
        <Handle
          type="source"
          position={Position.Right}
          className="!h-2 !w-2 !border-0 !bg-white/30"
        />
      </div>
    )
  }),
}

export default function DependencyGraph({
  pods,
  selectedPodId,
  pulsePodId,
  criticalCount,
  warningCount,
  onSelectPod,
}) {
  const nodes = useMemo(
    () =>
      pods.map((pod, index) => {
        const columns = Math.max(1, Math.ceil(Math.sqrt(pods.length || 1)))
        const row = Math.floor(index / columns)
        const column = index % columns
        const status = pod.phase === 'Terminating' ? 'warning' : pod.status
        const isSelected = pod.id === selectedPodId
        const isPulsing = pod.id === pulsePodId

        return {
          id: pod.id,
          type: 'service',
          position: { x: column * 180, y: row * 140 },
          data: {
            label: pod.name,
            status,
            phase: pod.phase,
            isSelected,
            isPulsing,
          },
        }
      }),
    [pods, pulsePodId, selectedPodId],
  )

  const edges = useMemo(() => [], [])

  return (
    <section className="h-full flex flex-col overflow-hidden rounded-xl border border-[rgba(168,196,101,0.2)] bg-[#111111]">
      <div className="flex items-center justify-between border-b border-[rgba(168,196,101,0.2)] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Dependency Graph</h2>
          <p className="text-xs text-[#555555]">Pod nodes from Kubernetes API</p>
        </div>
        <StatusBadge
          status={criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'healthy'}
          label={
            criticalCount > 0
              ? `${criticalCount} critical`
              : warningCount > 0
                ? `${warningCount} warning`
                : 'healthy'
          }
        />
      </div>
      <div className="flex-1 min-h-0">
        {nodes.length === 0 ? (
          <div className="grid h-full place-items-center text-xs text-[#555555]">
            No pods returned by the backend.
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => onSelectPod(node.id)}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.65}
            maxZoom={1.3}
            nodesDraggable={false}
            nodesConnectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="rgba(255,255,255,0.05)" gap={22} size={1} />
            <Controls position="bottom-right" showInteractive={false} />
          </ReactFlow>
        )}
      </div>
    </section>
  )
}
