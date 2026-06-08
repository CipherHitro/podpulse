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

const nodeTypes = {
  service: memo(function ServiceNode({ data }) {
    const meta = getStatusMeta(data.status)

    return (
      <div className="relative flex w-[112px] flex-col items-center">
        <Handle
          type="target"
          position={Position.Left}
          className="!h-2 !w-2 !border-0 !bg-white/30"
        />
        <div
          className={`grid h-16 w-16 place-items-center rounded-full border text-center transition ${
            data.isSelected ? `scale-105 ${meta.border} ${meta.glow}` : 'border-white/15'
          } ${data.isPulsing ? 'pulse-critical' : ''}`}
          style={{
            background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.22), ${meta.line} 72%)`,
            boxShadow: data.isSelected ? undefined : `0 0 20px ${meta.line}35`,
          }}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-white/90 shadow-[0_0_18px_rgba(255,255,255,0.55)]" />
        </div>
        <div className="mt-2 max-w-[120px] text-center text-xs font-semibold leading-tight text-slate-100">
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

export default function DependencyGraph({ pods, selectedPodId, pulsePodId, onSelectPod }) {
  const podMap = useMemo(() => new Map(pods.map((pod) => [pod.id, pod])), [pods])

  const nodes = useMemo(
    () =>
      DEPENDENCY_GRAPH.nodes.map((node) => {
        const pod = podMap.get(node.id)
        const status = pod?.phase === 'Terminating' ? 'warning' : pod?.status ?? node.status

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
            color: isSelectedPath ? '#ffaa00' : '#4488ff',
          },
          labelStyle: {
            fill: isSelectedPath ? '#ffd27a' : '#8fb2ff',
            fontSize: 11,
            fontWeight: 700,
          },
          labelBgStyle: { fill: '#111522', fillOpacity: 0.92 },
          style: {
            stroke: isSelectedPath ? '#ffaa00' : '#4488ff',
            strokeWidth: isSelectedPath ? 2.2 : 1.4,
            strokeDasharray: '8 6',
          },
        }
      }),
    [selectedPodId],
  )

  return (
    <section className="min-h-[390px] overflow-hidden rounded-lg border border-white/10 bg-[#1a1d27] shadow-xl shadow-black/10">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Dependency Graph</h2>
          <p className="text-xs text-slate-500">Service calls and inferred blast radius</p>
        </div>
        <StatusBadge status="critical" label="2 critical" />
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
          <Background color="#293246" gap={22} size={1} />
          <Controls position="bottom-right" showInteractive={false} />
        </ReactFlow>
      </div>
    </section>
  )
}
