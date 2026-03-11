# NRE Dashboard — Complete Interview Guide
## Basic → Intermediate → Advanced → Senior/Architect Level

---

> **How to use this guide**
> Questions are grouped from absolute beginner (Level 1) to senior architect (Level 4).
> Each question has: the question itself, the ideal answer, and where in the code the evidence lives.
> The final section covers what an interviewer would ask you to improve.

---

## LEVEL 1 — BASIC (Junior Developer)

*Covers: What the project does, simple Python/JS concepts, basic HTTP*

---

### Q1. What does this project do in plain English?

**Answer:**
It's a real-time network monitoring dashboard. It tracks 10 network devices (routers, switches, firewalls, etc.) spread across 5 physical locations. It shows you which devices are up or down, how fast they respond, and how much data they're losing. The screen updates automatically — you don't need to refresh the browser.

---

### Q2. What is an API? What APIs does this project expose?

**Answer:**
An API (Application Programming Interface) is a defined way for two programs to talk to each other — usually over HTTP. This project exposes:

| API | Method | What it does |
|---|---|---|
| `/devices` | GET | Returns a list of all 10 devices with their current status |
| `/devices/stream` | GET | Streams live updates every 5 seconds |
| `/devices/trigger` | POST | Forces a random device to toggle Up/Down |
| `/webhook/devices` | POST | Receives state-change notifications from FastAPI |
| `ws://host/ws/devices/` | WS | WebSocket for real-time bidirectional updates |

---

### Q3. What is JSON? Show me an example from this project.

**Answer:**
JSON (JavaScript Object Notation) is a text format for sending structured data between a server and a client. A device in this project looks like:

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
  "last_checked": "2026-02-25T14:32:00+00:00"
}
```

**Code reference**: `fastapi_service/app.py:44–54` (Pydantic model definition)

---

### Q4. What HTTP status codes are used in this project and what do they mean?

**Answer:**

| Code | Meaning | When this project uses it |
|---|---|---|
| `200 OK` | Success | Device list returned, webhook received |
| `400 Bad Request` | Client sent bad data | Webhook body isn't valid JSON |
| `404 Not Found` | Route doesn't exist | Request to `/nonexistent` |
| `405 Method Not Allowed` | Wrong HTTP method | POST to `/devices` (only GET allowed) |
| `502 Bad Gateway` | Upstream service returned an error | FastAPI returned 4xx/5xx |
| `503 Service Unavailable` | Upstream service is down | FastAPI is not running |

**Code reference**: `backend/devices/views.py:68–77`

---

### Q5. What is the difference between GET and POST?

**Answer:**
- **GET** — reads data, no body, safe to repeat, can be cached. Used to fetch the device list.
- **POST** — sends data to the server (has a request body), causes a side effect. Used for the webhook receiver and the trigger button.

In this project:
```python
# views.py — only GET is allowed here
if request.method != "GET":
    return HttpResponseNotAllowed(["GET"])
```

---

### Q6. What is a virtual environment in Python? Why does this project use one?

**Answer:**
A virtual environment is an isolated Python installation for a specific project. It ensures the correct library versions are used without conflicting with other Python projects on the same machine.

```bash
# Creating and activating one
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

---

### Q7. What does `async def` mean in Python?

**Answer:**
`async def` defines a **coroutine** — a function that can pause (`await`) while waiting for I/O (network calls, file reads) without blocking other work. This is core to how this project handles many simultaneous browser connections efficiently.

```python
# views.py:53 — async view, can await the httpx network call
async def get_devices(request):
    devices = await fetch_devices_from_flask()  # pauses here, other requests run
    return JsonResponse(devices, safe=False)
```

---

### Q8. What is Docker? Why is it used here?

**Answer:**
Docker packages an application and all its dependencies into a **container** — a portable, isolated unit that runs the same way on any machine.

This project uses Docker because it has 4 services (Redis, FastAPI, Django, nginx/React) that need to be started in the right order with the right configuration. One command starts everything:

```bash
docker compose up --build
```

Without Docker, you'd manually install Redis, start FastAPI on port 5001, start Django on port 8000, and configure nginx — all separately.

