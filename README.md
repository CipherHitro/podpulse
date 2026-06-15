# PodPulse

**AI-powered Kubernetes observability dashboard for campus services.**

PodPulse provides real-time monitoring, visualization, and intelligent insights for Kubernetes clusters. It combines a FastAPI backend with a React frontend to deliver a comprehensive pod health management experience.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)            │
│  React 19 · Tailwind CSS 4 · Recharts · ReactFlow    │
│  Polls: /api/pods, /api/events, /api/metrics, /api/insights    │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP (port 8000)
┌─────────────────────▼───────────────────────────────┐
│                  Backend (FastAPI)                    │
│  Python 3.13 · FastAPI · Uvicorn · kubernetes SDK    │
│  Background tasks: pod watch + metrics collection     │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────  ────▼───────────────────────────────┐
│              Kubernetes Cluster (real or mock)        │
│  CoreV1Api · CustomObjectsApi (metrics.k8s.io)        │
└─────────────────────────────────────────────────────┘
```

---

## Features

### 📊 Real-Time Pod Monitoring
- **Live Pod Grid** — Color-coded pod health grid with critical/warning/healthy filtering
- **Dependency Graph** — Interactive ReactFlow graph showing pod nodes with status indicators
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
| Server | [Uvicorn](https://www.uvicorn.org/) |
| Package Manager | [uv](https://docs.astral.sh/uv/) |
| Kubernetes SDK | [kubernetes](https://github.com/kubernetes-client/python) |
| Config | [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | [React 19](https://react.dev/) |
| Build Tool | [Vite 8](https://vitejs.dev/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Charts | [Recharts](https://recharts.org/) |
| Graph Visualization | [React Flow](https://reactflow.dev/) |
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
    │   └── insight.py          # Insight
    │
    ├── services/               # Business logic
    │   ├── kube_client.py      # Lazy Kubernetes client provider (singleton)
    │   ├── pod_service.py      # Pod listing, metrics, status computation
    │   ├── event_service.py    # Pod event watch loop (background thread)
    │   ├── metrics_service.py  # Periodic metrics collection (background task)
    │   └── insight_service.py  # Insight/recommendation generation
    │
    ├── core/                   # Shared utilities
    │   ├── state.py            # Thread-safe AppState (events + metrics history)
    │   └── utils.py            # parse_cpu, parse_memory, get_pod_status_and_phase
    │
    └── routers/                # API route handlers
        ├── pods.py             # GET /api/pods, POST /api/pods/*/restart
        ├── events.py           # GET /api/events
        ├── metrics.py          # GET /api/metrics
        └── insights.py         # GET /api/insights
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/pods?include_system=false` | List all pods with metrics and status |
| `POST` | `/api/pods/{namespace}/{name}/restart` | Delete and restart a pod |
| `GET` | `/api/events` | Live pod event log (newest first) |
| `GET` | `/api/metrics` | Historical metrics snapshots (memory, cpu) |
| `GET` | `/api/insights` | Generated insights for unhealthy pods |

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) (or use pip with `backend/requirements.txt`)
- A Kubernetes cluster (or mock data via `backend/app/data/staticData.js`)

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

The API will be available at `http://localhost:8000`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

### Environment Variables (Optional)

All backend settings are configurable via environment variables with the `PODPULSE_` prefix:

| Variable | Default | Description |
|----------|---------|-------------|
| `PODPULSE_HOST` | `127.0.0.1` | Server bind address |
| `PODPULSE_PORT` | `8000` | Server port |
| `PODPULSE_RELOAD` | `false` | Enable hot-reload for development |
| `PODPULSE_METRICS_LOOP_INTERVAL` | `15` | Metrics collection interval (seconds) |
| `PODPULSE_MAX_EVENTS` | `100` | Max events in the in-memory log |
| `PODPULSE_MAX_METRICS_HISTORY` | `10` | Max metrics snapshots stored |

---

## Development

### Background Tasks
The backend runs two background tasks on startup:
1. **Pod Event Watcher** — Streams Kubernetes pod events via `watch.Watch()` into an in-memory deque
2. **Metrics Collector** — Periodically fetches pod metrics from `metrics.k8s.io` and stores snapshots

Both tasks are properly cancelled during graceful shutdown (5-second timeout).

### Dependency Injection
The Kubernetes client is lazily initialized via `KubernetesClientProvider`, avoiding import-time side effects. The `kube_client.py` module provides singleton access to `CoreV1Api` and `CustomObjectsApi`.