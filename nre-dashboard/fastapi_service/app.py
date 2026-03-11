"""
FastAPI Device Status Microservice
====================================
Responsibilities in the real-time architecture:

  1. REST    GET  /devices         — current device snapshot
  2. SSE     GET  /devices/stream  — push device updates every 5 s
  3. Webhook POST on state change  — notify Django gateway instantly

Device simulation:
  10 realistic network devices across 5 locations.
  A background task randomly toggles "unstable" devices every 5 seconds,
  firing a webhook on each change so WebSocket clients get instant updates.

Run locally:
  uvicorn app:app --host 127.0.0.1 --port 5001 --reload
"""
import asyncio
import json
import os
import random
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DJANGO_WEBHOOK_URL = os.getenv(
    "DJANGO_WEBHOOK_URL", "http://127.0.0.1:8000/webhook/devices"
)

# ---------------------------------------------------------------------------
# Response model (enriched with type, location, uptime, packet loss)
# ---------------------------------------------------------------------------


class DeviceStatus(BaseModel):
    id: int
    name: str
    ip_address: str
    device_type: str                    # router | switch | firewall | access-point | server | load-balancer
    location: str                       # Data Center | Floor 1 | Floor 2 | WAN Edge | Server Room
    status: str                         # Up | Down | Unknown
    response_time_ms: Optional[int]     # None when Down
    uptime_hours: Optional[int]         # Hours since last reboot; None when Down
    packet_loss_percent: Optional[float] # 0.0 when healthy; 100.0 when Down
    last_checked: str                   # ISO-8601 UTC timestamp


# ---------------------------------------------------------------------------
# Device inventory — 10 realistic network devices across 5 locations
# ---------------------------------------------------------------------------

_DEVICE_INVENTORY = [
    {"id": 1,  "name": "CoreRouter-01",    "ip_address": "192.168.0.1",  "device_type": "router",        "location": "Data Center"},
    {"id": 2,  "name": "DistSwitch-01",    "ip_address": "192.168.0.2",  "device_type": "switch",        "location": "Data Center"},
    {"id": 3,  "name": "Firewall-Primary", "ip_address": "192.168.0.3",  "device_type": "firewall",      "location": "Data Center"},
    {"id": 4,  "name": "LoadBalancer-01",  "ip_address": "192.168.0.10", "device_type": "load-balancer", "location": "Data Center"},
    {"id": 5,  "name": "AccessPoint-FL1",  "ip_address": "192.168.1.10", "device_type": "access-point",  "location": "Floor 1"},
    {"id": 6,  "name": "AccessPoint-FL2",  "ip_address": "192.168.1.11", "device_type": "access-point",  "location": "Floor 2"},
    {"id": 7,  "name": "EdgeRouter-WAN",   "ip_address": "10.0.0.1",     "device_type": "router",        "location": "WAN Edge"},
    {"id": 8,  "name": "CoreSwitch-02",    "ip_address": "192.168.0.4",  "device_type": "switch",        "location": "Data Center"},
    {"id": 9,  "name": "DNS-Server-01",    "ip_address": "192.168.2.10", "device_type": "server",        "location": "Server Room"},
    {"id": 10, "name": "DHCP-Server-01",   "ip_address": "192.168.2.11", "device_type": "server",        "location": "Server Room"},
]

# Mutable state cache — background task updates this to simulate live polling
_DEVICE_STATES: dict[int, dict] = {
    1:  {"status": "Up",   "response_time_ms": 2,    "uptime_hours": 720,  "packet_loss_percent": 0.0},
    2:  {"status": "Up",   "response_time_ms": 1,    "uptime_hours": 680,  "packet_loss_percent": 0.0},
    3:  {"status": "Up",   "response_time_ms": 3,    "uptime_hours": 360,  "packet_loss_percent": 0.0},
    4:  {"status": "Up",   "response_time_ms": 4,    "uptime_hours": 240,  "packet_loss_percent": 0.0},
    5:  {"status": "Up",   "response_time_ms": 8,    "uptime_hours": 48,   "packet_loss_percent": 0.5},
    6:  {"status": "Down", "response_time_ms": None, "uptime_hours": None, "packet_loss_percent": 100.0},
    7:  {"status": "Up",   "response_time_ms": 12,   "uptime_hours": 500,  "packet_loss_percent": 0.2},
    8:  {"status": "Up",   "response_time_ms": 1,    "uptime_hours": 600,  "packet_loss_percent": 0.0},
    9:  {"status": "Up",   "response_time_ms": 6,    "uptime_hours": 120,  "packet_loss_percent": 0.0},
    10: {"status": "Down", "response_time_ms": None, "uptime_hours": None, "packet_loss_percent": 100.0},
}