---

### Q9. What is React? What is JSX?

**Answer:**
**React** is a JavaScript library for building user interfaces using reusable **components** — each component manages its own appearance and behaviour.

**JSX** is a syntax extension that lets you write HTML-like markup inside JavaScript:

```jsx
// DeviceDashboard.jsx
return (
  <Box sx={{ display: 'flex' }}>
    <Sidebar activeNav={activeNav} />
    <TopBar onRest={handleRestClick} />
  </Box>
)
```

The browser doesn't understand JSX — **Vite** (the build tool) compiles it to plain JavaScript.

---

### Q10. What is `useState` in React?

**Answer:**
`useState` is a React hook that lets a component remember a value between renders. When the value changes, React re-renders the component to show the updated UI.

```jsx
// DeviceDashboard.jsx:16
const [devices, setDevices] = useState([])   // starts as empty array
// Later, when data arrives:
setDevices(newDevices)  // React re-renders with new data
```

---

## LEVEL 2 — INTERMEDIATE (Mid-Level Developer)

*Covers: Framework knowledge, async patterns, real-time protocols, testing*

---

### Q11. What is the difference between WSGI and ASGI?

**Answer:**

| | WSGI | ASGI |
|---|---|---|
| Style | Synchronous | Asynchronous |
| Protocols | HTTP only | HTTP + WebSocket + SSE |
| Concurrency | Thread-per-request | Event loop (many connections, one thread) |
| Django support | Django < 3.0 | Django 3.1+ |

This project **must** use ASGI because:
- Django Channels needs it for WebSocket support
- The `async def` views require an async server

The ASGI server is **Daphne**, configured first in `INSTALLED_APPS` so `manage.py runserver` automatically uses it.

**Code reference**: `backend/nre_project/asgi.py`, `settings.py:17`

---

### Q12. Explain Django Channels and how it extends Django.

**Answer:**
Standard Django can only handle regular HTTP — it can't hold a WebSocket connection open because WSGI is synchronous and request/response only.

**Django Channels** wraps Django in an ASGI layer and adds:
1. **Consumers** — class-based handlers for persistent connections (WS, SSE)
2. **Channel Layer** — a message passing system (backed by Redis) so any process can send messages to any connected WebSocket client
3. **Routing** — maps protocols (http, websocket) to the right handler

```python
# asgi.py — routes protocols to the right handler
ProtocolTypeRouter({
    "http":      django_asgi_app,
    "websocket": URLRouter(websocket_urlpatterns),
})
```

---

### Q13. What is a WebSocket and how is it different from regular HTTP?

**Answer:**

| | HTTP | WebSocket |
|---|---|---|
| Connection | Opens, request, response, closes | Stays open permanently |
| Direction | Client → Server (client always initiates) | Both directions at any time |
| Overhead | Headers on every request | Single handshake, then lightweight frames |
| Use case | Fetch a resource | Live chat, real-time dashboards, games |

In this project, the browser opens one WebSocket to `ws://host/ws/devices/` and keeps it open. When a device changes state, Django pushes the update instantly — no polling needed.

---

### Q14. What is SSE (Server-Sent Events)? How does it differ from WebSocket?

**Answer:**
SSE uses a regular HTTP connection that stays open. The server sends lines formatted as `data: ...\n\n` — the browser's `EventSource` API parses them automatically.

| | SSE | WebSocket |
|---|---|---|
| Protocol | HTTP | WS (upgrade handshake) |
| Direction | Server → Client only | Bidirectional |
| Reconnect | Automatic (browser handles it) | Manual |
| Proxy support | Generally works through proxies | Sometimes blocked by firewalls |

This project uses SSE as a **fallback** — if WebSocket is blocked (e.g., corporate proxy), SSE still delivers updates.

```javascript
// useRealtime.js:83
const sse = new EventSource('/devices/stream')
sse.onmessage = (event) => { ... }
```

---

### Q15. What is the `channel_layer.group_send()` pattern? Why is it powerful?

**Answer:**
A **group** in Django Channels is a named set of WebSocket connections. `group_send` broadcasts a message to every connection in the group simultaneously.

