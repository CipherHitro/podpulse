# PodPulse Complete Setup Guide

This guide walks you through setting up the entire observability stack — from nothing to a running dashboard with live demo microservices generating traffic. It covers Linux, macOS, and Windows.

---

## Overview

You will set up **three layers** that work together:

```
┌──────────────────────────────────────────────────────────────┐
│                    Layer 3: PodPulse                         │
│  Frontend (React) ←→ Backend (FastAPI)                       │
│  → Monitors your cluster in real-time                        │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                    Layer 2: Demo App (PodPulse Demo)         │
│  api-gateway ←→ user-service ←→ order-service ←→ payment     │
│  → Generates realistic traffic for PodPulse to observe       │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                    Layer 1: Infrastructure                   │
│  Kubernetes (Minikube) → Istio → Prometheus → Metrics Server │
│  → The foundation everything runs on                         │
└──────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Install Prerequisites

### 1.1 Install Docker

**macOS:**
```bash
# Download from https://www.docker.com/products/docker-desktop
# Or via Homebrew
brew install --cask docker
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
# Log out and back in for group membership to take effect
```

**Windows:**
Download Docker Desktop from https://www.docker.com/products/docker-desktop and install it. Enable WSL2 backend when prompted.

---

### 1.2 Install kubectl

**macOS:**
```bash
brew install kubectl
```

**Linux:**
```bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
rm kubectl
```

**Windows (PowerShell):**
```powershell
curl -LO "https://dl.k8s.io/release/v1.28.0/bin/windows/amd64/kubectl.exe"
Move-Item kubectl.exe $env:PATH
```

Verify:
```bash
kubectl version --client
```

---

### 1.3 Install Minikube

**macOS:**
```bash
brew install minikube
```

**Linux:**
```bash
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
rm minikube-linux-amd64
```

**Windows:**
Download the Minikube installer from https://github.com/kubernetes/minikube/releases and run it, or use Chocolatey:
```powershell
choco install minikube
```

Verify:
```bash
minikube version
```

---

### 1.4 Install Python 3.10+

**macOS:**
```bash
# Comes pre-installed, or via Homebrew
brew install python3
```

**Linux:**
```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv
```

**Windows:**
Download from https://www.python.org/downloads/ or use:
```powershell
choco install python
```

Verify:
```bash
python3 --version
```

---

### 1.5 Install Node.js 18+

**macOS:**
```bash
brew install node
```

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

**Windows:**
Download from https://nodejs.org/ or use:
```powershell
choco install nodejs
```

Verify:
```bash
node --version
npm --version
```

---

### 1.6 Install uv (Python package manager)

**All platforms:**
```bash
pip install uv
```

**macOS via Homebrew:**
```bash
brew install uv
```

**Verify:**
```bash
uv --version
```

---

### 1.7 Install Istio CLI (istioctl)

**All platforms:**
```bash
curl -L https://istio.io/downloadIstio | sh -
```

Then add the `bin` directory to your PATH. Add this to your shell profile (`~/.bashrc`, `~/.zshrc`, or PowerShell `$PROFILE`):

**macOS/Linux:**
```bash
export PATH="$HOME/istio-*/bin:$PATH"
# Replace * with the actual version, e.g.:
export PATH="$HOME/istio-1.24.0/bin:$PATH"
```

**Windows (PowerShell):**
```powershell
$env:PATH += ";$env:USERPROFILE\istio-*\bin"
# Or use the full path in commands
```

Verify:
```bash
istioctl version
```

---

## Phase 2: Start Kubernetes Cluster

### 2.1 Start Minikube

**All platforms:**
```bash
minikube start --driver=docker
```

> **Note:** If you have Docker Desktop with Kubernetes enabled, you can skip Minikube and use `kubectl config use-context docker-desktop`. But Minikube is recommended for a clean, isolated environment.

**For more resources (optional):**
```bash
minikube start --driver=docker --cpus=4 --memory=8g
```

**Verify cluster is running:**
```bash
kubectl get nodes
# Should show one node with status "Ready"
```

---

### 2.2 Enable Required Addons

**Enable Metrics Server** (required for CPU/memory charts in PodPulse):
```bash
minikube addons enable metrics-server
```

**Enable Ingress** (optional, for external access):
```bash
minikube addons enable ingress
```

**Verify addons:**
```bash
minikube addons list
```

---

## Phase 3: Install Istio + Prometheus

### 3.1 Install Istio

```bash
# Replace * with your istio version
cd istio-*/

