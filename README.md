# PodPulse

**AI-powered Kubernetes observability dashboard for campus services.**

PodPulse provides real-time monitoring, visualization, and intelligent insights for Kubernetes clusters. It combines a FastAPI backend with a React frontend to deliver a comprehensive pod health management experience.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)            │
│  React 19 · Tailwind CSS 4 · Recharts · ReactFlow    │
│  Polls: /api/pods, /api/events, /api/metrics,        │
│         /api/insights, /api/topology                  │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP (port 5050)
┌─────────────────────▼───────────────────────────────┐
│                  Backend (FastAPI)                    │
│  Python 3.13 · FastAPI · Uvicorn · kubernetes SDK    │
│  Background tasks: pod watch + metrics collection     │
│  Topology: Prometheus → Istio telemetry               │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│              Kubernetes Cluster                       │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │  CoreV1Api   │  │  metrics.k8s │                  │
│  │  (pods, etc) │  │  (CPU/mem)   │                  │
│  └──────────────┘  └──────────────┘                  │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │  Prometheus  │  │    Istio     │                  │
│  │  (telemetry) │  │  (sidecars)  │                  │
│  └──────────────┘  └──────────────┘                  │
└─────────────────────────────────────────────────────┘
```

---

## Features

### 📊 Real-Time Pod Monitoring
- **Live Pod Grid** — Color-coded pod health grid with critical/warning/healthy filtering
- **Service Topology Graph** — Interactive ReactFlow graph showing services and their pods, with Istio traffic edges (requests/sec) between deployments
- **Cluster Signal Strip** — At-a-glance KPIs: Cluster CPU, Cluster Memory, Healthy Pods, Restarts
- **Pod Details Modal** — Full-screen table view with search, status filters, progress bars, and "View Insight" actions

### 📈 Resource Metrics & Charts
- **Memory Usage Over Time** — Line chart (Recharts) tracking per-pod memory with reference thresholds
- **CPU Usage Over Time** — Line chart tracking per-pod CPU with reference thresholds
- **PVC I/O Latency** — Storage latency monitoring with alert thresholds
- **Network Requests** — Cluster ingress volume with requests vs errors overlay
- **Auto-scaling** — Charts animate on data refresh (10-second poll cycle)

### 🤖 AI-Powered Insights
- **Root Cause Cards** — Auto-generated insights for unhealthy pods with severity classification
- **Evidence Chain** — Structured evidence (phase, restarts, node, age) for each insight
- **Downstream Impact** — Affected pod relationships displayed inline
- **Confidence Scoring** — Insight confidence percentage with visual progress bars
- **Recommended Commands** — One-click copy of `kubectl describe` commands
- **Apply Fix** — Direct pod restart via API with real-time status feedback (Terminating → Running → Fixed)

### 📋 Live Event Log
- **Real-Time Event Stream** — Kubernetes pod watch events (ADDED, MODIFIED, DELETED) appear instantly
- **Severity Badging** — Color-coded severity (info / warning / critical)
- **Auto-Scroll** — Newest events appear at the top
- **Clear Log** — Manual log clearing

### 🎛️ Cluster Controls
- **System Pod Toggle** — Show/hide `kube-system` and `kubernetes-dashboard` namespaces
- **Refresh Button** — Manual data refresh
- **Auto-Refresh** — 10-second polling for pods/events/insights, 15-second metrics collection
- **Last Scan Timer** — Visual indicator showing seconds since last successful data fetch

---

## Tech Stack

### Backend
| Component | Technology |
|-----------|-----------|
| Framework | [FastAPI](https://fastapi.tiangolo.com/) (Python 3.13) |
| Server | [Uvicorn](https://www.uvicorn.org/) on port 5050 |
| Package Manager | [uv](https://docs.astral.sh/uv/) |
| Kubernetes SDK | [kubernetes](https://github.com/kubernetes-client/python) |
| Config | [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) |
| HTTP Client | [httpx](https://www.python-httpx.org/) (for Prometheus queries) |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | [React 19](https://react.dev/) |
| Build Tool | [Vite 8](https://vitejs.dev/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Charts | [Recharts](https://recharts.org/) |
| Graph Visualization | [React Flow](https://reactflow.dev/) |
| Graph Layout | [dagre](https://github.com/dagrejs/dagre) |
| Icons | [Lucide React](https://lucide.dev/) |

---

## Backend Structure

```
backend/
├── pyproject.toml              # Project manifest (uv)
├── uv.lock                     # Locked dependency versions
├── run.py                      # Entry point
│
└── app/
    ├── main.py                 # FastAPI app, lifespan, CORS, router registration
    ├── config.py               # pydantic-settings (env-driven configuration)
    │
    ├── models/                 # Pydantic data schemas
    │   ├── pod.py              # Pod, PodMetrics, PodDetail
    │   ├── event.py            # PodEvent
    │   ├── metric.py           # MetricSnapshot, MetricResponse
    │   ├── insight.py          # Insight
    │   └── topology.py         # TopologyNode, TopologyEdge, TopologyResponse
    │
    ├── services/               # Business logic
    │   ├── kube_client.py      # Lazy Kubernetes client provider (singleton)
    │   ├── pod_service.py      # Pod listing, metrics, status computation
    │   ├── event_service.py    # Pod event watch loop (background thread)
    │   ├── metrics_service.py  # Periodic metrics collection (background task)
    │   ├── insight_service.py  # Insight/recommendation generation
    │   └── topology_service.py # Prometheus + Istio topology discovery
    │
    ├── core/                   # Shared utilities
    │   ├── state.py            # Thread-safe AppState (events + metrics history)
    │   └── utils.py            # parse_cpu, parse_memory, get_pod_status_and_phase
    │
    └── routers/                # API route handlers
        ├── pods.py             # GET /api/pods, POST /api/pods/*/restart
        ├── events.py           # GET /api/events
        ├── metrics.py          # GET /api/metrics
        ├── insights.py         # GET /api/insights
        └── topology.py         # GET /api/topology
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/pods?include_system=false` | List all pods with metrics and status |
| `POST` | `/api/pods/{namespace}/{name}/restart` | Delete and restart a pod |
| `GET` | `/api/events` | Live pod event log (newest first) |
| `GET` | `/api/metrics` | Historical metrics snapshots (memory, cpu) |
| `GET` | `/api/insights` | Generated insights for unhealthy pods |
| `GET` | `/api/topology` | Service topology graph from Istio + Prometheus |

---

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **[uv](https://docs.astral.sh/uv/)** (fast Python package manager, recommended)
- **A Kubernetes cluster** — one of:
  - [Minikube](https://minikube.sigs.k8s.io/docs/start/)
  - [kind](https://kind.sigs.k8s.io/)
  - [Docker Desktop Kubernetes](https://docs.docker.com/desktop/kubernetes/)
  - Any cloud Kubernetes cluster (EKS, GKE, AKS, etc.)

---

## Connecting to Your Kubernetes Cluster

### 1. Configure kubectl

PodPulse uses your **local kubectl configuration** to connect to the cluster. Ensure you have a working `kubectl` context:

```bash
# List available contexts
kubectl config get-contexts

