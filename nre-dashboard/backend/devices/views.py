"""
Views for the Devices API (Django gateway).

Real-time flow summary
─────────────────────
  Manual refresh (REST)
      React  ──GET /devices──►  Django  ──async httpx──►  FastAPI

  Automatic push (Webhook → WebSocket)
      FastAPI  ──POST /webhook/devices──►  Django
               ──group_send "devices"──►   DeviceConsumer
               ──WebSocket message──►      React

  Automatic push (SSE)
      Django  GET /devices/stream  ──SSE events──►  React
              (polls FastAPI every 5 s internally)
"""
import asyncio
import json

import httpx
from channels.layers import get_channel_layer
from django.conf import settings
from django.http import HttpResponseNotAllowed, JsonResponse, StreamingHttpResponse

FLASK_SERVICE_URL = getattr(settings, "FLASK_SERVICE_URL", "http://127.0.0.1:5001")


# ---------------------------------------------------------------------------
# Shared upstream fetch (used by REST view, SSE, webhook receiver, WS consumer)
# ---------------------------------------------------------------------------


async def fetch_devices_from_flask() -> list:
    """
    Asynchronously call the FastAPI microservice and return the device list.

    Raises:
        httpx.HTTPStatusError  : upstream returned 4xx / 5xx
        httpx.RequestError     : network failure (refused, timeout, etc.)
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(f"{FLASK_SERVICE_URL}/devices")
        response.raise_for_status()
        return response.json()


# ---------------------------------------------------------------------------
# 1. REST  GET /devices  (existing manual-refresh flow)
# ---------------------------------------------------------------------------


async def get_devices(request):
    """
    Proxy the device list from FastAPI to the React frontend.

    GET /devices → 200  list of devices
                 → 405  method not allowed
                 → 502  FastAPI returned an error
                 → 503  FastAPI is unreachable
    """
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    try:
        devices = await fetch_devices_from_flask()
        return JsonResponse(devices, safe=False)
    except httpx.HTTPStatusError as exc:
        return JsonResponse(
            {"error": f"Upstream service error: {exc.response.status_code}"},
            status=502,
        )
    except httpx.RequestError:
        return JsonResponse(
            {"error": "FastAPI device service is unavailable (port 5001)."},
            status=503,
        )


# ---------------------------------------------------------------------------
# 2. SSE  GET /devices/stream  (server-sent events)
# ---------------------------------------------------------------------------


async def _device_sse_generator(request):
    """
    Async generator for SSE events.
    Yields the full device list every 5 seconds until the client disconnects.
    Named function so tests can replace it with a finite mock version.
    """
    while True:
        if await request.is_disconnected():
            break
        try:
            devices = await fetch_devices_from_flask()
        except Exception:
            devices = []
        yield f"data: {json.dumps(devices)}\n\n"
        await asyncio.sleep(5)


async def sse_devices_stream(request):
    """
    SSE endpoint — React subscribes with EventSource('/devices/stream').
    Each event is a JSON array of all devices.

    GET /devices/stream
    """
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    response = StreamingHttpResponse(
        streaming_content=_device_sse_generator(request),
        content_type="text/event-stream",
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


# ---------------------------------------------------------------------------
# 3. Webhook  POST /webhook/devices  (receives state-change events from FastAPI)
# ---------------------------------------------------------------------------


async def receive_webhook(request):
    """
    Webhook receiver — FastAPI POSTs here when a device changes state.

    On receipt Django:
      1. Fetches the latest full device list from FastAPI.
      2. Broadcasts it to ALL connected WebSocket clients via the channel group.

    POST /webhook/devices
    Body: {"device_id": 2, "new_status": "Up", "timestamp": "..."}
    """
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    # Fetch the latest snapshot to broadcast full data (not just the diff)
    try:
        devices = await fetch_devices_from_flask()
    except Exception:
        devices = []

    # Push to all connected WebSocket clients
    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        "devices",
        {
            "type": "devices_update",
            "devices": devices,
            "trigger": "webhook",
            "changed_device_id": payload.get("device_id"),
        },
    )

    return JsonResponse({"status": "received"}, status=200)


# ---------------------------------------------------------------------------
# 4. Trigger  POST /devices/trigger  (demo button: force a device state change)
# ---------------------------------------------------------------------------


async def trigger_device_change(request):
    """
    Proxy a trigger request to FastAPI, which immediately toggles a random
    unstable device and fires a webhook back to us.

    Flow: React button → POST /devices/trigger → FastAPI /devices/trigger
          → FastAPI fires POST /webhook/devices → Django broadcasts via WebSocket

    POST /devices/trigger → 200  {"triggered": true, "device_id": N, ...}
                          → 405  method not allowed
                          → 502  FastAPI returned an error
                          → 503  FastAPI is unreachable
    """
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(f"{FLASK_SERVICE_URL}/devices/trigger")
            resp.raise_for_status()
            return JsonResponse(resp.json(), status=resp.status_code)
    except httpx.HTTPStatusError as exc:
        return JsonResponse(
            {"error": f"Upstream service error: {exc.response.status_code}"},
            status=502,
        )
    except httpx.RequestError:
        return JsonResponse(
            {"error": "FastAPI device service is unavailable (port 5001)."},
            status=503,
        )