```python
# views.py:153 — one line updates ALL connected browser tabs
await channel_layer.group_send(
    "devices",                 # the group name
    {
        "type": "devices_update",  # maps to consumer method name
        "devices": devices,
        "trigger": "webhook",
    },
)
```

This is powerful because:
- Opening a second browser tab automatically joins the same group
- A single webhook from FastAPI fans out to all N clients in one call
- No server has to track individual client connections — Channels does it

---

### Q16. What is `httpx` and why is it used instead of `requests`?

**Answer:**
- `requests` is a **synchronous** library. Calling `requests.get()` **blocks the event loop** — no other requests can be handled while waiting.
- `httpx` is an **async-compatible** library with the same API. `await client.get()` yields control during the wait, allowing other coroutines to run.

```python
# views.py:42 — async context manager, non-blocking
async with httpx.AsyncClient(timeout=10.0) as client:
    response = await client.get(f"{FLASK_SERVICE_URL}/devices")
```

Using `requests` in an `async def` view would freeze the entire event loop.

---

### Q17. How does `useCallback` prevent infinite reconnect loops in `useRealtime.js`?

**Answer:**
Without `useCallback`, every render creates a **new function reference** for `connectWS`, `connectSSE`, and `startPolling`. Since `useEffect` has these in its dependency array, it would detect "new" functions every render and re-run — closing and immediately reopening connections on every state update.

```javascript
// useRealtime.js:40
const connectWS = useCallback(() => {
  // ... WebSocket setup
}, [onUpdate, onEvent])  // only recreated if onUpdate or onEvent change

useEffect(() => {
  connectWS()   // runs once on mount; not re-run unless dependencies change
  connectSSE()
  const pollId = startPolling()
  return () => { /* cleanup */ }
}, [connectWS, connectSSE, startPolling])
```

---

### Q18. Why is `useRef` used for `wsActiveRef` instead of `useState`?

**Answer:**
`useRef` stores a mutable value that:
1. **Does not trigger a re-render** when changed
2. **Always reflects the current value** inside callbacks (no stale closure)

If `useState` were used:
- `setWsActive(true)` would schedule a re-render
- The SSE `onmessage` callback would capture the *old* state value from its closure
- The callback would always see `wsActive === false`, never suppressing SSE updates

```javascript
// useRealtime.js:34
const wsActiveRef = useRef(false)  // mutable container, no re-renders

ws.onopen = () => {
    wsActiveRef.current = true   // instant mutation, read correctly in sse.onmessage
}
sse.onmessage = (event) => {
    if (!wsActiveRef.current) {  // always reads the latest value
        onUpdate(devices, 'sse', 'push')
    }
}
```

---

### Q19. How are async Django views tested without a running server?

**Answer:**
Django's `AsyncClient` makes in-process HTTP requests — it calls the view function directly without any TCP socket. All external dependencies are mocked with `AsyncMock`.

```python
# tests.py:65
async def test_returns_200(self, async_client):
    with patch("devices.views.fetch_devices_from_flask",
               new_callable=AsyncMock,
               return_value=MOCK_DEVICES):
        response = await async_client.get("/devices")
    assert response.status_code == 200
```

`AsyncMock` ensures that `await fetch_devices_from_flask()` works correctly inside the patched view without actually calling FastAPI.

---

### Q20. How are WebSocket consumers tested?

**Answer:**
`channels.testing.WebsocketCommunicator` simulates a complete WebSocket client in-memory:

```python
# tests.py:287
communicator = WebsocketCommunicator(application, "/ws/devices/")
connected, _ = await communicator.connect()

# Test that initial snapshot arrives
message = await communicator.receive_json_from()
assert message["type"] == "devices_update"
assert message["trigger"] == "initial"

# Test the refresh command
await communicator.send_json_to({"command": "refresh"})
reply = await communicator.receive_json_from()
assert reply["trigger"] == "manual"

await communicator.disconnect()
```

No browser, no real network — purely in-process.

---

### Q21. What is Pydantic and what does it do in FastAPI?

