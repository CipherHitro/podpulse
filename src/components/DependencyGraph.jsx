import { memo, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
} from 'reactflow'
import { DEPENDENCY_GRAPH } from '../data/staticData'
import { StatusBadge } from './status'
import { getStatusMeta } from './statusMeta'

// Graph-specific node colors — separate from badge/status colors
const GRAPH_NODE_META = {
  healthy: { fill: '#16a34a', border: '#22c55e', glow: 'rgba(34, 197, 94, 0.3)' },
  warning: { fill: '#d97706', border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' },
  critical: { fill: '#dc2626', border: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)' },
}

const nodeTypes = {
  service: memo(function ServiceNode({ data }) {
    const meta = getStatusMeta(data.status)
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
  const podMap = useMemo(() => new Map(pods.map((pod) => [pod.id, pod])), [pods])

  const nodes = useMemo(
    () =>
      DEPENDENCY_GRAPH.nodes.map((node) => {
        const pod = podMap.get(node.id)
        const status = pod?.phase === 'Terminating' ? 'warning' : pod?.status ?? 'healthy'

        return {
          id: node.id,
          type: 'service',
          position: { x: node.x, y: node.y },
          data: {
            label: node.label,
            status,
            phase: pod?.phase,
            isSelected: node.id === selectedPodId,
            isPulsing: node.id === pulsePodId,
          },
        }
      }),
    [podMap, pulsePodId, selectedPodId],
  )

  const edges = useMemo(
    () =>
      DEPENDENCY_GRAPH.edges.map((edge, index) => {
        const isSelectedPath = edge.source === selectedPodId || edge.target === selectedPodId

        return {
          id: `edge-${index}`,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          animated: true,
          type: 'smoothstep',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isSelectedPath ? '#D97706' : 'rgba(255,255,255,0.4)',
          },
          labelStyle: {
            fill: isSelectedPath ? '#D97706' : 'rgba(255,255,255,0.5)',
            fontSize: 11,
            fontWeight: 700,
          },
          labelBgStyle: { fill: '#0a0a0a', fillOpacity: 0.92 },
          style: {
            stroke: isSelectedPath ? '#D97706' : 'rgba(255,255,255,0.2)',
            strokeWidth: isSelectedPath ? 2.2 : 1.4,
            strokeDasharray: '5 3',
          },
        }
      }),
    [selectedPodId],
  )

  return (
    <section className="min-h-[390px] overflow-hidden rounded-xl border border-[rgba(168,196,101,0.2)] bg-[#111111]">
      <div className="flex items-center justify-between border-b border-[rgba(168,196,101,0.2)] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Dependency Graph</h2>
          <p className="text-xs text-[#555555]">Service calls and inferred blast radius</p>
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
      <div className="h-[430px]">
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
      </div>
    </section>
  )
}