# Install with demo profile (includes Prometheus, Kiali, Grafana)
./bin/istioctl install --set profile=demo -y
```

**Verify Istio installed:**
```bash
kubectl get pods -n istio-system
# Should show istiod, istio-ingressgateway, istio-egressgateway running
```

### 3.2 Install Prometheus (if not bundled)

Istio's demo profile includes Prometheus. Verify it's running:
```bash
kubectl get pods -n istio-system | grep prometheus
```

If not present, install it:
```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/prometheus.yaml
```

---

## Phase 4: Deploy Demo Microservices (Traffic Source)

These are the services that generate traffic for PodPulse to monitor.

### 4.1 Create Namespace

```bash
kubectl create namespace podpulse
```

### 4.2 Enable Istio Sidecar Injection

```bash
kubectl label namespace podpulse istio-injection=enabled
```

### 4.2 Build Docker Images

> **Important:** Minikube uses its own Docker daemon. Build images directly into Minikube's registry:

**macOS/Linux (Terminal):**
```bash
# Build all 4 services
minikube image build -t podpulse/api-gateway:latest ./path/to/demo-app/services/api-gateway
minikube image build -t podpulse/user-service:latest ./path/to/demo-app/services/user-service
minikube image build -t podpulse/order-service:latest ./path/to/demo-app/services/order-service
minikube image build -t podpulse/payment-service:latest ./path/to/demo-app/services/payment-service
```

**Windows (PowerShell):**
```powershell
minikube image build -t podpulse/api-gateway:latest .\path\to\demo-app\services\api-gateway
minikube image build -t podpulse/user-service:latest .\path\to\demo-app\services\user-service
minikube image build -t podpulse/order-service:latest .\path\to\demo-app\services\order-service
minikube image build -t podpulse/payment-service:latest .\path\to\demo-app\services\payment-service
```

> **Note:** Replace `./path/to/demo-app` with the actual path to your demo application folder.

### 4.3 Deploy to Kubernetes

```bash
# Apply all Kubernetes manifests
kubectl apply -f ./path/to/demo-app/k8s/namespace.yaml
kubectl apply -f ./path/to/demo-app/k8s/
```

Or if manifests are in separate files:
```bash
kubectl apply -f ./path/to/demo-app/k8s/api-gateway.yaml
kubectl apply -f ./path/to/demo-app/k8s/user-service.yaml
kubectl apply -f ./path/to/demo-app/k8s/order-service.yaml
kubectl apply -f ./path/to/demo-app/k8s/payment-service.yaml
```

### 4.4 Wait for Pods to Start

```bash
kubectl get pods -n podpulse -w
```

**Expected output (6 pods all Running with 2/2 ready):**
```
NAME                              READY   STATUS    RESTARTS   AGE
api-gateway-xxx                   2/2     Running   0          30s
order-service-xxx                 2/2     Running   0          30s
order-service-yyy                 2/2     Running   0          30s
payment-service-xxx               2/2     Running   0          30s
user-service-xxx                  2/2     Running   0          30s
user-service-yyy                  2/2     Running   0          30s
```

> Note: `2/2` means the app container + Istio sidecar are both running. If you see `1/1`, Istio sidecar injection didn't work — re-run:
> ```bash
> kubectl label namespace podpulse istio-injection=enabled --overwrite
> kubectl rollout restart deployment -n podpulse
> ```

---

## Phase 5: Start Port Forwards (Keep These Running)

You need multiple terminal windows — keep each of these running in the background:

### Terminal 1: API Gateway (Demo App)
```bash
kubectl port-forward -n podpulse svc/api-gateway 8000:8000
```
**Access:** http://localhost:8000

### Terminal 2: Prometheus (for PodPulse Topology)
```bash
kubectl port-forward -n istio-system svc/prometheus 9090:9090
```
**Access:** http://localhost:9090

### Terminal 3: (Optional) Kiali Dashboard
```bash
istioctl dashboard kiali
# Or manually:
kubectl port-forward -n istio-system svc/kiali 20001:20001
```
**Access:** http://localhost:20001

---

## Phase 6: Start Traffic Generator

This sends continuous requests through your microservices, generating the data that PodPulse will display.

### 6.1 Install Python Dependencies

```bash
pip install httpx
```

### 6.2 Run the Traffic Generator

```bash
# Navigate to your demo app scripts folder
cd ./path/to/demo-app/scripts