**Answer:**
Pydantic is a data validation library. In FastAPI, it's used to define **request and response schemas**. FastAPI automatically:
1. Validates incoming request bodies against the model
2. Serialises Python objects to JSON using the model's field types
3. Generates OpenAPI documentation (`/docs`)

```python
# app.py:44
class DeviceStatus(BaseModel):
    id: int
    name: str
    status: str
    response_time_ms: Optional[int]   # None is allowed when Down

@app.get("/devices", response_model=list[DeviceStatus])
async def get_devices():
    return [_poll_device(d) for d in _DEVICE_INVENTORY]
```

If FastAPI tried to return a value that violates the model (e.g., a string where `int` is expected), it raises a validation error.

---

### Q22. What is `asynccontextmanager` and how is it used for the FastAPI lifespan?

**Answer:**
`asynccontextmanager` turns an async generator function into a context manager usable with `async with`. FastAPI uses it for **startup and shutdown logic**:

```python
# app.py:182
@asynccontextmanager
async def _lifespan(application: FastAPI):
    asyncio.create_task(_simulate_state_changes())  # starts background task
    yield                                            # app runs here
    # shutdown code would go here

app = FastAPI(lifespan=_lifespan)
```

- Code **before `yield`** runs on startup
- Code **after `yield`** runs on shutdown (graceful cleanup)
- The background task runs indefinitely, toggling device states every 5 seconds

---

## LEVEL 3 — ADVANCED (Senior Developer)

*Covers: Distributed systems, production concerns, performance, security*

---

### Q23. Explain the full webhook flow from state change to browser update.

**Answer:**

```
Step 1: FastAPI background task (_simulate_state_changes) wakes up every 5s
Step 2: Randomly selects 1–2 devices from [5, 6, 9, 10]
Step 3: Each device has 55% chance of toggling Up↔Down
Step 4: _DEVICE_STATES dict is mutated with new state
Step 5: _send_webhook() fires POST to Django /webhook/devices
        Body: {"device_id": 6, "new_status": "Down", "timestamp": "..."}

Step 6: Django receive_webhook() parses the body
Step 7: Django calls fetch_devices_from_flask() — gets FULL updated list
Step 8: channel_layer.group_send("devices", {type: "devices_update", devices: [...]})
Step 9: Django Channels routes "devices_update" type to DeviceConsumer.devices_update()
Step 10: DeviceConsumer.devices_update() calls self.send(json.dumps(event))
         This is called once per WebSocket connection in the "devices" group
Step 11: Each browser tab receives the WebSocket message
Step 12: useRealtime.js ws.onmessage fires → onUpdate(msg.devices) → setDevices()
Step 13: React re-renders the dashboard with updated device status
```

End-to-end latency: typically under 200ms from state change to browser update.

---

### Q24. Why does Django fetch the full device list from FastAPI on every webhook instead of using the webhook payload's partial data?

**Answer:**
The webhook payload only contains `device_id` and `new_status` — a **diff**, not the full state. Django could reconstruct only the changed device, but this introduces several problems:

1. **State drift**: Django would need to maintain its own device state cache, which could become inconsistent with FastAPI's source of truth.
2. **Race conditions**: If two webhooks arrive rapidly, the order of applying partial updates is hard to guarantee.
3. **Simplicity**: Fetching the full list from FastAPI ensures every client always sees a consistent, complete snapshot — no partial state.

The trade-off is extra network latency (one extra HTTP call per webhook), but for a dashboard with 10 devices this is acceptable.

---

### Q25. What would happen if two Django workers received the same webhook simultaneously?

**Answer:**
In the current Docker setup, Django runs as a **single process**. But with multiple workers (e.g., Gunicorn with 4 workers), two workers could simultaneously:
1. Both call `fetch_devices_from_flask()` — two parallel HTTP calls to FastAPI
2. Both call `channel_layer.group_send("devices", ...)` — two broadcasts to clients

Since `group_send` goes through **Redis** (the shared channel layer), both messages would be delivered — resulting in clients receiving two updates milliseconds apart.

