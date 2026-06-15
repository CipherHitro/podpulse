"""Service for discovering service-to-service topology via Istio + Prometheus."""

import httpx

from app.config import settings
from app.models.topology import TopologyNode, TopologyEdge, TopologyResponse

# Workloads to filter out (internal Istio / envoy)
_IGNORED_WORKLOADS = frozenset({
    "unknown",
    "PassthroughCluster",
    "BlackHoleCluster",
})

# Include namespace labels so each node gets its correct namespace
PROMETHEUS_QUERY = (
    'sum by (source_workload, source_workload_namespace, '
    'destination_workload, destination_workload_namespace) ('
    'rate(istio_requests_total{reporter="source"}[1m])'
    ')'
)

class TopologyService:
    """Fetches and parses Istio telemetry from Prometheus to build a service graph."""

    @classmethod
    async def fetch_topology(cls) -> TopologyResponse:
        """Query Prometheus and build a topology graph from Istio request metrics."""
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
            return cls._parse_prometheus_response(data)

    @classmethod
    def _parse_prometheus_response(cls, raw: dict) -> TopologyResponse:
        """Convert the Prometheus JSON result into a TopologyResponse."""
        nodes_map: dict[str, TopologyNode] = {}
        edges: list[TopologyEdge] = []
        seen_edges: set[tuple[str, str]] = set()

        results = raw.get("data", {}).get("result", [])

        for item in results:
            metric = item.get("metric", {})
            source = metric.get("source_workload", "")
            dest = metric.get("destination_workload", "")
            source_ns = metric.get("source_workload_namespace", "")
            dest_ns = metric.get("destination_workload_namespace", "")

            # Skip ignored workloads
            if source in _IGNORED_WORKLOADS or dest in _IGNORED_WORKLOADS:
                continue

            if not source or not dest:
                continue

            # Parse the rate value
            value_raw = item.get("value", [])
            if len(value_raw) < 2:
                continue

            try:
                rps = float(value_raw[1])
            except (ValueError, TypeError):
                continue

            # Deduplicate nodes with correct namespaces
            if source not in nodes_map:
                nodes_map[source] = TopologyNode(id=source, namespace=source_ns)
            if dest not in nodes_map:
                nodes_map[dest] = TopologyNode(id=dest, namespace=dest_ns)

            # Deduplicate edges
            edge_key = (source, dest)
            if edge_key not in seen_edges:
                seen_edges.add(edge_key)
                edges.append(TopologyEdge(
                    source=source,
                    target=dest,
                    requests_per_sec=round(rps, 2),
                ))

        return TopologyResponse(
            nodes=sorted(nodes_map.values(), key=lambda n: n.id),
            edges=edges,
        )