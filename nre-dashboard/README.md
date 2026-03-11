# NRE Network Device Dashboard

A full-stack, real-time network monitoring dashboard with a **Kubernetes-style UI** built with React 18, Django Channels, FastAPI, and Redis.

---

## Quick Start (TL;DR)

| Method | Command | URL |
|--------|---------|-----|
| **Docker** (recommended) | `docker compose up --build` | http://localhost:3000 |
| **Local** | 4 terminals — see [Local Setup](#option-b--local-development-no-docker) | http://localhost:5173 |

---

## Prerequisites

### Option A — Docker (Easiest)

Install one tool only:

| Tool | Version | Download |
|------|---------|----------|
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop/ |

> Docker Desktop includes both `docker` and `docker compose`. Make sure it is **running** before proceeding.

**Check it works:**
```bash
docker --version        # Docker version 24.x or higher
docker compose version  # Docker Compose version v2.x or higher
```

**Ports required free:** `3000`, `5001`, `8000`, `6379`

---

### Option B — Local Development

Install all three tools:

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.12+ | https://www.python.org/downloads/ |
| Node.js | 18+ | https://nodejs.org/ |
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop/ |

> Docker Desktop is still needed here — only for running Redis (one command).

**Check they work:**
```bash
python --version    # Python 3.12.x
node --version      # v18.x or higher
npm --version       # 9.x or higher
docker --version    # Docker version 24.x or higher
```

---

## Option A — Docker (Recommended)

The fastest way to run the full stack. Everything is containerised — no Python or Node.js install required.

### Step 1 — Get the project

Unzip the project folder or clone it, then navigate into it:
```bash
cd nre-dashboard
```

### Step 2 — Build and start all services

```bash
docker compose up --build
```

**What happens:**
- Docker pulls base images (redis, python, node, nginx)
- Builds 3 images (FastAPI, Django, React+nginx)
- Starts all 4 services in the correct order

> **First run:** 3–5 minutes (downloads ~500 MB of base images and installs packages).
> **Subsequent runs:** `docker compose up` — starts in under 10 seconds using cached layers.

### Step 3 — Open the dashboard

```
http://localhost:3000
```

Wait until you see log lines like:
```
fastapi-1  | INFO:     Uvicorn running on http://0.0.0.0:5001
django-1   | 2024-... ASGI server started
frontend-1 | ... start worker process
```

### Step 4 — Stop the services

```bash
# Stop and keep containers (fast restart later)
docker compose stop

# Stop and remove containers + network
docker compose down

# Full reset — also removes volumes
docker compose down -v
```

---

## Option B — Local Development (No Docker for app)

Run each service in its own terminal. Redis still runs in Docker (one command).

### Step 1 — Get the project

```bash
cd nre-dashboard
```

### Step 2 — Start Redis

```bash
docker run -d -p 6379:6379 --name nre-redis redis:7-alpine
```

> To stop Redis later: `docker stop nre-redis && docker rm nre-redis`

### Step 3 — Create and activate a virtual environment

A virtual environment isolates the project's Python packages from your system Python, preventing version conflicts.

**macOS / Linux:**
```bash
# From the nre-dashboard root
python3 -m venv .venv
source .venv/bin/activate
```

**Windows (Command Prompt):**
```cmd
python -m venv .venv
.venv\Scripts\activate.bat
```

**Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

> Your prompt will show `(.venv)` when the environment is active.
> Run `deactivate` at any time to exit it.

> **PowerShell note:** if you see a script execution error, run once:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
> then re-run the activate command.

### Step 4 — Install Python dependencies

```bash
# From the nre-dashboard root, with (.venv) active
pip install -r requirements.txt
```

### Step 5 — Terminal 1: Start FastAPI

```bash
cd fastapi_service
uvicorn app:app --port 5001 --reload
```

Wait for:
```
INFO:     Uvicorn running on http://127.0.0.1:5001
```

### Step 6 — Terminal 2: Start Django

```bash
cd backend
daphne -b 0.0.0.0 -p 8000 nre_project.asgi:application
```

Wait for:
```
2024-... INFO     ASGI server started
```

### Step 7 — Terminal 3: Start React

```bash
cd frontend
npm install
npm run dev
```

Wait for:
```
  VITE v5.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

### Step 8 — Open the dashboard

```
http://localhost:5173
```

---

## What to Test

### 1. Dashboard loads and shows 10 devices

Open the dashboard. Within 1–2 seconds the spinner disappears and 10 network devices appear.

Expected:
- Left sidebar shows **NetCluster** logo and 4 navigation items
- Top bar shows **Updated: HH:MM:SS** — ticking every second
- **Overview** tab shows fleet health donut + bar charts + a mini device table

---

### 2. Real-time auto-refresh (every 1 second)

Watch the **"Updated: HH:MM:SS"** timestamp in the top bar — it should update every second.

The source badge next to it cycles between:
- `rest (poll)` — 1-second REST polling
- `websocket (webhook)` — instant WebSocket push when a device state changes

---

### 3. Device state changes (every ~5 seconds)

Devices **5, 6, 9, 10** are "unstable" — they randomly flip between **Up** and **Down** every ~5 seconds via the webhook chain.

Watch for:
- Status dots changing from green (Running) to red (Failed)
- The red badge count on the **Devices** nav item
- The **Failed** metric card number changing

---

### 4. Transport buttons (top-right)

| Button | What it does | Expected result |
|--------|-------------|-----------------|
| **REST** | Manual `GET /devices` | Data refreshes, badge shows `rest (manual)` |
| **WS** | Sends `{"command":"refresh"}` over WebSocket | Instant refresh, badge shows `websocket (refresh)` |
| **Webhook** | `POST /devices/trigger` → FastAPI flips a device | Device status changes within 1–2 seconds |

---

### 5. Navigation tabs

Click each tab in the left sidebar:

| Tab | What you see |
|-----|-------------|
| **Overview** | 4 metric cards, fleet donut chart, location + type bar charts, mini table |
| **Devices** | Full table with search box and namespace filter chips |
| **Locations** | 5 location cards (Data Center, Floor 1, Floor 2, WAN Edge, Server Room) |
| **Metrics** | 4 horizontal bar charts: Response Time, Packet Loss, Uptime, Health Score |

---

### 6. Hover a device row → sparkline popover

In the **Devices** or **Overview** table, hover over any row and hold for ~400ms.

Expected: A popover appears on the right showing:
- Response Time sparkline (area chart)
- Packet Loss sparkline (area chart)

---

### 7. Click a device row → detail dialog

Click any device row.

Expected: A full dialog opens with:
- Device name, IP, location, type
- Response Time trend chart (24 readings)
- Packet Loss trend chart (24 readings)
- Radial health breakdown (Status / Latency / Packet Loss / Uptime scores)
- Overall health percentage

---

### 8. Devices tab — search and filter

Go to the **Devices** tab:
- Type in the search box (filters by name, IP, or device type)
- Click a namespace chip (e.g. **Data Center**) to filter by location
- Click **All** to clear the filter

---

### 9. Run the test suite

```bash
# From the nre-dashboard root
python -m pytest --tb=short -q
```

Expected output:
```
55 passed in x.xx s
```

---

## Service URLs

| URL | Description |
|-----|-------------|
| `http://localhost:3000` | Dashboard — Docker |
| `http://localhost:5173` | Dashboard — Local dev |
| `http://localhost:8000/devices` | Django REST API |
| `http://localhost:8000/devices/stream` | Django SSE stream |
| `ws://localhost:8000/ws/devices/` | Django WebSocket endpoint |
| `http://localhost:5001/devices` | FastAPI device list (JSON) |
| `http://localhost:5001/docs` | FastAPI Swagger / OpenAPI UI |
| `http://localhost:5001/devices/stream` | FastAPI SSE stream |

---

## Troubleshooting

### Port already in use

```bash
# Find what is using a port (e.g. 8000)
netstat -ano | findstr :8000      # Windows
lsof -i :8000                     # Mac / Linux

# Docker: stop any existing stack first
docker compose down
```

### Docker: services not starting

```bash
# Check status and health
docker compose ps

# View logs for a specific service
docker compose logs -f django
docker compose logs -f fastapi
docker compose logs -f frontend
docker compose logs -f redis
```

### Local: virtual environment not active

If you see `command not found: uvicorn` or `command not found: daphne`, the virtual environment is not active in that terminal. Activate it before starting any service:

```bash
# macOS / Linux
source .venv/bin/activate

# Windows (Command Prompt)
.venv\Scripts\activate.bat

# Windows (PowerShell)
.venv\Scripts\Activate.ps1
```

Each terminal you open for FastAPI, Django, or tests needs the environment activated separately.

### Local: "Module not found" or import errors

```bash
# Activate the virtual environment first, then reinstall
source .venv/bin/activate          # macOS / Linux
# or .venv\Scripts\activate.bat    # Windows

pip install -r requirements.txt
```

### Local: Redis connection error

```bash
# Check Redis is running
docker ps | grep redis

# Restart Redis if needed
docker start nre-redis
```

### Dashboard shows spinner indefinitely

1. Check FastAPI is running: open `http://localhost:5001/devices` — should return JSON
2. Check Django is running: open `http://localhost:8000/devices` — should return JSON
3. Check browser console (F12 → Console) for any errors

### Docker first build is slow

Normal — Docker is downloading ~500 MB of base images. Subsequent runs use cached layers and start in seconds.

---

## Project Structure

```
nre-dashboard/
├── docker-compose.yml              # Orchestrates all 4 services
├── requirements.txt                # Python dependencies (shared)
├── pytest.ini                      # Test configuration
├── README.md
│
├── backend/                        # Django ASGI gateway
│   ├── Dockerfile
│   ├── manage.py
│   ├── nre_project/
│   │   ├── asgi.py                 # Django Channels ASGI entry point
│   │   ├── settings.py             # Redis channel layer config
│   │   ├── routing.py              # WebSocket URL routing
│   │   └── urls.py
│   └── devices/
│       ├── views.py                # REST + SSE + Webhook views (async)
│       ├── consumers.py            # WebSocket consumer (Django Channels)
│       └── tests.py                # 31 Django tests
│
├── fastapi_service/                # Device microservice
│   ├── Dockerfile
│   ├── requirements.txt            # FastAPI-specific Python deps
│   ├── app.py                      # Devices, SSE stream, webhook sender
│   └── tests.py                    # 24 FastAPI tests
│
└── frontend/                       # React SPA
    ├── Dockerfile                  # Multi-stage: node build → nginx serve
    ├── nginx.conf                  # Proxy: /devices, /webhook, /ws/
    ├── vite.config.js              # Dev proxy config
    ├── package.json
    └── src/
        ├── main.jsx                # React root mount
        ├── App.jsx                 # MUI dark theme provider
        ├── constants/
        │   └── theme.js            # Design tokens (colours, spacing)
        ├── utils/
        │   └── chartHelpers.js     # Seeded chart data generators
        ├── services/
        │   └── api.js              # REST API client (fetchDevices, triggerWebhook)
        ├── hooks/
        │   └── useRealtime.js      # WebSocket + SSE + 1s REST polling manager
        └── components/
            ├── DeviceDashboard.jsx # Main orchestrator (~110 lines)
            ├── layout/
            │   ├── Sidebar.jsx     # Left nav with connection status
            │   └── TopBar.jsx      # Breadcrumb + transport buttons
            ├── views/
            │   ├── OverviewSection.jsx   # Fleet health + charts + mini table
            │   ├── DevicesSection.jsx    # Full table with search + filter
            │   ├── LocationsSection.jsx  # Devices grouped by location
            │   └── MetricsSection.jsx    # 4 bar charts
            ├── device/
            │   ├── DeviceTypeIcon.jsx    # Icon per device type
            │   ├── DeviceHoverPopover.jsx # Sparkline popover on hover
            │   └── DeviceDetailDialog.jsx # Full detail modal on click
            └── ui/
                ├── StatusDot.jsx         # Glowing Running / Failed indicator
                ├── MetricCard.jsx        # Stat card with coloured top border
                ├── LatencyBar.jsx        # ms value + mini progress bar
                ├── PacketLossBar.jsx     # % value + mini progress bar
                ├── UptimeText.jsx        # Formats hours → "Xd Yh"
                └── SectionLabel.jsx      # Uppercase section title
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser  (React SPA — Kubernetes-style UI)                          │
│  ├─ Overview · Devices · Locations · Metrics                         │
│  ├─ Hover sparklines  +  Click detail dialogs                        │
│  └─ Real-time: WebSocket (primary) · SSE (fallback) · REST 1s poll  │
└──────────────────┬───────────────────────────────────────────────────┘
                   │  HTTP / WebSocket
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│  nginx  :80 (Docker :3000)  /  Vite dev server (Local :5173)         │
│  ├─ /           → serve React build                                  │
│  ├─ /devices    → proxy to Django :8000                              │
│  ├─ /webhook    → proxy to Django :8000                              │
│  └─ /ws/        → proxy to Django :8000  (WebSocket upgrade)         │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Django 4.2 + Daphne  :8000  (ASGI)                                  │
│  ├─ GET  /devices            → proxy to FastAPI                      │
│  ├─ GET  /devices/stream     → SSE stream (proxied from FastAPI)     │
│  ├─ POST /webhook/devices    → receive webhook → WS broadcast        │
│  └─ WS   /ws/devices/        → Django Channels consumer             │
└────────────────────┬─────────────────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
┌─────────────────┐   ┌─────────────────────────────────────────────┐
│  Redis  :6379   │   │  FastAPI + Uvicorn  :5001                    │
│  Channel Layer  │   │  ├─ GET  /devices         device list        │
│  WS fan-out     │   │  ├─ GET  /devices/stream  SSE events         │
└─────────────────┘   │  ├─ POST /devices/trigger flip device state  │
                      │  └─ POST /webhook/devices → Django webhook   │
                      └─────────────────────────────────────────────┘
```

### Services

| Service | Technology | Port | Role |
|---------|-----------|------|------|
| `frontend` | React 18 + MUI v5 + nginx | 3000 | Kubernetes-style SPA |
| `django` | Django 4.2 + Daphne (ASGI) | 8000 | API gateway: REST, SSE, WebSocket, Webhook |
| `fastapi` | FastAPI + Uvicorn | 5001 | Device microservice + SSE + webhook sender |
| `redis` | Redis 7 Alpine | 6379 | Channel layer for WebSocket broadcast |

---

## Real-Time Data Flow

```
Browser        nginx/Vite      Django          FastAPI         Redis
  │               │               │               │               │
  │─ WS /ws/ ────►│─ upgrade ────►│               │               │
  │               │               │◄─ subscribe ───────────────────┤
  │               │               │               │               │
  │               │               │  Every ~5s:   │               │
  │               │               │  devices 5,6, │               │
  │               │               │  9,10 flip ───►               │
  │               │               │◄─ POST /webhook/devices ───────│
  │               │               │─ broadcast ────────────────────►
  │◄─ WS event ───│◄──────────────│               │               │
  │               │               │               │               │
  │  Every 1s:    │               │               │               │
  │─ GET /devices►│──────────────►│──────────────►│               │
  │◄─ JSON ───────│◄──────────────│◄──────────────│               │
```

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Real-time transport | WebSocket primary, SSE fallback, REST 1s poll | WS for instant push; SSE as degraded fallback; REST poll guarantees 1s freshness |
| ASGI server | Daphne | Required for Django Channels WebSocket support |
| Channel layer | Redis (Docker) / InMemory (tests) | Redis scales to multi-process; InMemory for isolated unit tests |
| Frontend charts | recharts v2 | Composable API, works well with React + MUI dark theme |
| Frontend proxy | nginx (prod) / Vite proxy (dev) | Serves built assets + proxies API + handles WS upgrade headers |
| Django async | `async def` views + manual method check | `@require_http_methods` decorator breaks async views in Django 4.2 |
| Component structure | Feature-based folders (layout / views / device / ui) | Each file ≤ 175 lines; clear ownership; easy to navigate |