**Mitigations:**
- Idempotent updates: since the payload is the full device list (not a diff), receiving it twice just sets the same state twice — harmless
- Distributed locking with Redis if exactly-once delivery is required
- Deduplication by timestamp on the client side

---

### Q26. What is the Redis channel layer doing exactly? Could you replace it with something else?

**Answer:**
The channel layer is a **message passing interface** with two operations:
- `group_add(group, channel)` — register a consumer's channel in a group
- `group_send(group, message)` — deliver a message to all channels in a group

Redis is the backend that makes this work **across multiple OS processes**. Each Django worker registers its consumers in Redis. When `group_send` fires, Redis delivers the message to every registered channel, regardless of which process it lives in.

**Alternatives:**
- `InMemoryChannelLayer` — works in a single process only (used in tests/dev)
- RabbitMQ (via `channels_rabbitmq`)
- A custom implementation using any pub/sub system

For this project, Redis is ideal because it's already required for Django cache/sessions in many apps, has very low latency, and has an official channels backend.

---

### Q27. Explain the `ProtocolTypeRouter` in `asgi.py` and what it enables.

**Answer:**

```python
# asgi.py:23
application = ProtocolTypeRouter({
    "http":      django_asgi_app,
    "websocket": URLRouter(nre_project.routing.websocket_urlpatterns),
})
```

`ProtocolTypeRouter` is the top-level ASGI application. When a connection arrives at Daphne:
1. Daphne reads the ASGI scope's `type` field (`"http"` or `"websocket"`)
2. Routes it to the appropriate sub-application
3. HTTP requests → standard Django view system → REST, SSE, webhook endpoints
4. WebSocket connections → `URLRouter` matches the URL path → `DeviceConsumer`

This means **a single Daphne process handles both HTTP and WebSocket connections** on the same port — no separate WebSocket server needed.

---

### Q28. How does the `DeviceConsumer` handle the `devices_update` message type from the channel layer?

**Answer:**
Django Channels uses a **naming convention**: the `type` field in a `group_send` message (with dots replaced by underscores) maps to a method on the consumer.

```python
# receive_webhook in views.py sends:
await channel_layer.group_send("devices", {
    "type": "devices_update",   # <── this maps to...
    ...
})

# ...this method in DeviceConsumer
async def devices_update(self, event: dict) -> None:   # <── called automatically
    await self.send(json.dumps(event))
```

If the type were `"device.status.changed"`, Channels would call `device_status_changed(self, event)`.

---

### Q29. What are the performance implications of the triple-transport design (WS + SSE + REST polling)?

**Answer:**

| Transport | Load generated | Per client |
|---|---|---|
| WebSocket | 1 persistent connection | ~1 KB/message push, instant |
| SSE | 1 persistent HTTP connection | Full device list every 5s ≈ ~2 KB/event |
| REST poll | 1 HTTP request per second | ~2 KB/response × 60 = 120 KB/min |

For 100 concurrent users:
- REST: 100 req/s to Django → 100 httpx calls/s to FastAPI → **significant unnecessary load**
- SSE: 100 open connections, each getting 12 pushes/min → manageable
- WS: 100 persistent connections, updates only on device changes → minimal load

The REST polling every 1 second (`POLL_INTERVAL_MS = 1000`) is the biggest problem. It should be removed or changed to fire only when both WS and SSE are disconnected.

---

### Q30. How does nginx fit into the architecture and what does it proxy?

**Answer:**
In production (Docker), nginx serves the React build (`/`) and proxies API calls to Django so the browser sees everything on port 3000 (one origin, no CORS issues).

From `frontend/nginx.conf`:

```nginx
# Serve React SPA
location / {
    root /usr/share/nginx/html;
    try_files $uri /index.html;   # SPA fallback for client-side routing
}

# Proxy REST/SSE/webhook calls to Django
location /devices {
    proxy_pass http://django:8000;
}

# Proxy WebSocket with upgrade headers
location /ws/ {
    proxy_pass http://django:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
}
```

The `Upgrade` and `Connection` headers are required for the HTTP→WebSocket protocol upgrade handshake.

---

### Q31. How does the health score formula work in MetricsSection.jsx?

