# PodPulse Backend — Explained: How to Set Up & Run

> A detailed breakdown of what your friend added, what external tools you actually need, and how to get everything running from scratch.

---

## 1. What Changed?

Originally, your repo only had the **`frontend/`** directory (a React + Vite dashboard). Your friend added an entire **`backend/`** directory — a **FastAPI-based Python server** that talks to your Kubernetes cluster and feeds data to the frontend.

### Architecture Overview

```
┌────────────────────────────┐
│      Frontend (React)      │  ← Your original code
│   localhost:5173 (Vite)    │    Fetches data every 10 seconds
└─────────────┬──────────────┘
              │ HTTP requests to localhost:5050
┌─────────────▼──────────────┐
│      Backend (FastAPI)     │  ← What your friend added
│     localhost:5050         │
└─────────────┬──────────────┘
              │ Talks to K8s API
┌─────────────▼──────────────┐
│   Kubernetes Cluster       │  ← Your cluster (minikube / kind / real)
│   - Kubernetes Core API    │
│   - metrics.k8s.io (opt.)  │
│   - Prometheus + Istio     │
└────────────────────────────┘
```

---

## 2. What You Actually Need to Install

The backend has **three types of external dependencies**, from must-have to optional:

| # | Dependency | Required? | What It Does |
|---|-----------|-----------|-------------|
| 1 | **Kubernetes Cluster** | **YES** | The whole app is a K8s dashboard. It must connect to a cluster. |
| 2 | **`kubectl` + kubeconfig** | **YES** | The backend authenticates to the cluster using your kubeconfig file. |
| 3 | **metrics-server** (on cluster) | Optional but recommended | Provides live CPU/memory usage. Without it, charts will show no data. |
| 4 | **Istio + Prometheus** | Optional | Required only for the **Topology graph** (`/api/topology`). Everything else works without it. |

### 2.1 Must-Have: A Kubernetes Cluster

Your backend **cannot do anything** without a working Kubernetes cluster. The app is literally a K8s dashboard.

#### Option A: minikube (Recommended for local dev)

```bash
# 1. Install minikube:  https://minikube.sigs.k8s.io/docs/start/
#    (Follow the official guide for your OS)

# 2. Start a cluster
minikube start --driver=docker     # or --driver=virtualbox, etc.

# 3. Verify it works
kubectl get nodes
```

#### Option B: kind (Docker-based K8s)

```bash
# 1. Install kind:  https://kind.sigs.k8s.io/docs/user/quick-start/

# 2. Create a cluster
kind create cluster --name podpulse

# 3. Verify
kubectl get nodes
```

#### Option C: Real Cluster (EKS, GKE, AKS, etc.)

If you already have a cloud cluster, just make sure `kubectl` is configured to talk to it.

### 2.2 Must-Have: kubectl Configured

```bash
# Verify your kubeconfig is set up
kubectl config current-context
# Should output something like: minikube

# The backend reads the default kubeconfig at:
#   ~/.kube/config
```

If `kubectl` works, the backend can备好 packages to connect.

### 2.3 Recommended: metrics-server

Your **Resource Charts** (CPU/Memory graphs) need **metrics-server** running in the cluster. This is what provides the `metrics.k8s.io` API.

```bash
# Check if metrics-server is installed
kubectl get deployment metrics-server -n kube-system

# If NOT found, install it:
# For minikube:
minikube addons enable metrics-server

# For kind or other clusters:
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Wait for it to be ready
kubectl get deployment metrics-server -n kube-system -w
```

> ⚠️ **What's the fallback?** If metrics-server is not installed, the `/api/pods` and `/api/metrics` endpoints return empty/zero CPU and memory data. The app still runs, but charts are empty. The backend catches this silently.

### 2.4 Optional: Istio + Prometheus (for Topology)

The **Dependency Graph** (`/api/topology`) queries **Prometheus** for Istio traffic metrics. This is purely optional — every other feature works without it.

| Feature | Works without Istio/Prometheus? |
|---------|--------------------------------|
| Pod List | ✅ Yes |
| Live Events | ✅ Yes |
| AI Insights | ✅ Yes |
| CPU/Memory Charts | ✅ Yes (needs metrics-server) |
| **Dependency Graph** | ❌ No — needs Istio + Prometheus |

