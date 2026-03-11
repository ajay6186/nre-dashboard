# NRE Network Device Dashboard — Project Documentation

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Service Breakdown](#5-service-breakdown)
   - [FastAPI Microservice](#51-fastapi-microservice)
   - [Django Gateway](#52-django-gateway)
   - [React Frontend](#53-react-frontend)
   - [Redis Channel Layer](#54-redis-channel-layer)
6. [Real-Time Communication Channels](#6-real-time-communication-channels)
7. [Data Models](#7-data-models)
8. [API Reference](#8-api-reference)
9. [Frontend Component Tree](#9-frontend-component-tree)
10. [Docker & Deployment](#10-docker--deployment)
11. [Testing Strategy](#11-testing-strategy)
12. [Known Limitations & Enhancement Opportunities](#12-known-limitations--enhancement-opportunities)

---

## 1. Project Overview

The **NRE (Network Resource Engineering) Dashboard** is a full-stack, real-time network device monitoring application. It simulates monitoring 10 network devices across 5 physical locations, displaying live device status, latency, packet loss, and uptime metrics.

### Core Purpose
- Demonstrate three concurrent real-time data delivery patterns: **WebSocket**, **SSE**, and **REST polling**
- Showcase microservice communication using **webhooks**
- Provide a production-grade Docker Compose setup with health checks and service dependencies

### Key Features
| Feature | Details |
|---|---|
| Live device status | Up / Down / Unknown with auto-refresh |
| Real-time transport | WebSocket (primary), SSE (fallback), REST (always-on poll) |
| Webhook push | FastAPI fires state-change events → Django → all browser tabs |
| Fleet metrics | Latency, packet loss, uptime, health score per device |
| Multi-view dashboard | Overview, Devices, Locations, Metrics sections |
| Device detail | Click any device row for a full-detail dialog |
| Hover popover | 400ms hover on a row shows quick-stats popover |
| Containerised | Full Docker Compose stack, one command to run |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser (React)                             │
│                                                                      │
│  ┌──────────────┐   WebSocket (ws://)   ┌──────────────────────┐   │
│  │  useRealtime │◄──────────────────────│                      │   │
│  │    hook      │   SSE (/devices/stream)│   Django (port 8000) │   │
│  │              │◄──────────────────────│   ASGI / Daphne      │   │
│  │              │   REST GET /devices   │                      │   │
│  │              │──────────────────────►│                      │   │
│  └──────────────┘                       └──────────┬───────────┘   │
└────────────────────────────────────────────────────│───────────────┘
                                                     │ httpx async
                                          ┌──────────▼───────────┐
                                          │  FastAPI (port 5001)  │
                                          │  Device Microservice  │
                                          │                       │
                                          │  Background Task      │
                                          │  every 5s: toggle     │
                                          │  unstable devices     │
                                          │         │             │
                                          │  POST webhook ───────►│──► Django /webhook/devices
                                          └───────────────────────┘
                                                                  │
                                                    ┌─────────────▼──────┐
                                                    │  Redis (port 6379)  │
                                                    │  Channel Layer      │
                                                    │  group_send()       │
                                                    │  → all WS clients   │
                                                    └────────────────────┘
```

### Request Flow Summary

| Action | Path |
|---|---|
| Manual REST refresh | React → Django `/devices` → FastAPI `/devices` |
| WebSocket initial snapshot | WS connect → Django consumer → FastAPI |
| WebSocket refresh command | React sends `{"command":"refresh"}` → consumer fetches FastAPI |
| SSE stream | React `EventSource` → Django `/devices/stream` → polls FastAPI every 5s |
| Webhook push | FastAPI detects change → `POST /webhook/devices` → Django → `group_send` → all WS clients |
| Demo trigger button | React `POST /devices/trigger` → Django → FastAPI → webhook → WS fan-out |

---

## 3. Technology Stack

### Backend
| Layer | Technology | Version | Purpose |
|---|---|---|---|
| API Gateway | **Django** | 5.x | REST proxy, SSE endpoint, webhook receiver |
| WebSocket | **Django Channels** | 4.x | ASGI consumer for WS fan-out |
| ASGI Server | **Daphne** | 4.x | Serves HTTP + WebSocket in single process |
| Microservice | **FastAPI** | 0.100+ | Device data, SSE source, webhook sender |
| ASGI Runner | **Uvicorn** | 0.23+ | Runs FastAPI |
| HTTP Client | **httpx** | 0.25+ | Async inter-service calls |
| Channel Layer | **channels-redis** | 4.x | Redis-backed WS message broker |
| Validation | **Pydantic** | 2.x | FastAPI request/response models |

### Frontend
| Layer | Technology | Purpose |
|---|---|---|
| Framework | **React 18** | UI components, hooks |
| Build Tool | **Vite** | Fast dev server, production bundler |
| UI Library | **Material-UI (MUI) v5** | Component library, theming |
| Charts | **Recharts** | Bar charts, pie/donut charts |
| Transport | Browser `WebSocket` API | Primary real-time channel |
| Transport | Browser `EventSource` API | SSE fallback channel |
| HTTP | Browser `fetch` API | REST calls |

### Infrastructure
| Layer | Technology | Purpose |
|---|---|---|
| Reverse Proxy | **nginx** | Serve React SPA, proxy `/devices` and `/ws` to Django |
| Cache/Broker | **Redis 7** | Django Channels channel layer backend |
| Container | **Docker + Compose** | Orchestrate all 4 services |

---

## 4. Project Structure

```
nre-dashboard/
│
├── docker-compose.yml              # Orchestrates all 4 services
├── requirements.txt                # Root-level test dependencies
├── pytest.ini                      # Pytest config (asyncio mode)
│
├── backend/                        # Django application
│   ├── manage.py
│   ├── Dockerfile
│   ├── nre_project/
│   │   ├── settings.py             # Django settings (Redis, CORS, Channel Layers)
│   │   ├── urls.py                 # URL routing (REST + SSE + webhook + trigger)
│   │   ├── asgi.py                 # ASGI app (HTTP + WebSocket via ProtocolTypeRouter)
│   │   └── routing.py             # WebSocket URL patterns
│   └── devices/
│       ├── views.py                # All HTTP views (REST, SSE, webhook, trigger)
│       ├── consumers.py            # WebSocket consumer (DeviceConsumer)
│       ├── urls.py                 # App-level URL patterns
│       └── tests.py                # Full test suite (55+ tests)
│
├── fastapi_service/                # FastAPI microservice
│   ├── app.py                      # Routes, device simulation, webhook sender
│   ├── Dockerfile
│   ├── requirements.txt
│   └── tests.py                    # FastAPI unit tests
│
├── frontend/                       # React SPA
│   ├── index.html
│   ├── vite.config.js
│   ├── nginx.conf                  # Production nginx config with proxy rules
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── main.jsx                # React entry point
│       ├── App.jsx                 # Root component
│       ├── constants/
│       │   └── theme.js            # Colour tokens (K8S_BLUE, CARD_BG, LOC_COLOR...)
│       ├── services/
│       │   └── api.js              # fetchDevices(), triggerWebhookChange()
│       ├── hooks/
│       │   └── useRealtime.js      # WS + SSE + REST transport manager
│       ├── utils/
│       │   └── chartHelpers.js     # Shared chart utilities
│       └── components/
│           ├── DeviceDashboard.jsx # Root stateful component
│           ├── layout/
│           │   ├── Sidebar.jsx     # Navigation + status indicators
│           │   └── TopBar.jsx      # Action buttons + last-updated
│           ├── views/
│           │   ├── OverviewSection.jsx   # Summary cards + charts + mini-table
│           │   ├── DevicesSection.jsx    # Full device table
│           │   ├── LocationsSection.jsx  # Grouped by physical location
│           │   └── MetricsSection.jsx    # 4 performance bar charts
│           ├── device/
│           │   ├── DeviceDetailDialog.jsx  # Full-screen device detail modal
│           │   ├── DeviceHoverPopover.jsx  # Quick-stats popover (400ms delay)
│           │   └── DeviceTypeIcon.jsx      # Icon per device_type
│           └── ui/
│               ├── MetricCard.jsx    # KPI card with optional progress
│               ├── StatusDot.jsx     # Coloured status indicator
│               ├── LatencyBar.jsx    # Inline latency visual bar
│               ├── PacketLossBar.jsx # Inline packet-loss visual bar
│               ├── UptimeText.jsx    # Formatted uptime display
│               └── SectionLabel.jsx  # Consistent section heading
```

---

## 5. Service Breakdown

### 5.1 FastAPI Microservice

**File**: `fastapi_service/app.py`
**Port**: `5001`

#### Responsibilities
1. Maintains an in-memory device state dictionary (`_DEVICE_STATES`)
2. Runs a background async task (`_simulate_state_changes`) that randomly toggles 1–2 unstable devices every 5 seconds
3. On each state change, fires a webhook `POST` to Django's receiver
4. Exposes REST and SSE endpoints for direct device data access

#### Device Inventory
10 devices across 5 locations:

| ID | Name | Type | Location | Stability |
|---|---|---|---|---|
| 1 | CoreRouter-01 | router | Data Center | Stable |
| 2 | DistSwitch-01 | switch | Data Center | Stable |
| 3 | Firewall-Primary | firewall | Data Center | Stable |
| 4 | LoadBalancer-01 | load-balancer | Data Center | Stable |
| 5 | AccessPoint-FL1 | access-point | Floor 1 | **Unstable** |
| 6 | AccessPoint-FL2 | access-point | Floor 2 | **Unstable** |
| 7 | EdgeRouter-WAN | router | WAN Edge | Stable |
| 8 | CoreSwitch-02 | switch | Data Center | Stable |
| 9 | DNS-Server-01 | server | Server Room | **Unstable** |
| 10 | DHCP-Server-01 | server | Server Room | **Unstable** |

#### State Simulation Logic
```
Every 5 seconds:
  Pick 1–2 random devices from [5, 6, 9, 10]
  Each chosen device has 55% probability of toggling
  If toggling to Up:
    response_time_ms = random(3, 60)
    uptime_hours = 0
    packet_loss_percent = random(0.0, 3.0)
  If toggling to Down:
    response_time_ms = None
    uptime_hours = None
    packet_loss_percent = 100.0
  Fire webhook for each changed device
```

---

### 5.2 Django Gateway

**File**: `backend/devices/views.py`, `backend/devices/consumers.py`
**Port**: `8000`

#### Views (HTTP)

| Endpoint | Method | Description |
|---|---|---|
| `/devices` | GET | Proxy device list from FastAPI → React |
| `/devices/stream` | GET | SSE stream — polls FastAPI every 5s |
| `/devices/trigger` | POST | Proxy trigger to FastAPI for demo button |
| `/webhook/devices` | POST | Receives webhook from FastAPI, broadcasts via WS |

#### WebSocket Consumer

**File**: `backend/devices/consumers.py`

```
Client connects to ws://host/ws/devices/
  → joins "devices" channel group
  → immediately receives full device snapshot (trigger: "initial")

Client sends {"command": "refresh"}
  → consumer fetches FastAPI
  → replies with devices (trigger: "manual")

FastAPI fires webhook → Django receive_webhook()
  → fetches fresh devices from FastAPI
  → channel_layer.group_send("devices", {...})
  → ALL connected clients receive update (trigger: "webhook")

Client disconnects
  → removed from "devices" channel group
```

#### ASGI Routing (`asgi.py`)

```python
ProtocolTypeRouter({
    "http":      django_asgi_app,         # REST, SSE, webhook
    "websocket": URLRouter(ws_patterns),   # ws://host/ws/devices/
})
```

---

### 5.3 React Frontend

**Entry**: `frontend/src/main.jsx` → `App.jsx` → `DeviceDashboard.jsx`

#### State Management (DeviceDashboard.jsx)

All application state lives in `DeviceDashboard`, passed down as props:

| State | Type | Purpose |
|---|---|---|
| `devices` | `Array` | Current device list from any transport |
| `loading` | `boolean` | Shows spinner until first data arrives |
| `error` | `string\|null` | Displayed in Alert banner |
| `lastUpdated` | `Date\|null` | Timestamp of last successful update |
| `lastSource` | `string\|null` | e.g. `"websocket (webhook)"` |
| `wsStatus` | `string` | `connected \| disconnected \| connecting` |
| `sseStatus` | `string` | Same states as wsStatus |
| `activeNav` | `string` | Current section: overview/devices/locations/metrics |
| `selectedDevice` | `object\|null` | Device shown in detail dialog |
| `hoverDevice` | `object\|null` | Device shown in hover popover |

#### `useRealtime` Hook (`hooks/useRealtime.js`)

Manages all three transport channels simultaneously:

```
On mount:
  connectWS()   → opens WebSocket, auto-reconnects on close
  connectSSE()  → opens EventSource, browser auto-reconnects on error
  startPolling() → setInterval every 1000ms calling fetchDevices()

WebSocket message received:
  → Always logs to event feed
  → Always updates device table

SSE message received:
  → Always logs to event feed
  → Updates device table ONLY IF wsActiveRef.current === false

REST poll result:
  → Always updates device table (silent on error)

sendRefresh():
  → Sends {"command":"refresh"} over WebSocket
  → Consumer fetches FastAPI and replies
```

#### Health Score Formula (`MetricsSection.jsx`)

```
health = (status_score × 0.4)
       + (latency_score × 0.2)
       + (packet_loss_score × 0.2)
       + (uptime_score × 0.2)

Where:
  status_score      = Up → 100, Down → 0
  latency_score     = max(0, 100 - response_time_ms / 2)
  packet_loss_score = max(0, 100 - packet_loss_percent × 15)
  uptime_score      = min(100, uptime_hours / 720 × 100)
```

---

### 5.4 Redis Channel Layer

Redis operates as the **message broker** for Django Channels.

| Mode | Channel Layer | When Used |
|---|---|---|
| Docker / Production | `channels_redis.core.RedisChannelLayer` | `REDIS_URL` env var set |
| Local dev / Tests | `channels.layers.InMemoryChannelLayer` | `REDIS_URL` not set |

Without Redis (in-memory mode), all WebSocket clients must connect to the **same Django process**. Redis enables multi-worker fan-out.

---

## 6. Real-Time Communication Channels

### Channel Priority Matrix

| Transport | Direction | Reconnect | Updates Table | Updates Log | Latency |
|---|---|---|---|---|---|
| WebSocket | Bidirectional | Manual (3s delay) | Always | Always | < 100ms |
| SSE | Server→Client | Automatic | Only if WS down | Always | ~5s |
| REST | Client→Server | N/A (polling) | Always | No | ~1s |

### WebSocket Message Protocol

**Server → Client:**
```json
{
  "type": "devices_update",
  "devices": [...],
  "trigger": "initial | webhook | manual"
}
```

**Client → Server:**
```json
{ "command": "refresh" }
```

### SSE Event Format
```
data: [{"id":1,"name":"CoreRouter-01","status":"Up",...},...]

data: [...]
```
Each event is a `data:` line followed by a JSON array of all 10 devices, then a blank line.

### Webhook Payload (FastAPI → Django)
```json
{
  "device_id": 6,
  "new_status": "Down",
  "timestamp": "2026-02-25T14:32:00+00:00"
}
```

---

## 7. Data Models

### DeviceStatus (Pydantic — FastAPI)

```python
class DeviceStatus(BaseModel):
    id: int
    name: str
    ip_address: str
    device_type: str          # router | switch | firewall | access-point | server | load-balancer
    location: str             # Data Center | Floor 1 | Floor 2 | WAN Edge | Server Room
    status: str               # Up | Down | Unknown
    response_time_ms: Optional[int]       # None when Down
    uptime_hours: Optional[int]           # None when Down; 0 when just recovered
    packet_loss_percent: Optional[float]  # 0.0 healthy; 100.0 when Down
    last_checked: str                     # ISO-8601 UTC timestamp
```

### Device JSON Shape (over the wire)

```json
{
  "id": 1,
  "name": "CoreRouter-01",
  "ip_address": "192.168.0.1",
  "device_type": "router",
  "location": "Data Center",
  "status": "Up",
  "response_time_ms": 2,
  "uptime_hours": 720,
  "packet_loss_percent": 0.0,
  "last_checked": "2026-02-25T14:32:00.123456+00:00"
}
```

---

## 8. API Reference

### Django Gateway (port 8000)

#### `GET /devices`
Returns current device list proxied from FastAPI.

**Responses:**
- `200 OK` — `[DeviceStatus, ...]`
- `405 Method Not Allowed` — non-GET request
- `502 Bad Gateway` — FastAPI returned 4xx/5xx
- `503 Service Unavailable` — FastAPI unreachable

---

#### `GET /devices/stream`
SSE stream. React subscribes with `new EventSource('/devices/stream')`.

**Response Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
X-Accel-Buffering: no
```

---

#### `POST /webhook/devices`
Receives state-change notifications from FastAPI. Broadcasts full device list to all WebSocket clients.

**Request Body:**
```json
{ "device_id": 6, "new_status": "Down", "timestamp": "..." }
```

**Responses:**
- `200 OK` — `{"status": "received"}`
- `400 Bad Request` — invalid JSON body
- `405 Method Not Allowed` — non-POST request

---

#### `POST /devices/trigger`
Proxies a trigger request to FastAPI, which immediately toggles a random unstable device and fires a webhook.

**Responses:**
- `200 OK` — `{"triggered": true, "device_id": N, "device_name": "...", "new_status": "..."}`
- `405 Method Not Allowed`
- `502 Bad Gateway`
- `503 Service Unavailable`

---

#### `ws://host/ws/devices/`
WebSocket endpoint. On connect: immediate device snapshot. Accepts `{"command": "refresh"}`.

---

### FastAPI Microservice (port 5001)

#### `GET /devices`
Returns all 10 devices with current simulated state.

#### `GET /devices/stream`
SSE stream — yields full device list every 5s.

#### `POST /devices/trigger`
Immediately toggles a random unstable device and fires a webhook to Django.

#### `GET /docs`
Auto-generated Swagger UI (FastAPI built-in).

---

## 9. Frontend Component Tree

```
App
└── DeviceDashboard (all state lives here)
    ├── useRealtime (hook — WS + SSE + REST)
    ├── Sidebar
    │   ├── Navigation links (overview / devices / locations / metrics)
    │   ├── WS status indicator
    │   ├── SSE status indicator
    │   └── Down device count badge
    ├── TopBar
    │   ├── REST refresh button
    │   ├── WS refresh button
    │   ├── Webhook trigger button
    │   └── Last-updated timestamp + source
    ├── [activeNav === 'overview']  → OverviewSection
    │   ├── MetricCard × 4 (Total / Running / Failed / Avg Latency)
    │   ├── PieChart (fleet health donut)
    │   ├── BarChart (by location)
    │   ├── BarChart (by device type)
    │   └── Mini device table (top 5)
    ├── [activeNav === 'devices']   → DevicesSection
    │   └── Full device table (all 10)
    ├── [activeNav === 'locations'] → LocationsSection
    │   └── Devices grouped by physical location
    ├── [activeNav === 'metrics']   → MetricsSection
    │   └── BarChart × 4 (latency / packet loss / uptime / health score)
    ├── DeviceHoverPopover (400ms hover delay)
    └── DeviceDetailDialog (click to open)
```

---

## 10. Docker & Deployment

### Services

| Service | Image/Build | Port | Depends On |
|---|---|---|---|
| `redis` | `redis:7-alpine` | 6379 | — |
| `fastapi` | `./fastapi_service` | 5001 | — |
| `django` | `./backend` | 8000 | redis (healthy), fastapi (healthy) |
| `frontend` | `./frontend` | 3000 | django |

### Starting the Stack

```bash
docker compose up --build
```

### Access Points

| URL | Service |
|---|---|
| `http://localhost:3000` | React dashboard |
| `http://localhost:8000/devices` | Django REST API |
| `http://localhost:5001/devices` | FastAPI REST API |
| `http://localhost:5001/docs` | FastAPI Swagger UI |

### Health Checks

- **Redis**: `redis-cli ping` every 5s
- **FastAPI**: Python urllib GET `/devices` every 10s, 5 retries
- **Django**: Started after both redis and fastapi are healthy
- **Frontend**: nginx started after django

### Environment Variables

| Variable | Service | Default | Purpose |
|---|---|---|---|
| `REDIS_URL` | Django | (not set) | Enables Redis channel layer |
| `FLASK_SERVICE_URL` | Django | `http://127.0.0.1:5001` | FastAPI base URL |
| `DJANGO_WEBHOOK_URL` | FastAPI | `http://127.0.0.1:8000/webhook/devices` | Webhook target |

---

## 11. Testing Strategy

### Test Stack
- **pytest** with `asyncio_mode = auto` (pytest.ini)
- **Django AsyncClient** — in-process async HTTP testing
- **channels.testing.WebsocketCommunicator** — in-process WS testing
- **unittest.mock.AsyncMock** — patches all upstream FastAPI calls

### Test Suites (Django — `backend/devices/tests.py`)

| Suite | Tests | What's Covered |
|---|---|---|
| `TestGetDevicesPositive` | 8 tests | 200, list body, field presence, correct data proxied |
| `TestGetDevicesNegative` | 9 tests | 405 for wrong methods, 404 unknown routes, 502/503 upstream errors |
| `TestSSEEndpoint` | 4 tests | 200, content-type, Cache-Control header, 405 on POST |
| `TestWebhookReceiver` | 5 tests | 200, body, group_send called, 405, 400 invalid JSON |
| `TestWebSocketConsumer` | 4 tests | connect, initial snapshot, refresh command, disconnect |
| `TestTriggerProxy` | 5 tests | 200, body match, 405, 502, 503 |

### Running Tests

```bash
# From project root
pytest backend/devices/tests.py -v

# FastAPI tests
pytest fastapi_service/tests.py -v

# All tests
pytest -v
```

---

## 12. Known Limitations & Enhancement Opportunities

| # | Area | Current Behaviour | Recommended Enhancement |
|---|---|---|---|
| 1 | REST polling | Runs every 1s even when WS is active — wasteful | Only activate when both WS + SSE are down; increase interval to 30s |
| 2 | Webhook auth | No signature validation — endpoint is open | Add HMAC-SHA256 signature header verification |
| 3 | Async lock | `_DEVICE_STATES` mutated by multiple concurrent coroutines without lock | Wrap mutations in `asyncio.Lock()` |
| 4 | httpx client | New client created per request — no connection pooling | Use a module-level shared `httpx.AsyncClient` |
| 5 | Secret key | Hardcoded `django-insecure-...` in settings.py | Load from `os.environ["DJANGO_SECRET_KEY"]` |
| 6 | `DEBUG=True` | Exposes stack traces in HTTP responses | Set `DEBUG=False` in production via env var |
| 7 | `ALLOWED_HOSTS=['*']` | Accepts requests from any host | Restrict to known domains |
| 8 | Circular import | `consumers.py` imports from `views.py` inside function bodies | Extract `fetch_devices_from_flask` to `devices/services.py` |
| 9 | Error swallowing | SSE generator silently sets `devices=[]` on exception | Log exceptions; yield SSE error event to client |
| 10 | Rate limiting | No rate limit on `/webhook/devices` or `/devices/trigger` | Add `django-ratelimit` or Redis-based throttle |
| 11 | No persistence | FastAPI device state resets on restart | Persist state to Redis or a database |
| 12 | No pagination | Returns all 10 devices in one response | Add `?page=` / `?limit=` query params |
| 13 | No authentication | All API endpoints are completely open | Add JWT or API key authentication |
| 14 | No observability | No logging, metrics, or tracing | Add structured logging + Prometheus metrics |
| 15 | Task GC risk | `asyncio.create_task()` result not stored — could be GC'd | Store task reference: `_sim_task = asyncio.create_task(...)` |