**Answer:**
```javascript
// MetricsSection.jsx:24–29
health = (status === 'Up' ? 100 : 0) * 0.4     // 40% weight: alive at all?
       + max(0, 100 - response_time_ms / 2) * 0.2  // 20% weight: 200ms → 0 score
       + max(0, 100 - packet_loss_percent * 15) * 0.2 // 20% weight: 6.7% loss → 0
       + min(100, uptime_hours / 720 * 100) * 0.2  // 20% weight: 30 days = 100%
```

A device that is:
- **Up** with 0ms latency, 0% loss, 720 hours uptime → `40 + 20 + 20 + 20 = 100`
- **Down** → `0 + 0 + 0 + 0 = 0` (all metrics are null/0 when Down)
- **Up** with 50ms latency → `40 + (100-25)×0.2 = 40 + 15 = 55` (plus other components)

---

## LEVEL 4 — ARCHITECT / SENIOR ENGINEER

*Covers: System design decisions, production readiness, scalability, security*

---

### Q32. If this were going to production with 10,000 concurrent users, what would you change?

**Answer:**

**Infrastructure changes:**
- Replace single Django process with **Gunicorn + Uvicorn workers** behind a load balancer
- Redis cluster for channel layer
- CDN for the React static assets
- Database for persistent device state history (PostgreSQL + TimescaleDB for time-series)

**Code changes:**
1. **Remove REST polling** from the frontend — WS + SSE is sufficient
2. **Shared httpx client** with connection pooling instead of per-request clients
3. **Webhook authentication** (HMAC signatures) — currently completely open
4. **Rate limiting** on all endpoints (Redis-based token bucket)
5. **Async database writes** for device state history with SQLAlchemy + asyncpg
6. **Horizontal scaling**: FastAPI behind a load balancer, state in Redis (not in-memory dict)

**Observability:**
- Structured JSON logging (loguru / structlog)
- Prometheus metrics (`/metrics` endpoint) for WS connections, webhook rate, SSE subscribers
- Distributed tracing (OpenTelemetry + Jaeger)

---

### Q33. What security vulnerabilities exist in this project and how would you fix each?

**Answer:**

| Vulnerability | Location | Risk | Fix |
|---|---|---|---|
| Hardcoded secret key | `settings.py:10` | Any attacker can forge Django sessions | `os.environ["DJANGO_SECRET_KEY"]` |
| `DEBUG=True` | `settings.py:12` | Stack traces exposed to users | Env-var controlled, `False` in prod |
| `ALLOWED_HOSTS=['*']` | `settings.py:14` | HTTP Host header injection | Restrict to known domains |
| No webhook auth | `views.py:126` | Anyone can send fake device updates | HMAC-SHA256 signature verification |
| No API auth | `settings.py:89–91` | Unauthenticated API access | JWT or API key middleware |
| Open CORS | `settings.py:37–42` | Any origin can call the API | Restrict to known frontend domain |
| No rate limiting | All endpoints | DoS via flooding | `django-ratelimit` + Redis counter |
| No input validation | `views.py:141` | Body is parsed but fields aren't validated | Validate `device_id`, `new_status` against allowed values |

---

### Q34. How would you add persistent device history (time-series data)?

**Answer:**

**Option 1: PostgreSQL + TimescaleDB**
```python
# New model for history
class DeviceEvent(models.Model):
    device_id = models.IntegerField()
    status = models.CharField(max_length=10)
    response_time_ms = models.IntegerField(null=True)
    packet_loss_percent = models.FloatField(null=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
```
Write to DB in the webhook receiver, query for time-range charts.

**Option 2: InfluxDB / Prometheus**
FastAPI pushes metrics to InfluxDB on each state change. Grafana visualises them.

**Option 3: Redis Streams**
Use `XADD` to append device state events to a Redis Stream. `XRANGE` to query history. Simple, no SQL.

The choice depends on query patterns:
- Historical time-range queries → TimescaleDB
- Aggregation + alerting → Prometheus
- Simple recent-events log → Redis Streams

---

