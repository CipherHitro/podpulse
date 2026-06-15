"""Service for discovering service-to-service topology via Istio + Prometheus,
enriched with pod-level nodes from the Kubernetes API."""

import httpx

from app.config import settings
from app.models.topology import TopologyNode, TopologyEdge, TopologyResponse
from app.services.pod_service import PodService

# Workloads to filter out (internal Istio / envoy)
_IGNORED_WORKLOADS = frozenset({
    "unknown",
    "PassthroughCluster",
    "BlackHoleCluster",
})

PROMETHEUS_QUERY = (
    'sum by (source_workload, source_workload_namespace, '
    'destination_workload, destination_workload_namespace) ('
    'rate(istio_requests_total{reporter="source"}[1m])'
    ')'
)


class TopologyService:
    """Fetches and parses Istio telemetry from Prometheus, then enriches with
    pod-level nodes discovered from the Kubernetes API."""

    @classmethod
    async def fetch_topology(cls) -> TopologyResponse:
        """Query Prometheus, then enrich the graph with pod-level nodes."""
        url = f"{settings.prometheus_url}/api/v1/query"
        params = {"query": PROMETHEUS_QUERY}

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
            except httpx.RequestError as exc:
                raise RuntimeError(
                    f"Cannot reach Prometheus at {url}: {exc}"
                ) from exc
            except httpx.HTTPStatusError as exc:
                raise RuntimeError(
                    f"Prometheus returned HTTP {exc.response.status_code}: {exc.response.text}"
                ) from exc

            data = resp.json()
            return cls._build_enriched_topology(data)

    @classmethod
    def _parse_workload_name(cls, pod_name: str) -> str:
        """Extract the workload (deployment) name from a pod name.

        Kubernetes pods created by a Deployment follow the pattern:
        <deployment>-<replicaset-hash>-<pod-hash>
        
        We strip the last two hyphen-separated segments (hashes).
        If there aren't that many hyphens, return the full name.
        """
        parts = pod_name.rsplit("-", 2)
        if len(parts) == 3:
            return parts[0]
        return pod_name

    @classmethod
    def _build_enriched_topology(cls, raw: dict) -> TopologyResponse:
        """Build topology with service-level edges (from Prometheus)
        and pod-level nodes (from Kubernetes API)."""

        # ── 1. Parse Prometheus service-to-service data ──────────────
        nodes_map: dict[str, TopologyNode] = {}
        edges: list[TopologyEdge] = []
        seen_edges: set[tuple[str, str, str]] = set()  # (source, target, relation)

        results = raw.get("data", {}).get("result", [])

        for item in results:
            metric = item.get("metric", {})
            source = metric.get("source_workload", "")
            dest = metric.get("destination_workload", "")
            source_ns = metric.get("source_workload_namespace", "")
            dest_ns = metric.get("destination_workload_namespace", "")

            if source in _IGNORED_WORKLOADS or dest in _IGNORED_WORKLOADS:
                continue
            if not source or not dest:
                continue

            value_raw = item.get("value", [])
            if len(value_raw) < 2:
                continue
            try:
                rps = float(value_raw[1])
            except (ValueError, TypeError):
                continue

            # Add workload-level nodes
            for wl, ns in ((source, source_ns), (dest, dest_ns)):
                if wl not in nodes_map:
                    nodes_map[wl] = TopologyNode(id=wl, namespace=ns, type="deployment")

            # Add service-to-service edge
            edge_key = (source, dest, "traffic")
            if edge_key not in seen_edges:
                seen_edges.add(edge_key)
                edges.append(TopologyEdge(
                    source=source,
                    target=dest,
                    requests_per_sec=round(rps, 2),
                    relation="traffic",
                ))

        # ── 2. Fetch pods from Kubernetes and add pod-level nodes ─────
        try:
            cls._enrich_with_pods(nodes_map, edges, seen_edges)
        except Exception as e:
            print(f"Warning: Failed to enrich topology with pods: {e}")

        return TopologyResponse(
            nodes=sorted(nodes_map.values(), key=lambda n: (n.type, n.id)),
            edges=edges,
        )

    @classmethod
    def _enrich_with_pods(
        cls,
        nodes_map: dict[str, TopologyNode],
        edges: list[TopologyEdge],
        seen_edges: set[tuple[str, str, str]],
    ) -> None:
        """Add pod-level nodes and 'belongs_to' edges for each deployment."""
        pods_data = PodService.list_pods()
        pod_map: dict[str, list[str]] = {}  # workload -> list of pod IDs

        for pod in pods_data:
            # Map pod to its workload (deployment)
            workload = cls._parse_workload_name(pod.name)

            # We only care about pods whose workload is already a node in the graph
            if workload not in nodes_map:
                continue

            # Add pod node
            pod_node_id = pod.name
            if pod_node_id not in nodes_map:
                nodes_map[pod_node_id] = TopologyNode(
                    id=pod_node_id,
                    namespace=pod.namespace,
                    type="pod",
                )

            # Add "belongs_to" edge: pod -> workload
            belongs_key = (pod_node_id, workload, "belongs_to")
            if belongs_key not in seen_edges:
                seen_edges.add(belongs_key)
                edges.append(TopologyEdge(
                    source=pod_node_id,
                    target=workload,
                    requests_per_sec=0.0,
                    relation="belongs_to",
                ))