# Devices that can randomly change state during the demo simulation.
# Critical infrastructure (1,2,3,7,8) stays stable; edge devices flap.
_UNSTABLE_DEVICE_IDS = [5, 6, 9, 10]


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _poll_device(device: dict) -> DeviceStatus:
    """Build a DeviceStatus from the current mutable state cache."""
    state = _DEVICE_STATES.get(
        device["id"],
        {"status": "Unknown", "response_time_ms": None, "uptime_hours": None, "packet_loss_percent": None},
    )
    return DeviceStatus(
        id=device["id"],
        name=device["name"],
        ip_address=device["ip_address"],
        device_type=device["device_type"],
        location=device["location"],
        status=state["status"],
        response_time_ms=state["response_time_ms"],
        uptime_hours=state["uptime_hours"],
        packet_loss_percent=state["packet_loss_percent"],
        last_checked=datetime.now(timezone.utc).isoformat(),
    )


# ---------------------------------------------------------------------------
# Background task — multi-device state simulation
# ---------------------------------------------------------------------------


async def _send_webhook(device_id: int, new_status: str) -> None:
    """POST a state-change notification to the Django gateway."""
    payload = {
        "device_id": device_id,
        "new_status": new_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(DJANGO_WEBHOOK_URL, json=payload)
    except httpx.RequestError:
        pass  # Django may not be reachable yet


async def _simulate_state_changes() -> None:
    """
    Every 5 seconds, randomly toggle 1–2 unstable devices and fire webhooks.

    Each unstable device has a 55% chance of changing state per cycle,
    so the dashboard updates frequently without being too chaotic.
    Devices coming back Up get realistic random metrics (response time,
    packet loss) to make the demo look convincingly real.
    """
    while True:
        await asyncio.sleep(5)

        changed_ids = []
        for device_id in random.sample(_UNSTABLE_DEVICE_IDS, k=random.randint(1, 2)):
            if random.random() < 0.55:
                current_status = _DEVICE_STATES[device_id]["status"]
                new_status = "Up" if current_status == "Down" else "Down"

                if new_status == "Up":
                    _DEVICE_STATES[device_id] = {
                        "status": "Up",
                        "response_time_ms": random.randint(3, 60),
                        "uptime_hours": 0,
                        "packet_loss_percent": round(random.uniform(0.0, 3.0), 1),
                    }
                else:
                    _DEVICE_STATES[device_id] = {
                        "status": "Down",
                        "response_time_ms": None,
                        "uptime_hours": None,
                        "packet_loss_percent": 100.0,
                    }

                changed_ids.append((device_id, new_status))

        # Send a webhook for each changed device
        for device_id, new_status in changed_ids:
            await _send_webhook(device_id=device_id, new_status=new_status)


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------


@asynccontextmanager
async def _lifespan(application: FastAPI):
    asyncio.create_task(_simulate_state_changes())
    yield


app = FastAPI(
    title="NRE Device Status Service",
    description="Polls 10 network devices across 5 locations and streams status via REST, SSE, and webhooks.",
    version="3.0.0",
    lifespan=_lifespan,
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/devices", response_model=list[DeviceStatus])
async def get_devices():
    """REST snapshot — returns all 10 devices with their current status."""
    return [_poll_device(d) for d in _DEVICE_INVENTORY]


async def _sse_event_generator(request: Request):
    """
    Async generator for SSE events — yields the full device list every 5 s.
    Named function so tests can patch it with a finite version.
    """
    while True:
        if await request.is_disconnected():
            break
        devices = [_poll_device(d).model_dump() for d in _DEVICE_INVENTORY]
        yield f"data: {json.dumps(devices)}\n\n"
        await asyncio.sleep(5)


@app.get("/devices/stream")
async def stream_devices(request: Request):
    """SSE endpoint — React subscribes with: new EventSource('/devices/stream')"""
    return StreamingResponse(
        _sse_event_generator(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.post("/devices/trigger")
async def trigger_device_change():
    """
    Force an immediate state change on a random unstable device and fire the
    webhook to Django — used by the 'Webhook' demo button on the dashboard.

    This bypasses the background 5-second timer so the UI updates instantly
    when the operator clicks the button.

    Returns the device that changed and its new status.
    """
    device_id = random.choice(_UNSTABLE_DEVICE_IDS)
    current_status = _DEVICE_STATES[device_id]["status"]
    new_status = "Up" if current_status == "Down" else "Down"

    if new_status == "Up":
        _DEVICE_STATES[device_id] = {
            "status": "Up",
            "response_time_ms": random.randint(3, 60),
            "uptime_hours": 0,
            "packet_loss_percent": round(random.uniform(0.0, 3.0), 1),
        }
    else:
        _DEVICE_STATES[device_id] = {
            "status": "Down",
            "response_time_ms": None,
            "uptime_hours": None,
            "packet_loss_percent": 100.0,
        }

    await _send_webhook(device_id=device_id, new_status=new_status)

    device_name = next(d["name"] for d in _DEVICE_INVENTORY if d["id"] == device_id)
    return {
        "triggered":   True,
        "device_id":   device_id,
        "device_name": device_name,
        "new_status":  new_status,
    }