### Q35. The `_DEVICE_STATES` dict in FastAPI is shared state modified by an async background task AND by the trigger endpoint. Is this thread-safe?

**Answer:**
In CPython, Python has the **GIL (Global Interpreter Lock)** which means true parallel execution of Python bytecodes doesn't happen — so a plain dict assignment from two coroutines in the same event loop won't corrupt memory.

However, it is **NOT safe** for correctness because:
1. A coroutine can be **suspended mid-operation** if it hits an `await`
2. If `_simulate_state_changes` is in the middle of computing new state, `trigger_device_change` could read a partially-updated device

**Example race:**
```python
# Background task: sets device 6 to Up, computes new metrics...
_DEVICE_STATES[6] = {"status": "Up", ...}
# <-- suspended here at some hypothetical await -->

# Trigger endpoint: also reads device 6 and toggles it to Down
_DEVICE_STATES[6] = {"status": "Down", ...}

# Background task resumes: fires webhook for device 6 "Up" -- but it's now Down!
await _send_webhook(device_id=6, new_status="Up")  # WRONG
```

**Fix**: Use `asyncio.Lock()`:
```python
_state_lock = asyncio.Lock()

async def _update_device(device_id: int, new_state: dict):
    async with _state_lock:
        _DEVICE_STATES[device_id] = new_state
```

---

### Q36. Why does the project have two separate SSE streams (one in Django, one in FastAPI)? When would you use each?

**Answer:**

| | FastAPI SSE (`/devices/stream` on port 5001) | Django SSE (`/devices/stream` on port 8000) |
|---|---|---|
| Source | Reads directly from `_DEVICE_STATES` | Calls FastAPI every 5s via httpx |
| Latency | Zero hop | One extra hop |
| Use case | Direct microservice access (ops tools, internal scripts) | Frontend clients (via nginx proxy) |
| Authentication | Would need to be added to FastAPI | Can use Django's auth middleware |

The frontend uses Django's SSE because:
1. The browser only needs to know about one origin (nginx on port 3000)
2. Django can apply authentication/rate limiting before proxying
3. FastAPI is an internal service that shouldn't be directly reachable from the internet

---

### Q37. The `asyncio.create_task()` call in the lifespan function doesn't store the task. Why is this a problem?

**Answer:**

```python
# app.py:184 — PROBLEM: task reference lost immediately
@asynccontextmanager
async def _lifespan(application: FastAPI):
    asyncio.create_task(_simulate_state_changes())  # reference not stored
    yield
```

Python's garbage collector can collect a task if no reference to it exists. Although in practice `asyncio` holds a strong reference to running tasks internally, it is **not guaranteed** and varies by Python version. The official documentation warns about this.

**Fix:**
```python
_background_tasks = set()

@asynccontextmanager
async def _lifespan(application: FastAPI):
    task = asyncio.create_task(_simulate_state_changes())
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
```

This also enables **graceful shutdown** — the background task is cancelled when FastAPI stops instead of being orphaned.

---

### Q38. How would you redesign this system to support 1,000 different network clusters, each with 1,000 devices?

**Answer:**

**Current design problems at scale:**
- `_DEVICE_STATES` is in-memory — doesn't scale to 1M devices
- All devices are in one WebSocket group — one update notifies ALL clients regardless of which cluster they're watching
- Django fetches ALL devices on every webhook — would be huge payloads

**Redesigned architecture:**

1. **Per-cluster WebSocket groups**: Group name = `devices:{cluster_id}`. Clients subscribe to only their cluster. Webhooks target specific groups.

2. **Persistent state store**: Move `_DEVICE_STATES` to **Redis Hash** per device:
   ```
   HSET device:cluster_1:device_5 status "Down" response_time_ms "null"
   ```

3. **Partial updates**: Webhook payload includes the changed device's full state. Django broadcasts the diff, not the full 1,000-device list.

4. **Sharding**: Multiple FastAPI instances, each responsible for a subset of clusters. A cluster registry in Redis maps `cluster_id → fastapi_instance`.

5. **Event streaming**: Replace webhooks with **Kafka/Pulsar** topics. FastAPI publishes to `device-events` topic. Django workers consume and fan-out. This decouples services and provides durability.