# Set your active context
kubectl config use-context <your-cluster-context>

# Verify connection
kubectl get nodes
kubectl get pods -A
```

The backend automatically reads the kubeconfig from the default location (`~/.kube/config`). The Python Kubernetes SDK handles this transparently via `config.load_kube_config()`.

### 2. Install Metrics Server (Optional — for CPU/Memory data)

Without Metrics Server, pods still load and the dashboard works, but CPU/memory usage bars will be empty.

```bash
# Minikube
minikube addons enable metrics-server

# Generic cluster
kubectl apply -f \
  https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify
kubectl get deployment metrics-server -n kube-system
```

---

## Setting Up Istio + Prometheus (for Topology Graph)

The topology graph requires **Istio** service mesh with sidecar injection and **Prometheus** for telemetry storage.

### Option A: Install on a fresh cluster

```bash
# Download the latest Istio release
curl -L https://istio.io/downloadIstio | sh -
cd istio-*

# Install Istio with the demo profile (includes Prometheus, Kiali, Grafana)
./bin/istioctl install --set profile=demo -y

# Label your namespace for automatic sidecar injection
kubectl label namespace default istio-injection=enabled
kubectl label namespace podpulse istio-injection=enabled   # if using a custom namespace
```

### Option B: Verify existing Istio installation

```bash
# Check Istio is installed
kubectl get pods -n istio-system

# Check Prometheus is running
kubectl get pods -n istio-system | grep prometheus

# Verify Prometheus is reachable from within the cluster
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://prometheus.istio-system:9090/api/v1/query?query=up
```

### Required components for topology

| Component | Namespace | Purpose |
|-----------|-----------|---------|
| Istiod | `istio-system` | Istio control plane |
| Istio sidecars | Your app namespaces | Envoy proxies injected into pods |
| Prometheus | `istio-system` | Collects and stores Istio telemetry |
| Istio ingress/egress gateways | `istio-system` | (Optional) Traffic routing |

### Verify Istio sidecar injection

Pods must have an Istio sidecar (Envoy proxy) for traffic to be recorded:

```bash
# Check if your pods have 2/2 containers (app + sidecar)
kubectl get pods -n podpulse