# Run with default settings (3 second interval)
python seed.py --url http://localhost:8000/create-order --interval 3
```

**Or with custom settings:**
```bash
# Faster traffic (1 second interval)
python seed.py --url http://localhost:8000/create-order --interval 1
```

**Expected output:**
```
🚀 PodPulse Traffic Generator
Target: http://localhost:8000/create-order
Interval: 3.0s
Count: infinite
[2026-06-18 14:04:19] ✓ REQUEST_ID=abc123 STATUS=success ORDER=xyz789
[2026-06-18 14:04:23] ✓ REQUEST_ID=def456 STATUS=success ORDER=abc123
[2026-06-18 14:04:26] ✗ STATUS_CODE=500 RESPONSE={"detail":"Payment failed..."}
```

- `✓` = successful request
- `✗` = simulated payment failure (~10% of requests)

---

## Phase 7: Run PodPulse Backend

### 7.1 Configure Environment

Create a file at `backend/.env` (or edit the existing one):

```env
PODPULSE_HOST=127.0.0.1
PODPULSE_PORT=5050
PODPULSE_PROMETHEUS_URL=http://localhost:9090
PODPULSE_RELOAD=false
```

> **Important:** `PODPULSE_PROMETHEUS_URL=http://localhost:9090` must point to the port-forward from Phase 5.

### 7.2 Start Backend

```bash
cd backend
uv sync
uv run python run.py
```

**Expected output:**
```
INFO:     Uvicorn running on http://127.0.0.1:5050
PodPulse API Startup: Launching background tasks...
Background watch loop running.
```

### 7.3 Verify Backend is Working

```bash
curl http://localhost:5050/api/pods
# Should return JSON array of pods
```

---

## Phase 8: Run PodPulse Frontend

### 8.1 Install Dependencies

```bash
cd frontend
npm install
```

### 8.2 Start Frontend

```bash
npm run dev
```

**Expected output:**
```
VITE v8.x.x  ready in ...ms
➜  Local:   http://localhost:5173/
```

### 8.3 Open the Dashboard

Open your browser and go to:
```
http://localhost:5173
```

You should now see the PodPulse dashboard with:
- ✅ Live pod grid showing all 6 demo microservices
- ✅ CPU/Memory charts with real-time data
- ✅ Event log showing pod lifecycle events
- ✅ Insights for any unhealthy pods
- ✅ Dependency graph (shows deployments even without Istio traffic)

---

## Quick Reference: What to Start When

When you come back to run this project later, here's the minimal order:

### Checklist

- [ ] **Minikube running?** → `minikube status` (should say "Running")
- [ ] **kubectl works?** → `kubectl get nodes`
- [ ] **Istio + Prometheus running?** → `kubectl get pods -n istio-system`
- [ ] **Demo app pods running?** → `kubectl get pods -n podpulse`

### Startup Commands (in order)

```bash
# 1. Start Minikube
minikube start

# 2. (Optional) Start istio (if cluster was recreated)
cd istio-*/
./bin/istioctl install --set profile=demo -y

# 3. Port-forward Prometheus (Terminal 1)
kubectl port-forward -n istio-system svc/prometheus 9090:9090

# 4. Port-forward API Gateway (Terminal 2)
kubectl port-forward -n podpulse svc/api-gateway 8000:8000

# 5. Start traffic generator (Terminal 3)
cd /path/to/demo-app/scripts
python seed.py --url http://localhost:8000/create-order --interval 3

# 6. Start PodPulse Backend (Terminal 4)
cd /path/to/podpulse/backend
uv run python run.py

# 7. Start PodPulse Frontend (Terminal 5)
cd /path/to/podpulse/frontend
npm run dev
```

### Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| PodPulse Frontend | http://localhost:5173 | Main dashboard |
| PodPulse API | http://localhost:5050 | Backend API |
| Demo API Gateway | http://localhost:8000 | Traffic source |
| Prometheus | http://localhost:9090 | Metrics backend |
| Kiali (optional) | http://localhost:20001 | Service mesh view |

---

## Environment Variables Summary

### PodPulse Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `PODPULSE_HOST` | `127.0.0.1` | Server bind address |
| `PODPULSE_PORT` | `5050` | Server port |
| `PODPULSE_PROMETHEUS_URL` | `http://prometheus.istio-system:9090` | Prometheus URL |
| `PODPULSE_RELOAD` | `false` | Enable hot-reload |
| `PODPULSE_INCLUDE_SYSTEM_NAMESPACES` | `false` | Show kube-system pods |