---

## SECTION: What an Interviewer Would Ask You to Enhance

---

### "Explain one thing you would do differently if starting from scratch."

**Strong answer:**
> "I would remove the REST polling from `useRealtime.js` entirely. Running `setInterval` every 1 second creates continuous server load even when WebSocket and SSE are both connected and working. The whole point of those real-time channels is to eliminate polling. I'd change `startPolling` to be a last-resort fallback that only activates when both WS and SSE report `disconnected` status, and I'd set the interval to 30 seconds minimum."

**Code location**: `useRealtime.js:125–135`, `POLL_INTERVAL_MS = 1000`

---

### "How would you secure the webhook endpoint?"

**Strong answer:**
> "Currently `POST /webhook/devices` accepts any JSON with no authentication — anyone on the network can send fake device state changes. I'd add HMAC-SHA256 signature verification. FastAPI would sign the payload body with a shared secret and include the signature as `X-Webhook-Signature`. Django's `receive_webhook` would verify the signature before processing. I'd use `hmac.compare_digest` to prevent timing attacks."

**Code location**: `views.py:126`, `app.py:123–134`

---

### "What's wrong with creating a new httpx client on every request?"

**Strong answer:**
> "Every call to `fetch_devices_from_flask` opens a new TCP connection to FastAPI, does the TLS handshake (in production), sends the request, waits for a response, then closes the connection. This overhead repeats for every single request. A shared `httpx.AsyncClient` instance would reuse connections via HTTP keep-alive, maintain a connection pool, and be significantly faster. I'd instantiate the client once — either as a module-level singleton or using FastAPI's lifespan context in Django — and share it across all views."

**Code location**: `views.py:42`

---

### "How would you add authentication to this dashboard?"

**Strong answer:**
> "I'd add JWT authentication at the Django layer. The frontend would POST credentials to `/auth/token` and receive a JWT. All subsequent API calls would include `Authorization: Bearer <token>`. The WebSocket handshake would include the token as a query parameter (`?token=...`) since browsers can't set headers on WS connections. Django Channels middleware would validate the JWT on connect and reject unauthenticated connections. The webhook endpoint from FastAPI would use a separate secret (HMAC) since it's machine-to-machine, not user-facing."

---

### "How would you add alerting — notify someone when a device goes down?"

**Strong answer:**
> "I'd extend the webhook receiver in Django. When a device's `new_status` is `Down`, before broadcasting the WebSocket message, I'd also:
> 1. Write a `DeviceAlert` record to the database (device_id, timestamp, severity)
> 2. Push a notification via email (Django's `send_mail`), Slack (webhook), or PagerDuty API
> 3. Include an `alert: true` flag in the WebSocket broadcast so the frontend can show a toast notification
>
> For repeated flapping (device going Down/Up rapidly), I'd add a cooldown: only alert if the device has been stable for at least 5 minutes before going Down again. Store the last-alerted timestamp in Redis."

---

## Quick Cheat Sheet

| Concept | Where in Code | One-liner |
|---|---|---|
| ASGI routing | `asgi.py:23` | Routes http/websocket to correct handler |
| Channel group fan-out | `views.py:153` | One `group_send` → all browser tabs |
| WS consumer lifecycle | `consumers.py:24–44` | connect → group_add → send snapshot |
| SSE format | `views.py:98` | `f"data: {json}\n\n"` |
| useRef vs useState | `useRealtime.js:34` | Ref = no re-render, no stale closure |
| useCallback | `useRealtime.js:40` | Prevents reconnect loop on every render |
| AsyncMock testing | `tests.py:66` | Patch async functions in test |
| WebsocketCommunicator | `tests.py:290` | In-memory WS test client |
| Pydantic model | `app.py:44` | Validates + serialises device JSON |
| asynccontextmanager | `app.py:182` | Startup/shutdown logic for FastAPI |
| Health score formula | `MetricsSection.jsx:24` | Weighted avg of 4 metrics |
| Redis channel layer | `settings.py:62` | Multi-process WS fan-out backend |
