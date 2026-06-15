import { memo, useMemo, useCallback, useEffect, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
} from 'reactflow'
import dagre from 'dagre'
import { StatusBadge, StatusDot } from './status'

const STATUS_COLORS = {
  healthy: { fill: '#16a34a', border: '#22c55e', glow: 'rgba(34, 197, 94, 0.3)' },
  warning: { fill: '#d97706', border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' },
  critical: { fill: '#dc2626', border: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)' },
}

function getPodBorderStyle(status) {
  if (status === 'critical') return 'rgba(220,38,38,0.6)'
  if (status === 'warning') return 'rgba(217,119,6,0.6)'
  return 'rgba(255,255,255,0.2)'
}

function getPodBgStyle(status) {
  if (status === 'critical') return 'rgba(220,38,38,0.15)'
  if (status === 'warning') return 'rgba(217,119,6,0.12)'
  return 'rgba(255,255,255,0.04)'
}

// ── Deployment Node (large group container) ──────────────────────
function DeploymentNode({ data }) {
  const sc = STATUS_COLORS[data.status] || STATUS_COLORS.healthy

  return (
    <div
      className="relative rounded-xl border-2 backdrop-blur transition-all duration-300"
      style={{
        width: data.width || 180,
        height: data.height || 220,
        borderColor: sc.border,
        background: 'rgba(17,17,17,0.92)',
        boxShadow: `0 0 20px ${sc.glow}`,
        cursor: 'pointer',
      }}
      onClick={() => data.onSelect?.(data.label)}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 rounded-t-xl px-3 py-2"
        style={{
          background: `linear-gradient(135deg, ${sc.fill}22, transparent)`,
          borderBottom: `1px solid ${sc.border}30`,
        }}
      >
        <StatusDot status={data.status} className="h-2 w-2" />
        <span className="text-xs font-bold text-white truncate flex-1">{data.label}</span>
        <span
          className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full"
          style={{
            background: `${sc.fill}20`,
            color: sc.border,
            border: `1px solid ${sc.border}40`,
          }}
        >
          {data.status}
        </span>
      </div>

      {/* Pods inside */}
      <div className="flex flex-wrap gap-2 p-3">
        {data.pods?.map((pod) => {
          const isDotCritical = pod.status === 'critical'
          return (
            <div
              key={pod.id}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-mono transition hover:brightness-125"
              style={{
                background: getPodBgStyle(pod.status),
                border: `1px solid ${getPodBorderStyle(pod.status)}`,
                cursor: 'pointer',
              }}
              title={pod.id}
              onClick={(e) => {
                e.stopPropagation()
                data.onSelect?.(pod.id)
              }}
            >
              <StatusDot
                status={pod.status}
                className={`h-1.5 w-1.5 ${isDotCritical ? 'pod-dot-critical' : ''}`}
              />
              <span className="text-[#aaa] truncate max-w-[80px]">{pod.shortName}</span>
            </div>
          )
        })}
        {(!data.pods || data.pods.length === 0) && (
          <span className="text-[10px] text-[#444] italic">No pods</span>
        )}
      </div>

      {/* Handles for edges */}
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-[#111] !bg-[#A8C465]" />
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-[#111] !bg-[#A8C465]" />
    </div>
  )
}

const nodeTypes = {
  deployment: memo(DeploymentNode),
}

function layoutDeployments(nodes, edges) {
  if (nodes.length === 0) return nodes

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 150, marginx: 40, marginy: 40 })

  nodes.forEach((n) => g.setNode(n.id, { width: n.data.width || 180, height: n.data.height || 220 }))
  edges.forEach((e) => g.setEdge(e.source, e.target))

  dagre.layout(g)

  return nodes.map((n) => {
    const pos = g.node(n.id)
    const w = n.data.width || 180
    const h = n.data.height || 220
    return { ...n, position: { x: pos.x - w / 2, y: pos.y - h / 2 } }
  })
}

function getShortName(podName, deploymentName) {
  // Remove the deployment prefix + trailing hash for brevity
  if (podName.startsWith(deploymentName)) {
    return podName.replace(deploymentName, '').replace(/^[-]/, '')
  }
  return podName
}

function getDeploymentStatus(pods) {
  if (pods.some((p) => p.status === 'critical')) return 'critical'
  if (pods.some((p) => p.status === 'warning')) return 'warning'
  return 'healthy'
}

export default function DependencyGraph({
  pods,
  topology,
  selectedPodId,
  pulsePodId,
  criticalCount,
  warningCount,
  onSelectPod,
}) {
  const [rfInstance, setRfInstance] = useState(null)

  const { nodes, edges } = useMemo(() => {
    const podById = new Map(pods.map((p) => [p.id, p]))

    // Group pods by their parent deployment
    const deploymentPods = {}
    const belongsEdges = []

    for (const topoNode of topology?.nodes ?? []) {
      if (topoNode.type === 'pod') {
        // Find parent deployment via belongs_to edge
        const parentEdge = topology?.edges?.find(
          (e) => e.relation === 'belongs_to' && e.source === topoNode.id
        )
        const depName = parentEdge?.target
        if (depName) {
          if (!deploymentPods[depName]) deploymentPods[depName] = []
          const pod = podById.get(topoNode.id)
          deploymentPods[depName].push({
            id: topoNode.id,
            status: pod?.status ?? 'healthy',
            phase: pod?.phase,
            shortName: getShortName(topoNode.id, depName),
          })

          // belongs_to edge (visible)
          belongsEdges.push({
            id: `belongs-${topoNode.id}-${depName}`,
            source: topoNode.id,
            target: depName,
            style: { stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1, strokeDasharray: '3 4' },
          })
        }
      }
    }

    // Build deployment group nodes
    const deploymentNodeIds = new Set(
      (topology?.nodes ?? []).filter((n) => n.type === 'deployment').map((n) => n.id)
    )

    // Ensure all deployments from topology have an entry, even if no pods
    for (const depId of deploymentNodeIds) {
      if (!deploymentPods[depId]) deploymentPods[depId] = []
    }

    const maxPods = Math.max(...Object.values(deploymentPods).map((p) => p.length), 1)
    const groupHeight = Math.max(140, 60 + Math.min(maxPods, 6) * 32)

    const deploymentNodes = Array.from(deploymentNodeIds).map((depId) => {
      const pod = podById.get(depId)
      const podsInDep = deploymentPods[depId] || []
      const depStatus = podsInDep.length > 0 ? getDeploymentStatus(podsInDep) : (pod?.status ?? 'healthy')

      return {
        id: depId,
        type: 'deployment',
        data: {
          label: depId,
          status: depStatus,
          pods: podsInDep,
          onSelect: onSelectPod,
          width: 200,
          height: groupHeight,
        },
      }
    })

    // Traffic edges between deployments (visible)
    const trafficEdges = (topology?.edges ?? [])
      .filter((e) => e.relation === 'traffic' && e.requests_per_sec > 0 && deploymentNodeIds.has(e.source) && deploymentNodeIds.has(e.target))
      .map((edge) => ({
        id: `traffic-${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        label: `${edge.requests_per_sec} rps`,
        style: { stroke: 'rgba(168,196,101,0.7)', strokeWidth: 2.5 },
        labelStyle: { fill: '#A8C465', fontSize: 10, fontWeight: 700 },
        labelBgStyle: { fill: '#111', opacity: 0.9 },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 4,
        markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(168,196,101,0.7)' },
        animated: false,
      }))

    const allNodes = deploymentNodes
    const allEdges = [...trafficEdges]
    const laidOut = layoutDeployments(allNodes, allEdges)

    return { nodes: laidOut, edges: allEdges }
  }, [pods, topology, selectedPodId, pulsePodId, onSelectPod])

  useEffect(() => {
    if (nodes.length > 0 && rfInstance) {
      setTimeout(() => rfInstance.fitView({ padding: 0.3 }), 50)
    }
  }, [nodes.length, rfInstance])

  const onInit = useCallback((instance) => {
    setRfInstance(instance)
  }, [])

  return (
    <section className="h-full flex flex-col overflow-hidden rounded-xl border border-[rgba(168,196,101,0.2)] bg-[#111111]">
      <div className="flex items-center justify-between border-b border-[rgba(168,196,101,0.2)] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Service Topology</h2>
          <p className="text-xs text-[#555555]">
            {topology ? 'Istio telemetry from Prometheus' : 'No topology data available'}
          </p>
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
          <div className="grid h-full place-items-center text-xs text-[#555555] p-4 text-center">
            <div>
              <p className="mb-2">No service topology detected.</p>
              <p className="text-[11px]">Ensure Istio is injected and Prometheus is reachable at the configured URL.</p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onInit={onInit}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.3}
            maxZoom={2.5}
            nodesDraggable={false}
            nodesConnectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="rgba(255,255,255,0.04)" gap={20} size={1} />
            <Controls position="bottom-right" showInteractive={false} />
          </ReactFlow>
        )}
      </div>
    </section>
  )
}