#### To enable the topology graph, you need:

**Step 1: Install Istio in your cluster**

```bash
# Download istioctl: https://istio.io/latest/docs/setup/getting-started/
# Or use:
curl -L https://istio.io/downloadIstio | sh -
cd istio-*

# Install Istio
./bin/istioctl install --set profile=demo -y

# Enable automatic sidecar injection in your namespace
kubectl label namespace default istio-injection=enabled
```

**Step 2: Install Prometheus (Istio bundles one)**

```bash
# Istio comes with a Prometheus addon
kubectl apply -f samples/addons/prometheus.yaml

# Wait for it to start
kubectl get pods -n istio-system -w
```

**Step 3: Port-forward Prometheus (for local access)**

```bash
# The backend expects Prometheus at localhost:9090 by default.
# Port-forward from the cluster to your local machine:
kubectl -n istio-system port-forward svc/prometheus 9090:9090

# Now the backend can reach it at http://localhost:9090
```

> **Note:** You need to keep this port-forward running while the backend is running.

---

## 3. How the Backend Works

### 3.1 Project Structure

```
backend/
├── pyproject.toml              # uv project manifest (dependencies listed here)
├── uv.lock                     # Exact locked dependency versions
├── run.py                      # Entry point — starts Uvicorn
│
└── app/
    ├── main.py                 # FastAPI app, CORS, registers all routes
    ├── config.py               # Environment variables (PODPULSE_* prefix)
    │
    ├── models/                 # Pydantic data schemas
    │   ├── pod.py              # Pod, PodMetrics, PodDetail
    │   ├── event.py            # PodEvent
    │   ├── metric.py           # MetricSnapshot, MetricResponse
    │   ├── insight.py          # Insight
    │   └── topology.py         # TopologyNode, TopologyEdge, TopologyResponse
    │
    ├── services/               # Business logic
    │   ├── kube_client.py      # Lazy K8s client (CoreV1Api + CustomObjectsApi)
    │   ├── pod_service.py      # Fetches pods, metrics, computes health
    │   ├── event_service.py    # Watches K8s events in real-time
    │   ├── metrics_service.py  # Periodic metrics collection
    │   ├── insight_service.py  # Generates anomaly insights
    │   └── topology_service.py # Fetches Istio traffic from Prometheus
    │
    ├── core/                   # Shared utilities
    │   ├── state.py            # Thread-safe in-memory store
    │   └── utils.py            # parse_cpu, parse_memory, status logic
    │
    └── routers/                # API route handlers
        ├── pods.py             # GET /api/pods, POST /api/pods/*/restart
        ├── events.py           # GET /api/events
        ├── metrics.py          # GET /api/metrics
        ├── insights.py         # GET /api/insights
        └── topology.py         # GET /api/topology
```

### 3.2 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/pods?include_system=false` | List all pods with metrics and health |
| `POST` | `/api/pods/{namespace}/{name}/restart` | Delete (restart) a pod |
| `GET` | `/api/events` | Live pod event stream (newest first) |
| `GET` | `/api/metrics` | Historical CPU/memory metrics snapshots |
| `GET` | `/api/insights` | AI-like insights for unhealthy pods |
| `GET` | `/api/topology` | Service dependency graph (needs Istio + Prometheus) |

### 3.3 Background Tasks

On startup, the backend launches **two background loops**:

1. **Pod Event Watcher (`EventService`)**
   - Uses Kubernetes `watch.Watch()` to stream live pod events
   - Tracks `ADDED`, `MODIFIED`, `DELETED`
   - Assigns severity: `info` / `warning` / `critical`
   - Stores up to 100 events in memory

2. **Metrics Collector (`MetricsService`)**
   - Runs every 15 seconds (configurable)
   - Fetches pod metrics from `metrics.k8s.io`
   - Stores CPU/memory snapshots (last 10)

### 3.4 Data Flow

```
Frontend (polls every 10s)
  ├─ GET /api/pods      → PodService.list_pods()
  │                       → Kubernetes CoreV1Api + metrics.k8s.io
  ├─ GET /api/events    → EventService.get_events()
  │                       → In-memory event deque
  ├─ GET /api/metrics   → MetricsService.get_metrics_data()
  │                       → In-memory metrics history
  ├─ GET /api/insights  → InsightService.get_insights()
  │                       → PodService + analysis
  └─ GET /api/topology  → TopologyService.fetch_topology()
                          → Prometheus (Istio metrics)
```