### Demo Microservices

| Variable | Default | Description |
|----------|---------|-------------|
| `PAYMENT_FAILURE_RATE` | `0.1` | 10% chance of payment failure |
| `PAYMENT_DELAY_MS` | `100` | Payment processing delay |
| `ORDER_DELAY_MS` | `50` | Order processing delay |

---

## Troubleshooting

### Problem: Pods show `ImagePullBackOff`

**Cause:** Minikube lost the Docker images (common after restart).

**Solution:** Rebuild the images:
```bash
minikube image build -t podpulse/api-gateway:latest ./path/to/demo-app/services/api-gateway
minikube image build -t podpulse/user-service:latest ./path/to/demo-app/services/user-service
minikube image build -t podpulse/order-service:latest ./path/to/demo-app/services/order-service
minikube image build -t podpulse/payment-service:latest ./path/to/demo-app/services/payment-service

# Restart deployments
kubectl rollout restart deployment -n podpulse
```

---

### Problem: Pods show `1/1` instead of `2/2`

**Cause:** Istio sidecar not injected.

**Solution:**
```bash
kubectl label namespace podpulse istio-injection=enabled --overwrite
kubectl rollout restart deployment -n podpulse
```

---

### Problem: CPU/Memory charts show no data

**Cause:** Metrics server not running.

**Solution:**
```bash
minikube addons enable metrics-server
# Wait 60 seconds
kubectl top pods -n podpulse
```

---

### Problem: Topology graph is empty

**Cause:** No Istio traffic recorded yet, or Prometheus not forwarded.

**Solution:**
1. Ensure traffic is running: check seed.py output
2. Ensure Prometheus is forwarded: `kubectl port-forward -n istio-system svc/prometheus 9090:9090`
3. Verify backend has correct Prometheus URL in `backend/.env`:
   ```
   PODPULSE_PROMETHEUS_URL=http://localhost:9090
   ```

---

### Problem: "Connection refused" in seed.py

**Cause:** API Gateway port-forward not running.

**Solution:** Make sure Terminal 2 is running:
```bash
kubectl port-forward -n podpulse svc/api-gateway 8000:8000
```

---

### Problem: Frontend can't reach backend

**Cause:** Backend not running or wrong port.

**Solution:**
1. Check backend is running: `curl http://localhost:5050/api/pods`
2. Check frontend proxy in `vite.config.js` points to port 5050

---

### Problem: Minikube won't start

**Cause:** Docker not running or insufficient resources.

**Solution:**
1. Ensure Docker Desktop is running
2. Free up memory/CPU
3. Clean up old Minikube: `minikube delete && minikube start`

---

## File Structure

```
.
├── backend/                    # PodPulse monitoring backend
│   ├── app/
│   │   ├── main.py            # FastAPI entry point
│   │   ├── config.py          # Settings
│   │   ├── services/          # Kubernetes + Prometheus clients
│   │   └── routers/           # API endpoints
│   ├── run.py                 # Start script
│   └── .env                   # Environment config
│
├── frontend/                   # PodPulse React dashboard
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── App.jsx            # Main app
│   │   └── main.jsx           # Entry point
│   ├── package.json
│   └── vite.config.js
│
├── SETUP.md                   # ← You are here
│
└── [demo-app/]                # Separate folder with microservices
    ├── services/
    │   ├── api-gateway/
    │   ├── user-service/
    │   ├── order-service/
    │   └── payment-service/
    ├── k8s/
    ├── scripts/
    │   └── seed.py            # Traffic generator
    └── README.md
```

---

## Optional: Install Kiali for Service Mesh Visualization

Kiali provides a visual service graph that's complementary to PodPulse:

```bash
# Install Kiali
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/kiali.yaml

# Open dashboard
istioctl dashboard kiali
# Or manually:
kubectl port-forward -n istio-system svc/kiali 20001:20001
```

Access at: http://localhost:20001

---

## Cleanup

When you're done testing:

```bash
# Stop all port-forwards (Ctrl+C in each terminal)

# Delete demo app
kubectl delete namespace podpulse

# Stop Minikube (optional)
minikube stop

# Delete Minikube (to start fresh)
minikube delete
```