# NAME                              READY   STATUS    RESTARTS
# api-gateway-66945485dc-crkpv      2/2     Running   0
# user-service-55cdf69f5d-54wp7     2/2     Running   0

# If you see 1/1, the sidecar is missing — inject it:
kubectl label namespace podpulse istio-injection=enabled --overwrite
kubectl rollout restart deployment -n podpulse
```

---

## How Prometheus Connection Works

The backend connects to **Prometheus inside the cluster** using the Kubernetes internal DNS name:

```
http://prometheus.istio-system:9090
```

### How it resolves

| Scenario | How Prometheus is reached |
|----------|---------------------------|
| Backend runs **inside** the cluster (as a pod) | Directly via internal DNS `prometheus.istio-system:9090` |
| Backend runs **outside** the cluster (localhost) | The backend is on your machine — it cannot resolve `prometheus.istio-system` because that's a Kubernetes internal DNS name |

### Running the backend outside the cluster

When running `python run.py` on your local machine, the topology API will fail to reach Prometheus because `prometheus.istio-system` only resolves inside the cluster.

**Solution — Port-forward Prometheus to localhost:**

```bash
# In a separate terminal, forward Prometheus to your machine
kubectl port-forward -n istio-system svc/prometheus 9090:9090

# Then update the backend config to point to localhost
# Either set env var:
$env:PODPULSE_PROMETHEUS_URL = "http://localhost:9090"

# Or edit backend/.env:
PODPULSE_PROMETHEUS_URL=http://localhost:9090

# Or update config.py directly for quick testing:
# prometheus_url: str = "http://localhost:9090"
```

Now the topology API can reach Prometheus via `localhost:9090`.

### Running the backend inside the cluster

For production, deploy the backend as a pod inside the cluster. The in-cluster DNS `prometheus.istio-system:9090` works automatically without port-forwarding.

---

## Getting Started

### Backend Setup

```bash
# Using uv (recommended)
cd backend
uv sync
uv run python run.py

# Using pip
cd backend
pip install -r requirements.txt
python run.py
```

The API will be available at `http://localhost:5050`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

---

## Environment Variables

All backend settings are configurable via environment variables with the `PODPULSE_` prefix:

| Variable | Default | Description |
|----------|---------|-------------|
| `PODPULSE_HOST` | `127.0.0.1` | Server bind address |
| `PODPULSE_PORT` | `5050` | Server port |
| `PODPULSE_RELOAD` | `false` | Enable hot-reload for development |
| `PODPULSE_PROMETHEUS_URL` | `http://prometheus.istio-system:9090` | Prometheus API endpoint |
| `PODPULSE_METRICS_LOOP_INTERVAL` | `15` | Metrics collection interval (seconds) |
| `PODPULSE_MAX_EVENTS` | `100` | Max events in the in-memory log |
| `PODPULSE_MAX_METRICS_HISTORY` | `10` | Max metrics snapshots stored |

You can create a `backend/.env` file to set these:

```env
PODPULSE_HOST=127.0.0.1
PODPULSE_PORT=5050
PODPULSE_PROMETHEUS_URL=http://localhost:9090
```

---

## Development

### Background Tasks
The backend runs two background tasks on startup:
1. **Pod Event Watcher** — Streams Kubernetes pod events via `watch.Watch()` into an in-memory deque
2. **Metrics Collector** — Periodically fetches pod metrics from `metrics.k8s.io` and stores snapshots

Both tasks are properly cancelled during graceful shutdown (5-second timeout).

### Dependency Injection
The Kubernetes client is lazily initialized via `KubernetesClientProvider`, avoiding import-time side effects. The `kube_client.py` module provides singleton access to `CoreV1Api` and `CustomObjectsApi`.

### Topology Service
The topology endpoint queries Prometheus with the following PromQL query:

```
sum by (source_workload, source_workload_namespace,
        destination_workload, destination_workload_namespace) (
  rate(istio_requests_total{reporter="source"}[1m])
)
```

It then enriches the result with pod-level nodes from the Kubernetes API, creating a complete service-to-service graph with pod membership.

---

## Troubleshooting

### "Warning: Failed to fetch Kubernetes pod metrics"
Metrics Server is not installed. CPU/memory bars will be empty. See [Install Metrics Server](#2-install-metrics-server-optional--for-cpumemory-data) above.

### Topology graph shows "No service topology detected"
Possible causes:
- Prometheus is not reachable. Check the `PODPULSE_PROMETHEUS_URL` setting.
- Istio is not installed or sidecars are not injected into your pods.
- Your pods have no recent traffic (the query uses a 1m rate window).
- You're running the backend locally without port-forwarding Prometheus.

### Backend can't connect to Kubernetes
Ensure your `kubeconfig` is correctly configured:
```bash
kubectl cluster-info
kubectl get pods -A