---

## 4. How to Run

### 4.1 Prerequisites Checklist

Before running anything, make sure you have:

- [ ] A running Kubernetes cluster (minikube / kind / cloud)
- [ ] `kubectl` configured (`kubectl get nodes` works)
- [ ] `uv` installed: https://docs.astral.sh/uv/
- [ ] Node.js 18+ (for the frontend)

### 4.2 Backend

```bash
cd backend

# Install Python dependencies
uv sync

# Start the server
uv run python run.py
```

The API will be at `http://localhost:5050`.

> **Important:** Before starting, make sure `kubectl` works and your cluster is running. The backend needs an active Kubernetes connection.

### 4.3 Frontend

In a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

The dashboard will be at `http://localhost:5173`.

---

## 5. Environment Variables

All backend settings use the `PODPULSE_` prefix:

| Variable | Default | Description |
|----------|---------|-------------|
| `PODPULSE_HOST` | `127.0.0.1` | Server bind address |
| `PODPULSE_PORT` | `5050` | Server port |
| `PODPULSE_RELOAD` | `false` | Enable auto-reload for development |
| `PODPULSE_METRICS_LOOP_INTERVAL` | `15` | Metrics collection interval (seconds) |
| `PODPULSE_MAX_EVENTS` | `100` | Max events in memory log |
| `PODPULSE_MAX_METRICS_HISTORY` | `10` | Max metrics snapshots stored |
| `PODPULSE_PROMETHEUS_URL` | `http://localhost:9090` | Prometheus URL for topology |

### Examples:

```bash
# Run on a different port
export PODPULSE_PORT=8080
uv run python run.py

# Enable hot-reload for dev
export PODPULSE_RELOAD=true
uv run python run.py

# Point to a different Prometheus
export PODPULSE_PROMETHEUS_URL=http://prometheus.monitoring.svc.cluster.local:9090
uv run python run.py
```

---

## 6. Features & What They Need

| Feature | Backend Needs | Cluster Needs |
|---------|--------------|---------------|
| Pod List / Grid | ✅ `kubectl` config | ✅ kube API server |
| Live Event Stream | ✅ `kubectl` config | ✅ kube API server |
| CPU/Memory Charts | ✅ `kubectl` config | ✅ **metrics-server** (metrics.k8s.io) |
| AI Insights | ✅ `kubectl` config | ✅ kube API server |
| Restart Pod | ✅ `kubectl` config | ✅ kube API server |
| **Dependency Graph** | ✅ `kubectl` config + **Prometheus URL** | ✅ **Istio + Prometheus** |

---

## 7. Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-----------|-----|
| `Failed to load kube config` | `kubectl` not configured | Run `kubectl config current-context`, ensure cluster is connected |
| No CPU/Memory data in charts | `metrics-server` not installed | Enable `minikube addons enable metrics-server` or install manually |
| `/api/topology` returns HTTP 502 | Prometheus or Istio not running | Start Prometheus via Istio, run `kubectl port-forward` to expose it |
| Pods don't show up | No pods in cluster, or all filtered out | Check `include_system` toggle, ensure pods exist |
| CORS error in browser | Frontend and backend on different origins | Backend allows all origins by default (`cors_allow_origins: ["*"]`) |
| `kubectl` works but backend can't connect | Python Kubernetes SDK reads wrong config | Set `KUBECONFIG` env var or place config at `~/.kube/config` |

---

## 8. Summary

Your friend built a **FastAPI backend** that turns your React frontend into a real Kubernetes monitoring dashboard. To get it working, you don't just run `uv sync` — you also need a **functioning Kubernetes cluster**. Here's what to do:

1. **Set up a K8s cluster** → `minikube start` (easiest)
2. **Verify `kubectl` works** → `kubectl get nodes`
3. **(Recommended) Enable metrics-server** → `minikube addons enable metrics-server`
4. **(Optional) Enable Istio + Prometheus** for the topology graph
5. **Install Python deps** → `cdque` (in backend, manually done — just `uv sync` is not enough)
6. **Run the backend** → `uv run python run.py`
7. **Run the frontend** → `npm run dev`

***Server is running on https://localhost:5173***