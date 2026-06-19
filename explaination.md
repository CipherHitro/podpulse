# PodPulse Backend — Complete Technical Explanation

**A deep dive into how the backend works: architecture, data flow, Kubernetes integration, and every component explained.**

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Technologies & Tools Used](#2-technologies--tools-used)
3. [Project Structure](#3-project-structure)
4. [How It Connects to Kubernetes](#4-how-it-connects-to-kubernetes)
5. [Data Models (Pydantic Schemas)](#5-data-models-pydantic-schemas)
6. [Service Layer — Business Logic](#6-service-layer--business-logic)
7. [API Routes — What Happens When You Hit Each Endpoint](#7-api-routes--what-happens-when-you-hit-each-endpoint)
8. [Background Tasks — Real-Time Monitoring](#8-background-tasks--real-time-monitoring)
9. [Configuration System](#9-configuration-system)
10. [Data Flow — From Kubernetes to Frontend](#10-data-flow--from-kubernetes-to-frontend)
11. [How Each Feature Works](#11-how-each-feature-works)

---

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                             │
│                    http://localhost:5173                          │
│  • Polls backend every 10 seconds                                 │
│  • Displays charts, pod grid, events, insights                    │
└────────────────────────┬─────────────────────────────────────────┘
                         │ HTTP requests
┌────────────────────────▼─────────────────────────────────────────┐
│                      BACKEND (FastAPI)                            │
│                    http://localhost:5050                          │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Routers    │  │   Services   │  │    Models    │            │
│  │  (API layer) │─▶│  (Business   │─▶│  (Pydantic)  │            │
│  │              │  │    logic)    │  │              │            │
│  └──────────────┘  └──────┬───────┘  └──────────────┘            │
│                           │                                        │
│  ┌────────────────────────▼──────────────────────┐                │
│  │         Background Tasks (Async)              │                │
│  │  • EventService: Pod watch stream            │                │
│  │  • MetricsService: Periodic metrics collect   │                │
│  └───────────────────────────────────────────────┘                │
└────────────────────────┬─────────────────────────────────────────┘
                         │ Kubernetes Python SDK
┌────────────────────────▼─────────────────────────────────────────┐
│                   KUBERNETES CLUSTER                              │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Core API   │  │ metrics.k8s  │  │  Prometheus  │            │
│  │   (pods,     │  │  (CPU/mem    │  │  (Istio      │            │
│  │   events)    │  │   usage)     │  │  metrics)    │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└──────────────────────────────────────────────────────────────────┘
```


---

## 2. Technologies & Tools Used

### Core Framework
- **FastAPI** — Modern Python web framework for building APIs
  - Fast, automatic API docs, type validation
  - Built on Starlette (ASGI) + Pydantic
  
- **Uvicorn** — ASGI server that runs the FastAPI app
  - Handles HTTP requests, async I/O

### Kubernetes Integration
- **kubernetes Python SDK** — Official Kubernetes client library
  - `CoreV1Api` — Access pods, nodes, services, events
  - `CustomObjectsApi` — Access custom resources like metrics.k8s.io
  - `watch.Watch()` — Stream real-time Kubernetes events

### Data Validation
- **Pydantic** — Data validation using Python type hints
  - All API responses are Pydantic models
  - Automatic JSON serialization

### Configuration
- **pydantic-settings** — Environment variable management
  - All settings start with `PODPULSE_` prefix
  - Type-safe config with defaults

### HTTP Client
- **httpx** — Async HTTP client for calling Prometheus API
  - Used to query Istio metrics

### Package Management
- **uv** — Fast Python package manager
  - Manages dependencies in `pyproject.toml`
  - Creates isolated virtual environment


---

## 3. Project Structure

```
backend/
│
├── run.py                      # Entry point — starts Uvicorn server
├── pyproject.toml              # Project dependencies (managed by uv)
├── uv.lock                     # Locked dependency versions
│
└── app/                        # Main application package
    │
    ├── main.py                 # FastAPI app instance, startup/shutdown
    ├── config.py               # Settings class (env variables)
    │
    ├── models/                 # Data schemas (Pydantic models)
    │   ├── __init__.py
    │   ├── pod.py              # Pod, PodMetrics
    │   ├── event.py            # PodEvent
    │   ├── metric.py           # MetricSnapshot, MetricResponse
    │   ├── insight.py          # Insight
    │   └── topology.py         # TopologyNode, TopologyEdge
    │
    ├── services/               # Business logic layer
    │   ├── __init__.py
    │   ├── kube_client.py      # Kubernetes client provider (singleton)
    │   ├── pod_service.py      # Pod operations, metrics fetching
    │   ├── event_service.py    # Real-time event watching
    │   ├── metrics_service.py  # Periodic metrics collection
    │   ├── insight_service.py  # Insight generation
    │   └── topology_service.py # Service topology from Istio
    │
    ├── routers/                # API endpoint handlers
    │   ├── __init__.py
    │   ├── pods.py             # /api/pods endpoints
    │   ├── events.py           # /api/events
    │   ├── metrics.py          # /api/metrics
    │   ├── insights.py         # /api/insights
    │   └── topology.py         # /api/topology
    │
    └── core/                   # Shared utilities
        ├── __init__.py
        ├── state.py            # In-memory data store (thread-safe)
        └── utils.py            # Helper functions (parsers, status logic)
```


---

## 4. How It Connects to Kubernetes

### 4.1 The kubeconfig File

Kubernetes uses a **kubeconfig** file to store cluster connection info. Default location: `~/.kube/config`

**What's inside:**
```yaml
apiVersion: v1
clusters:
- cluster:
    server: https://192.168.49.2:8443  # Cluster API server URL
    certificate-authority: /path/to/ca.crt
  name: minikube
contexts:
- context:
    cluster: minikube
    user: minikube
  name: minikube
current-context: minikube
users:
- name: minikube
  user:
    client-certificate: /path/to/client.crt
    client-key: /path/to/client.key
```

### 4.2 How the Backend Loads This Config

**File:** `backend/app/services/kube_client.py`

```python
from kubernetes import client, config

class KubernetesClientProvider:
    def __init__(self):
        self._initialized = False
        self._v1 = None
        self._custom_api = None

    def _ensure_initialized(self):
        if self._initialized:
            return
        try:
            # This line reads ~/.kube/config automatically
            config.load_kube_config()
        except Exception as e:
            print("Warning: Failed to load kube config:", e)
        
        # Create API client instances
        self._v1 = client.CoreV1Api()
        self._custom_api = client.CustomObjectsApi()
        self._initialized = True
```

**What happens:**
1. `config.load_kube_config()` reads `~/.kube/config`
2. Extracts cluster URL, certificates, auth tokens
3. Creates authenticated HTTP client
4. Returns API client objects that can make requests to Kubernetes


### 4.3 Two Main Kubernetes APIs Used

#### CoreV1Api — Standard Kubernetes Resources

**Used for:**
- Listing pods: `v1.list_pod_for_all_namespaces()`
- Getting pod details: `v1.read_namespaced_pod(name, namespace)`
- Deleting pods: `v1.delete_namespaced_pod(name, namespace)`
- Watching events: `watch.Watch().stream(v1.list_pod_for_all_namespaces)`

#### CustomObjectsApi — Custom Resources

**Used for:**
- Fetching pod metrics: `custom_api.list_cluster_custom_object("metrics.k8s.io", "v1beta1", "pods")`

**Why separate?** `metrics.k8s.io` is a custom API extension, not part of core Kubernetes.

### 4.4 Singleton Pattern

The backend uses a **singleton** to avoid creating multiple Kubernetes clients:

```python
# In kube_client.py
_kube_provider = KubernetesClientProvider()  # Created once

def get_kube_client():
    return _kube_provider.v1  # Reused everywhere
```

**Why?** Each client holds connections, auth state. Creating multiple wastes resources.


---

## 5. Data Models (Pydantic Schemas)

Pydantic models define the **shape of data** that flows through the API. They provide:
- Automatic validation
- JSON serialization
- Type hints for IDE autocomplete

### 5.1 Pod Model (`models/pod.py`)

```python
class Pod(BaseModel):
    id: str               # Pod name
    name: str             # Pod name (same as id)
    namespace: str        # Which namespace the pod is in
    status: str           # "healthy" | "warning" | "critical"
    cpu: Optional[float]  # CPU usage percentage
    memory: Optional[float]  # Memory usage percentage
    cpuCores: Optional[float]  # CPU in cores (e.g., 0.25 = 250m)
    memoryMiB: Optional[float]  # Memory in MiB
    hasLimits: bool       # Does pod have resource limits set?
    restarts: int         # Container restart count
    node: str             # Which node the pod is on
    age: str              # Human-readable age (e.g., "2h", "5m")
    phase: str            # "Running" | "Pending" | "Failed" | etc.
```

**Where it's used:**
- Response from `GET /api/pods`
- Input to insight generation
- Displayed in frontend pod grid


### 5.2 PodEvent Model (`models/event.py`)

```python
class PodEvent(BaseModel):
    id: str               # Unique event ID
    time: str             # Timestamp (HH:MM:SS)
    severity: str         # "info" | "warning" | "critical"
    description: str      # Human-readable event message
```

**Example:**
```json
{
  "id": "1718717859-nginx-deployment-abc123",
  "time": "14:24:19",
  "severity": "critical",
  "description": "Pod default/nginx-deployment-abc123 state update: phase Failed, restarts 5."
}
```

### 5.3 MetricSnapshot Model (`models/metric.py`)

```python
class MetricSnapshot(BaseModel):
    time: str                        # Timestamp (HH:MM)
    memory: dict[str, float]         # {pod_name: memory%}
    cpu: dict[str, float]            # {pod_name: cpu%}
    memoryMiB: dict[str, float]      # {pod_name: memory_MiB}
    cpuCores: dict[str, float]       # {pod_name: cpu_cores}
```

**Example:**
```json
{
  "time": "14:25",
  "memory": {"nginx-abc": 45.2, "redis-xyz": 78.9},
  "cpu": {"nginx-abc": 12.5, "redis-xyz": 34.1}
}
```


### 5.4 Insight Model (`models/insight.py`)

```python
class Insight(BaseModel):
    id: int                    # Insight ID
    severity: str              # "warning" | "critical"
    title: str                 # Brief title
    rootCause: str             # Pod name causing issue
    summary: str               # Detailed description
    evidence: list[str]        # List of evidence items
    impact: list[str]          # Downstream affected pods
    recommendation: str        # Suggested kubectl command
    timeToOOM: Optional[str]   # Time until out-of-memory (if applicable)
    confidence: Optional[int]  # Confidence percentage
    active: bool               # Is this insight still relevant?
    resolved: bool             # Has this been fixed?
```

### 5.5 Topology Models (`models/topology.py`)

```python
class TopologyNode(BaseModel):
    id: str           # Node identifier (deployment or pod name)
    namespace: str    # Kubernetes namespace
    type: str         # "deployment" | "pod"

class TopologyEdge(BaseModel):
    source: str            # Source node ID
    target: str            # Target node ID
    requests_per_sec: float  # Traffic rate (from Istio)
    relation: str          # "traffic" | "belongs_to"

class TopologyResponse(BaseModel):
    nodes: list[TopologyNode]
    edges: list[TopologyEdge]
```


---

## 6. Service Layer — Business Logic

Services contain the core logic. Routers call services, services call Kubernetes APIs.

### 6.1 PodService (`services/pod_service.py`)

**Purpose:** Fetch and process pod data from Kubernetes

**Key Methods:**

#### `list_pods(include_system=False)` → `list[Pod]`

**What it does:**
1. Calls `v1.list_pod_for_all_namespaces()` to get all pods
2. Filters out system namespaces if `include_system=False`
3. Calls `_fetch_pod_metrics()` to get CPU/memory data
4. For each pod:
   - Parses CPU/memory usage
   - Computes health status (healthy/warning/critical)
   - Calculates age
   - Counts restarts
5. Returns list of `Pod` objects

**Status Logic (`core/utils.py`):**
```python
def get_pod_status_and_phase(pod):
    phase = pod.status.phase
    
    # Critical if:
    # - Phase is Failed
    # - Container is in CrashLoopBackOff
    # - Container is in ImagePullBackOff
    
    # Warning if:
    # - Phase is Pending
    # - Pod is being deleted
    # - Restarts > 0
    
    # Healthy if:
    # - Phase is Running and no issues
```


#### `_fetch_pod_metrics()` → `dict`

**What it does:**
1. Calls `custom_api.list_cluster_custom_object("metrics.k8s.io", "v1beta1", "pods")`
2. Returns a dict mapping `(namespace, pod_name)` → metrics data
3. If metrics-server isn't installed, catches exception and returns empty dict

**Metrics Format:**
```json
{
  "kind": "PodMetricsList",
  "items": [
    {
      "metadata": {"name": "nginx", "namespace": "default"},
      "containers": [
        {
          "name": "nginx",
          "usage": {
            "cpu": "50m",      # 50 millicores
            "memory": "128Mi"  # 128 mebibytes
          }
        }
      ]
    }
  ]
}
```

#### `delete_pod(namespace, name)` → `None`

**What it does:**
Calls `v1.delete_namespaced_pod(name, namespace)` to delete (restart) a pod.

**Why delete = restart?** Kubernetes controllers (Deployments, StatefulSets) automatically recreate deleted pods.


### 6.2 EventService (`services/event_service.py`)

**Purpose:** Watch Kubernetes pod events in real-time and maintain an event log

**How It Works:**

#### Background Watch Loop

```python
async def watch_loop(cls):
    while True:
        try:
            await asyncio.to_thread(cls._run_watch_stream)
        except Exception as e:
            print(f"Error: {e}. Retrying in 5s...")
            await asyncio.sleep(5)
```

**What happens:**
1. `watch.Watch().stream(v1.list_pod_for_all_namespaces)` opens a long-lived HTTP connection
2. Kubernetes streams events as they happen: `ADDED`, `MODIFIED`, `DELETED`
3. For each event:
   - Extract pod name, namespace, phase, restarts
   - Assign severity based on status
   - Create `PodEvent` object
   - Store in `app_state` (in-memory deque)
4. If connection breaks, reconnect automatically

**Severity Assignment:**
```python
severity = "info"

# Check container states
for container_status in pod.status.container_statuses:
    if container_status.state.waiting:
        reason = container_status.state.waiting.reason
        if reason in ["CrashLoopBackOff", "ImagePullBackOff", "ErrImagePull"]:
            severity = "critical"

# Check pod phase
if pod.status.phase == "Failed":
    severity = "critical"
elif pod.status.phase == "Pending" or pod.metadata.deletion_timestamp:
    severity = "warning"
elif restarts > 0:
    severity = "warning"
```


### 6.3 MetricsService (`services/metrics_service.py`)

**Purpose:** Periodically collect metrics snapshots for historical charts

**How It Works:**

#### Background Collection Loop

```python
async def collect_loop(cls):
    while True:
        try:
            # Get current pod data
            pods_data = PodService.list_pods(include_system=False)
            now_str = datetime.now().strftime("%H:%M")
            
            # Build snapshot
            snapshot = MetricSnapshot(
                time=now_str,
                memory={pod.name: pod.memory for pod in pods_data if pod.memory},
                cpu={pod.name: pod.cpu for pod in pods_data if pod.cpu}
            )
            
            # Store in app_state
            app_state.add_metric_snapshot(snapshot)
        except Exception as e:
            print("Error:", e)
        
        # Sleep for configured interval (default: 15 seconds)
        await asyncio.sleep(settings.metrics_loop_interval)
```

**Storage:**
- Snapshots stored in a `deque` with max length 10
- Old snapshots automatically dropped when full
- Thread-safe access via `threading.Lock`


### 6.4 InsightService (`services/insight_service.py`)

**Purpose:** Generate AI-style insights for unhealthy pods

**How It Works:**

```python
def get_insights(cls) -> list[Insight]:
    # 1. Get all pods (excluding system namespaces)
    pods_data = PodService.list_pods(include_system=False)
    
    # 2. Filter to unhealthy pods
    unhealthy_pods = [
        pod for pod in pods_data 
        if pod.status in ("critical", "warning")
    ]
    
    # 3. Generate an insight for each unhealthy pod
    insights = []
    for pod in unhealthy_pods:
        insights.append(Insight(
            id=len(insights) + 1,
            severity=pod.status,
            title=f"{pod.status.title()} Pod - {pod.name}",
            rootCause=pod.id,
            summary=f"Pod {pod.namespace}/{pod.name} is in phase {pod.phase}",
            evidence=[
                f"Phase: {pod.phase}",
                f"Restarts count: {pod.restarts}",
                f"Node: {pod.node}",
                f"Age: {pod.age}"
            ],
            impact=[],  # Could be enhanced with dependency analysis
            recommendation=f"kubectl describe pod {pod.name} -n {pod.namespace}",
            confidence=None,
            active=True,
            resolved=False
        ))
    
    return insights
```

**Current Logic:** Simple rule-based. Could be enhanced with:
- ML-based anomaly detection
- Historical pattern analysis
- Dependency impact calculation


### 6.5 TopologyService (`services/topology_service.py`)

**Purpose:** Build service dependency graph from Kubernetes + Istio metrics

**How It Works:**

#### Step 1: Build Kubernetes Topology (Always)

```python
def _build_k8s_topology(cls):
    nodes_map = {}
    edges = []
    
    # Get all pods
    pods_data = PodService.list_pods(include_system=False)
    
    for pod in pods_data:
        # Extract deployment name from pod name
        # e.g., "nginx-deployment-abc123-xyz" → "nginx-deployment"
        workload = cls._parse_workload_name(pod.name)
        
        # Add deployment node
        if workload not in nodes_map:
            nodes_map[workload] = TopologyNode(
                id=workload,
                namespace=pod.namespace,
                type="deployment"
            )
        
        # Add pod node
        nodes_map[pod.name] = TopologyNode(
            id=pod.name,
            namespace=pod.namespace,
            type="pod"
        )
        
        # Add edge: pod → deployment
        edges.append(TopologyEdge(
            source=pod.name,
            target=workload,
            relation="belongs_to"
        ))
    
    return nodes_map, edges
```


#### Step 2: Overlay Istio Traffic (Optional)

```python
async def _query_prometheus(cls):
    url = f"{settings.prometheus_url}/api/v1/query"
    params = {
        "query": """
            sum by (source_workload, source_workload_namespace,
                    destination_workload, destination_workload_namespace) (
                rate(istio_requests_total{reporter="source"}[1m])
            )
        """
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params)
        return resp.json()
```

**Prometheus Response:**
```json
{
  "data": {
    "result": [
      {
        "metric": {
          "source_workload": "api-gateway",
          "destination_workload": "user-service",
          "source_workload_namespace": "default",
          "destination_workload_namespace": "default"
        },
        "value": [1718717859, "12.5"]  // [timestamp, requests/sec]
      }
    ]
  }
}
```

**Processing:**
```python
def _overlay_istio_edges(cls, prometheus_data, nodes_map, edges):
    for result in prometheus_data["data"]["result"]:
        metric = result["metric"]
        source = metric["source_workload"]
        target = metric["destination_workload"]
        rps = float(result["value"][1])
        
        # Add traffic edge
        edges.append(TopologyEdge(
            source=source,
            target=target,
            requests_per_sec=rps,
            relation="traffic"
        ))
```


---

## 7. API Routes — What Happens When You Hit Each Endpoint

Routes are the entry points. They call services and return JSON responses.

### 7.1 `GET /api/pods` (`routers/pods.py`)

**Request:**
```
GET /api/pods?include_system=false
```

**Handler:**
```python
@router.get("", response_model=list[Pod])
def get_pods(include_system: bool = False):
    try:
        pods = PodService.list_pods(include_system=include_system)
        return pods
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
```

**Flow:**
1. Frontend sends request
2. FastAPI extracts `include_system` query param
3. Calls `PodService.list_pods(include_system)`
4. PodService:
   - Calls Kubernetes `list_pod_for_all_namespaces()`
   - Fetches metrics from `metrics.k8s.io`
   - Computes status for each pod
   - Returns `list[Pod]`
5. FastAPI serializes to JSON
6. Frontend receives response

**Response:**
```json
[
  {
    "id": "nginx-abc123",
    "name": "nginx-abc123",
    "namespace": "default",
    "status": "healthy",
    "cpu": 12.5,
    "memory": 45.2,
    "restarts": 0,
    "phase": "Running",
    "age": "2h"
  }
]
```


### 7.2 `POST /api/pods/{namespace}/{name}/restart` (`routers/pods.py`)

**Request:**
```
POST /api/pods/default/nginx-abc123/restart
```

**Handler:**
```python
@router.post("/{namespace}/{name}/restart")
def restart_pod(namespace: str, name: str):
    try:
        PodService.delete_pod(namespace, name)
        return {"status": "deleted", "pod": name}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
```

**Flow:**
1. Frontend sends POST request
2. FastAPI extracts `namespace` and `name` from URL path
3. Calls `PodService.delete_pod(namespace, name)`
4. PodService calls Kubernetes `delete_namespaced_pod()`
5. Kubernetes deletes the pod
6. Deployment controller sees missing pod, creates a new one
7. Returns success response

**Response:**
```json
{
  "status": "deleted",
  "pod": "nginx-abc123"
}
```


### 7.3 `GET /api/events` (`routers/events.py`)

**Request:**
```
GET /api/events
```

**Handler:**
```python
@router.get("", response_model=list[PodEvent])
def get_events():
    return EventService.get_events()
```

**Flow:**
1. Frontend polls this endpoint every 10 seconds
2. Calls `EventService.get_events()`
3. EventService returns events from in-memory `app_state.events` deque
4. Returns up to 100 most recent events

**Response:**
```json
[
  {
    "id": "1718717859-nginx-abc123",
    "time": "14:24:19",
    "severity": "critical",
    "description": "Pod default/nginx-abc123 state update: phase Failed"
  },
  {
    "id": "1718717860-redis-xyz789",
    "time": "14:24:20",
    "severity": "info",
    "description": "New Pod default/redis-xyz789 added in phase Running"
  }
]
```

**Data Source:** Background `EventService.watch_loop()` task that streams from Kubernetes.


### 7.4 `GET /api/metrics` (`routers/metrics.py`)

**Request:**
```
GET /api/metrics
```

**Handler:**
```python
@router.get("", response_model=MetricResponse)
def get_metrics():
    return MetricsService.get_metrics_data()
```

**Flow:**
1. Frontend polls this every 10 seconds for chart data
2. Calls `MetricsService.get_metrics_data()`
3. Retrieves stored snapshots from `app_state.metrics_history`
4. Formats data for Recharts (time-series format)

**Response:**
```json
{
  "memoryData": [
    {"time": "14:20", "nginx-abc": 45.2, "redis-xyz": 78.9},
    {"time": "14:21", "nginx-abc": 46.1, "redis-xyz": 79.2}
  ],
  "cpuData": [
    {"time": "14:20", "nginx-abc": 12.5, "redis-xyz": 34.1},
    {"time": "14:21", "nginx-abc": 13.2, "redis-xyz": 35.4}
  ],
  "pvcData": [],
  "networkData": []
}
```

**Data Source:** Background `MetricsService.collect_loop()` task that runs every 15 seconds.


### 7.5 `GET /api/insights` (`routers/insights.py`)

**Request:**
```
GET /api/insights
```

**Handler:**
```python
@router.get("", response_model=list[Insight])
def get_insights():
    try:
        insights = InsightService.get_insights()
        return insights
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
```

**Flow:**
1. Frontend polls this every 10 seconds
2. Calls `InsightService.get_insights()`
3. InsightService:
   - Gets current pods from `PodService.list_pods()`
   - Filters to unhealthy pods (`status in ["warning", "critical"]`)
   - Generates one insight per unhealthy pod
4. Returns insights

**Response:**
```json
[
  {
    "id": 1,
    "severity": "critical",
    "title": "Critical Pod - nginx-abc123",
    "rootCause": "nginx-abc123",
    "summary": "Pod default/nginx-abc123 is in phase Failed with status critical.",
    "evidence": [
      "Phase: Failed",
      "Restarts count: 5",
      "Node: minikube",
      "Age: 2h"
    ],
    "impact": [],
    "recommendation": "kubectl describe pod nginx-abc123 -n default",
    "active": true,
    "resolved": false
  }
]
```


### 7.6 `GET /api/topology` (`routers/topology.py`)

**Request:**
```
GET /api/topology
```

**Handler:**
```python
@router.get("", response_model=TopologyResponse)
async def get_topology():
    try:
        topology = await TopologyService.fetch_topology()
        return topology
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
```

**Flow:**
1. Frontend requests topology data
2. Calls `TopologyService.fetch_topology()` (async)
3. TopologyService:
   - **Step 1:** Builds base graph from Kubernetes pods (always works)
   - **Step 2:** Tries to query Prometheus for Istio metrics (optional)
   - If Prometheus fails, returns Kubernetes-only graph
4. Returns topology with nodes + edges

**Response:**
```json
{
  "nodes": [
    {"id": "api-gateway", "namespace": "default", "type": "deployment"},
    {"id": "user-service", "namespace": "default", "type": "deployment"},
    {"id": "api-gateway-abc123", "namespace": "default", "type": "pod"},
    {"id": "user-service-xyz789", "namespace": "default", "type": "pod"}
  ],
  "edges": [
    {"source": "api-gateway-abc123", "target": "api-gateway", "relation": "belongs_to"},
    {"source": "api-gateway", "target": "user-service", "requests_per_sec": 12.5, "relation": "traffic"}
  ]
}
```


---

## 8. Background Tasks — Real-Time Monitoring

### 8.1 Application Lifespan

**File:** `app/main.py`

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background tasks on startup and clean up on shutdown."""
    print("PodPulse API Startup: Launching background tasks...")
    
    # Start two background tasks
    watch_task = asyncio.create_task(EventService.watch_loop())
    metrics_task = asyncio.create_task(MetricsService.collect_loop())
    
    yield  # Application runs here
    
    print("PodPulse API Shutdown: Stopping background tasks...")
    EventService.stop_watch()
    watch_task.cancel()
    metrics_task.cancel()
    
    # Wait for tasks to finish (with timeout)
    for task in (watch_task, metrics_task):
        try:
            await asyncio.wait_for(task, timeout=5)
        except (asyncio.CancelledError, asyncio.TimeoutError):
            pass

app = FastAPI(title=settings.app_title, lifespan=lifespan)
```

**What happens:**
1. Server starts
2. `lifespan` context manager enters
3. Two async tasks launched in background
4. Server handles HTTP requests
5. On shutdown (Ctrl+C):
   - `lifespan` context manager exits
   - Tasks cancelled gracefully
   - Server shuts down


### 8.2 Event Watch Task

**Runs continuously, streams Kubernetes events**

```
Server Starts
      ↓
EventService.watch_loop()
      ↓
Opens watch stream to Kubernetes
      ↓
┌──────────────────────┐
│  Infinite Loop       │
│                      │
│  Wait for event... ──┼─→ Pod created/modified/deleted
│         ↓            │
│  Parse event data    │
│         ↓            │
│  Assign severity     │
│         ↓            │
│  Store in app_state  │
│         ↓            │
│  Loop continues...   │
└──────────────────────┘
      ↓
Connection breaks
      ↓
Retry after 5 seconds
```

**Thread Safety:**
- Uses `threading.Lock` in `app_state` to prevent race conditions
- Multiple threads can read/write events safely


### 8.3 Metrics Collection Task

**Runs every 15 seconds (configurable)**

```
Server Starts
      ↓
MetricsService.collect_loop()
      ↓
┌──────────────────────────┐
│  Infinite Loop           │
│                          │
│  Get all pods            │
│         ↓                │
│  Extract CPU/memory      │
│         ↓                │
│  Create MetricSnapshot   │
│         ↓                │
│  Store in app_state      │
│         ↓                │
│  Sleep 15 seconds        │
│         ↓                │
│  Loop continues...       │
└──────────────────────────┘
```

**Storage Details:**
```python
# In core/state.py
class AppState:
    def __init__(self):
        self._metrics = deque(maxlen=settings.max_metrics_history)
        self._lock = threading.Lock()
    
    def add_metric_snapshot(self, snapshot):
        with self._lock:
            self._metrics.append(snapshot)
            # Oldest snapshot automatically dropped if > maxlen
```


---

## 9. Configuration System

### 9.1 Settings Class (`config.py`)

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Kubernetes
    kube_config_file: str = ""
    include_system_namespaces: bool = False
    system_namespaces: set[str] = {"kube-system", "kubernetes-dashboard"}
    
    # Application
    app_title: str = "PodPulse API"
    cors_allow_origins: list[str] = ["*"]
    
    # Prometheus / Istio
    prometheus_url: str = "http://localhost:9090"
    
    # Background tasks
    metrics_loop_interval: int = 15
    max_events: int = 100
    max_metrics_history: int = 10
    
    # Server
    host: str = "127.0.0.1"
    port: int = 5050
    reload: bool = False
    
    model_config = {
        "env_prefix": "PODPULSE_",
        "case_sensitive": False,
        "extra": "ignore",
    }

settings = Settings()
```

### 9.2 How Environment Variables Work

**Prefix:** All env vars start with `PODPULSE_`

**Examples:**
```bash
export PODPULSE_PORT=8080
export PODPULSE_PROMETHEUS_URL="http://prometheus.monitoring:9090"
export PODPULSE_RELOAD=true
```

**Loading Order:**
1. Check environment variables first
2. Fall back to defaults in `Settings` class
3. Can also use `.env` file in `backend/` directory


---

## 10. Data Flow — From Kubernetes to Frontend

### Complete Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  User opens http://localhost:5173                                │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ Every 10 seconds, send 5 requests:
             │
             ├─→ GET /api/pods
             ├─→ GET /api/events
             ├─→ GET /api/metrics
             ├─→ GET /api/insights
             └─→ GET /api/topology
             │
┌────────────▼────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI)                           │
│                   http://localhost:5050                          │
│                                                                   │
│  Router receives request                                         │
│      ↓                                                            │
│  Calls Service method                                            │
│      ↓                                                            │
│  Service calls Kubernetes API or reads app_state                 │
│      ↓                                                            │
│  Data transformed to Pydantic model                              │
│      ↓                                                            │
│  FastAPI serializes to JSON                                      │
│      ↓                                                            │
│  Returns HTTP response                                           │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ Kubernetes Python SDK makes HTTP request
             │
┌────────────▼────────────────────────────────────────────────────┐
│                   KUBERNETES CLUSTER                             │
│                                                                   │
│  API Server receives request                                     │
│      ↓                                                            │
│  Authenticates using kubeconfig credentials                      │
│      ↓                                                            │
│  Queries etcd database                                           │
│      ↓                                                            │
│  Returns pod/metrics/event data                                  │
└─────────────────────────────────────────────────────────────────┘
```


### Example: GET /api/pods Request

**Step-by-step:**

```
1. Frontend JavaScript:
   fetch('http://localhost:5050/api/pods')

2. HTTP Request:
   GET /api/pods HTTP/1.1
   Host: localhost:5050

3. FastAPI Router (routers/pods.py):
   @router.get("")
   def get_pods():
       return PodService.list_pods()

4. PodService.list_pods():
   v1 = get_kube_client()
   pods_list = v1.list_pod_for_all_namespaces()
   
5. Kubernetes Python SDK:
   Makes HTTP request to Kubernetes API:
   GET https://192.168.49.2:8443/api/v1/pods
   Headers: Authorization: Bearer <token>

6. Kubernetes API Server:
   - Authenticates request
   - Queries etcd for pod data
   - Returns JSON:
   {
     "items": [
       {
         "metadata": {"name": "nginx-abc", "namespace": "default"},
         "status": {"phase": "Running"}
       }
     ]
   }

7. PodService processes data:
   - Fetches metrics from metrics.k8s.io
   - Computes status for each pod
   - Returns list[Pod]

8. FastAPI serializes:
   - Pydantic model → JSON
   - Adds CORS headers

9. HTTP Response:
   HTTP/1.1 200 OK
   Content-Type: application/json
   [{"id": "nginx-abc", "status": "healthy", ...}]

10. Frontend receives JSON:
    Updates React state → UI re-renders
```


---

## 11. How Each Feature Works

### 11.1 Live Pod Grid

**Frontend Component:** `PodGrid.jsx`

**Data Flow:**
1. Frontend polls `GET /api/pods` every 10 seconds
2. Backend calls `PodService.list_pods()`
3. For each pod:
   - Fetches from Kubernetes API
   - Gets metrics from `metrics.k8s.io`
   - Computes health status
4. Returns array of pods with:
   - Name, namespace, status (healthy/warning/critical)
   - CPU/memory usage percentages
   - Restart count, age, phase
5. Frontend displays as color-coded grid:
   - Green = healthy
   - Yellow = warning
   - Red = critical

**Status Computation Logic:**

```python
# In core/utils.py
def get_pod_status_and_phase(pod):
    phase = pod.status.phase
    restarts = sum(c.restart_count for c in pod.status.container_statuses)
    
    # Critical conditions
    if phase == "Failed":
        return "critical", phase, restarts
    
    for container in pod.status.container_statuses:
        if container.state.waiting:
            reason = container.state.waiting.reason
            if reason in ["CrashLoopBackOff", "ImagePullBackOff", "ErrImagePull"]:
                return "critical", phase, restarts
    
    # Warning conditions
    if phase == "Pending":
        return "warning", phase, restarts
    
    if pod.metadata.deletion_timestamp:
        return "warning", phase, restarts
    
    if restarts > 0:
        return "warning", phase, restarts
    
    # Default: healthy
    return "healthy", phase, restarts
```


### 11.2 CPU/Memory Charts

**Frontend Component:** `ResourceCharts.jsx` (uses Recharts library)

**Data Flow:**
1. Background task `MetricsService.collect_loop()` runs every 15 seconds
2. Collects CPU/memory for all pods
3. Stores snapshots in `app_state.metrics_history` (max 10)
4. Frontend polls `GET /api/metrics` every 10 seconds
5. Backend returns time-series data:
```json
{
  "memoryData": [
    {"time": "14:20", "nginx": 45.2, "redis": 78.9},
    {"time": "14:21", "nginx": 46.1, "redis": 79.2}
  ]
}
```
6. Frontend renders line charts with Recharts

**Metrics Parsing:**

```python
# In core/utils.py
def parse_memory(mem_str):
    """Convert '128Mi' to MiB float"""
    if mem_str.endswith('Ki'):
        return float(mem_str[:-2]) / 1024
    elif mem_str.endswith('Mi'):
        return float(mem_str[:-2])
    elif mem_str.endswith('Gi'):
        return float(mem_str[:-2]) * 1024

def parse_cpu(cpu_str):
    """Convert '500m' to cores (0.5)"""
    if cpu_str.endswith('m'):
        return float(cpu_str[:-1]) / 1000
    else:
        return float(cpu_str)
```


### 11.3 Live Event Stream

**Frontend Component:** `LiveEventLog.jsx`

**Data Flow:**
1. Background task `EventService.watch_loop()` runs continuously
2. Streams events from Kubernetes in real-time
3. For each event (ADDED/MODIFIED/DELETED):
   - Parse pod details
   - Assign severity
   - Store in `app_state.events` deque (max 100)
4. Frontend polls `GET /api/events` every 10 seconds
5. Receives newest events first (sorted by timestamp)
6. Displays with color-coded severity badges

**Event Detection:**
```python
# In services/event_service.py
for event in watch.Watch().stream(v1.list_pod_for_all_namespaces):
    event_type = event["type"]  # ADDED, MODIFIED, DELETED
    pod = event["object"]
    
    if event_type == "DELETED":
        description = f"Pod {namespace}/{name} deleted from cluster."
        severity = "warning"
    
    elif event_type == "ADDED":
        description = f"New Pod {namespace}/{name} added in phase {phase}."
        severity = "info"
    
    else:  # MODIFIED
        # Check if pod is in a bad state
        if phase == "Failed" or "CrashLoopBackOff" in container states:
            severity = "critical"
```


### 11.4 AI Insights

**Frontend Component:** `AIInsightCard.jsx`

**Data Flow:**
1. Frontend polls `GET /api/insights` every 10 seconds
2. Backend calls `InsightService.get_insights()`
3. Logic:
   - Get all pods
   - Filter to `status in ["warning", "critical"]`
   - Generate insight for each unhealthy pod
   - Include evidence, recommendation
4. Frontend displays as expandable cards
5. User can click "Apply Fix" → sends `POST /api/pods/{ns}/{name}/restart`

**Insight Generation:**
```python
# In services/insight_service.py
for pod in unhealthy_pods:
    insight = Insight(
        severity=pod.status,
        title=f"{pod.status.title()} Pod - {pod.name}",
        rootCause=pod.id,
        summary=f"Pod {pod.namespace}/{pod.name} is in phase {pod.phase}",
        evidence=[
            f"Phase: {pod.phase}",
            f"Restarts: {pod.restarts}",
            f"Node: {pod.node}",
            f"Age: {pod.age}"
        ],
        recommendation=f"kubectl describe pod {pod.name} -n {pod.namespace}"
    )
```

**Enhancement Opportunity:** Could add ML-based anomaly detection, pattern recognition, or dependency impact analysis.


### 11.5 Service Topology Graph

**Frontend Component:** `DependencyGraph.jsx` (uses ReactFlow + dagre)

**Data Flow:**
1. Frontend requests `GET /api/topology`
2. Backend calls `TopologyService.fetch_topology()`
3. **Step 1:** Build base graph from Kubernetes:
   - Get all pods
   - Group by deployment (extract from pod name)
   - Create deployment nodes and pod nodes
   - Add "belongs_to" edges (pod → deployment)
4. **Step 2:** Try to query Prometheus for Istio traffic:
   - Query: `rate(istio_requests_total[1m])`
   - Parse service-to-service traffic
   - Add "traffic" edges with requests/sec
5. Return combined graph
6. Frontend:
   - Uses dagre algorithm to layout nodes
   - Renders with ReactFlow
   - Shows deployment boxes containing pods
   - Shows traffic arrows between deployments

**Why It Always Shows Pods Now:**
- Old logic: Only built graph from Prometheus data (empty if no Istio)
- New logic: Always build from Kubernetes first, then overlay Istio traffic
- Result: Graph shows your pods even without Istio/Prometheus

**Workload Name Extraction:**
```python
def _parse_workload_name(pod_name: str) -> str:
    # Pod: "nginx-deployment-abc123-xyz789"
    # Deployment: "nginx-deployment"
    parts = pod_name.rsplit("-", 2)  # Split from right
    if len(parts) == 3:
        return parts[0]  # Return "nginx-deployment"
    return pod_name
```


---

## 12. Common Modifications & Where to Make Them

### Add a New API Endpoint

1. **Create route handler** in `routers/` (e.g., `routers/logs.py`):
```python
from fastapi import APIRouter
router = APIRouter(prefix="/api/logs", tags=["logs"])

@router.get("")
def get_logs():
    return {"logs": []}
```

2. **Register router** in `app/main.py`:
```python
from app.routers.logs import router as logs_router
app.include_router(logs_router)
```

3. **Add service logic** in `services/logs_service.py`
4. **Add data model** in `models/logs.py`

---

### Change Metrics Collection Interval

**File:** `backend/.env` or environment variable:
```bash
PODPULSE_METRICS_LOOP_INTERVAL=30  # Collect every 30 seconds instead of 15
```

---

### Add More Event Types

**File:** `services/event_service.py`

Modify the watch stream to include more resource types:
```python
# Current: only pods
watch.Watch().stream(v1.list_pod_for_all_namespaces)

# Enhanced: watch deployments too
watch.Watch().stream(v1.list_deployment_for_all_namespaces)
```

---

### Customize Pod Status Logic

**File:** `core/utils.py`

Modify `get_pod_status_and_phase()` function to change when pods are marked critical/warning/healthy.

---

### Store Data in Database Instead of Memory

**Current:** Uses in-memory deques in `core/state.py`

**To change:**
1. Add database client (e.g., PostgreSQL, MongoDB)
2. Replace `AppState` methods with database queries
3. Modify services to write to DB instead of `app_state`


---

## 13. Summary: Key Takeaways

### Architecture
- **FastAPI** backend with async support
- **Kubernetes Python SDK** for cluster communication
- **Pydantic** for data validation
- **Background tasks** for real-time monitoring
- **In-memory storage** for events and metrics

### How It Gets Data
1. **kubeconfig** provides authentication to Kubernetes
2. **CoreV1Api** fetches pods, nodes, events
3. **CustomObjectsApi** fetches metrics from metrics-server
4. **watch.Watch()** streams real-time events
5. **httpx** queries Prometheus for Istio metrics

### Data Flow
```
Frontend polls every 10s
    ↓
FastAPI router
    ↓
Service layer (business logic)
    ↓
Kubernetes SDK
    ↓
Kubernetes API Server
    ↓
Returns data
    ↓
Service processes data
    ↓
Pydantic model
    ↓
JSON response
    ↓
Frontend updates UI
```

### Required Infrastructure
- **Must have:** Kubernetes cluster + kubectl configured
- **Recommended:** metrics-server (for CPU/memory charts)
- **Optional:** Istio + Prometheus (for topology graph)

### File Organization
- `main.py` — FastAPI app, startup/shutdown
- `routers/` — API endpoints
- `services/` — Business logic
- `models/` — Data schemas
- `core/` — Utilities and shared state
- `config.py` — Settings

Now you understand how the entire backend works! 🚀
