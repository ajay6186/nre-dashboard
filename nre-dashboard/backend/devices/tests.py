"""
Unit tests for the Django gateway (REST, SSE, Webhook, WebSocket).

All upstream calls to FastAPI are mocked — no running services needed.

Test suites:
  TestGetDevicesPositive    — REST GET /devices happy paths
  TestGetDevicesNegative    — REST errors + disallowed methods + upstream failures
  TestSSEEndpoint           — GET /devices/stream headers + first event
  TestWebhookReceiver       — POST /webhook/devices
  TestWebSocketConsumer     — ws://host/ws/devices/ via channels.testing
"""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from channels.testing import WebsocketCommunicator
from django.test import AsyncClient

# ---------------------------------------------------------------------------
# Shared fixtures & mock data
# ---------------------------------------------------------------------------

MOCK_DEVICES = [
    {
        "id": 1, "name": "CoreRouter-01",    "ip_address": "192.168.0.1",
        "device_type": "router",        "location": "Data Center",
        "status": "Up",   "response_time_ms": 2,
        "uptime_hours": 720,  "packet_loss_percent": 0.0,
        "last_checked": "2026-01-01T00:00:00+00:00",
    },
    {
        "id": 2, "name": "DistSwitch-01",    "ip_address": "192.168.0.2",
        "device_type": "switch",        "location": "Data Center",
        "status": "Up",   "response_time_ms": 1,
        "uptime_hours": 680,  "packet_loss_percent": 0.0,
        "last_checked": "2026-01-01T00:00:00+00:00",
    },
    {
        "id": 6, "name": "AccessPoint-FL2",  "ip_address": "192.168.1.11",
        "device_type": "access-point",  "location": "Floor 2",
        "status": "Down", "response_time_ms": None,
        "uptime_hours": None, "packet_loss_percent": 100.0,
        "last_checked": "2026-01-01T00:00:00+00:00",
    },
]

_PATCH_TARGET = "devices.views.fetch_devices_from_flask"


@pytest.fixture
def async_client():
    return AsyncClient()


# ---------------------------------------------------------------------------
# REST — GET /devices
# ---------------------------------------------------------------------------


class TestGetDevicesPositive:
    """Happy-path tests: Django proxies FastAPI data correctly."""

    async def test_returns_200(self, async_client):
        with patch(_PATCH_TARGET, new_callable=AsyncMock, return_value=MOCK_DEVICES):
            response = await async_client.get("/devices")
        assert response.status_code == 200

    async def test_response_body_is_a_list(self, async_client):
        with patch(_PATCH_TARGET, new_callable=AsyncMock, return_value=MOCK_DEVICES):
            response = await async_client.get("/devices")
        assert isinstance(json.loads(response.content), list)

    async def test_returns_all_three_devices(self, async_client):
        with patch(_PATCH_TARGET, new_callable=AsyncMock, return_value=MOCK_DEVICES):
            response = await async_client.get("/devices")
        assert len(json.loads(response.content)) == 3

    async def test_each_device_has_required_fields(self, async_client):
        with patch(_PATCH_TARGET, new_callable=AsyncMock, return_value=MOCK_DEVICES):
            response = await async_client.get("/devices")
        required = {"id", "name", "ip_address", "status"}
        for device in json.loads(response.content):
            assert required.issubset(device.keys())

    async def test_enriched_fields_are_proxied(self, async_client):
        with patch(_PATCH_TARGET, new_callable=AsyncMock, return_value=MOCK_DEVICES):
            response = await async_client.get("/devices")
        enriched = {
            "response_time_ms", "last_checked",
            "device_type", "location", "uptime_hours", "packet_loss_percent",
        }
        for device in json.loads(response.content):
            assert enriched.issubset(device.keys())

    async def test_fetch_devices_is_awaited(self, async_client):
        with patch(_PATCH_TARGET, new_callable=AsyncMock, return_value=MOCK_DEVICES) as mock:
            await async_client.get("/devices")
        mock.assert_awaited_once()

    async def test_content_type_is_json(self, async_client):
        with patch(_PATCH_TARGET, new_callable=AsyncMock, return_value=MOCK_DEVICES):
            response = await async_client.get("/devices")
        assert "application/json" in response["Content-Type"]

    async def test_response_matches_upstream_data(self, async_client):
        with patch(_PATCH_TARGET, new_callable=AsyncMock, return_value=MOCK_DEVICES):
            response = await async_client.get("/devices")
        assert json.loads(response.content) == MOCK_DEVICES

    async def test_down_device_is_proxied_correctly(self, async_client):
        with patch(_PATCH_TARGET, new_callable=AsyncMock, return_value=MOCK_DEVICES):
            response = await async_client.get("/devices")
        devices = json.loads(response.content)
        ap = next(d for d in devices if d["name"] == "AccessPoint-FL2")
        assert ap["status"] == "Down"
        assert ap["response_time_ms"] is None


class TestGetDevicesNegative:
    """Error handling and disallowed-method tests."""

    async def test_post_returns_405(self, async_client):
        response = await async_client.post("/devices", {})
        assert response.status_code == 405

    async def test_put_returns_405(self, async_client):
        response = await async_client.put("/devices", {})
        assert response.status_code == 405

    async def test_patch_returns_405(self, async_client):
        response = await async_client.patch("/devices", {})
        assert response.status_code == 405

    async def test_delete_returns_405(self, async_client):
        response = await async_client.delete("/devices")
        assert response.status_code == 405

    async def test_unknown_endpoint_returns_404(self, async_client):
        response = await async_client.get("/nonexistent")
        assert response.status_code == 404

    async def test_devices_with_id_returns_404(self, async_client):
        response = await async_client.get("/devices/1")
        assert response.status_code == 404

    async def test_upstream_unavailable_returns_503(self, async_client):
        with patch(_PATCH_TARGET, new_callable=AsyncMock) as mock:
            mock.side_effect = httpx.RequestError("Connection refused")
            response = await async_client.get("/devices")
        assert response.status_code == 503

    async def test_upstream_error_response_returns_502(self, async_client):
        mock_resp = httpx.Response(500, request=httpx.Request("GET", "http://test"))
        with patch(_PATCH_TARGET, new_callable=AsyncMock) as mock:
            mock.side_effect = httpx.HTTPStatusError(
                "error", request=mock_resp.request, response=mock_resp
            )
            response = await async_client.get("/devices")
        assert response.status_code == 502

    async def test_503_body_contains_error_key(self, async_client):
        with patch(_PATCH_TARGET, new_callable=AsyncMock) as mock:
            mock.side_effect = httpx.RequestError("refused")
            response = await async_client.get("/devices")
        assert "error" in json.loads(response.content)


# ---------------------------------------------------------------------------
# SSE — GET /devices/stream
# ---------------------------------------------------------------------------


class TestSSEEndpoint:
    """Tests for the Server-Sent Events stream."""

    async def test_sse_returns_200(self, async_client):
        """SSE endpoint must return 200 OK."""
        async def finite_gen(request):
            yield f"data: {json.dumps(MOCK_DEVICES)}\n\n"

        with patch("devices.views._device_sse_generator", new=finite_gen):
            response = await async_client.get("/devices/stream")
        assert response.status_code == 200

    async def test_sse_content_type_is_event_stream(self, async_client):
        """Content-Type must be text/event-stream."""
        async def finite_gen(request):
            yield f"data: {json.dumps(MOCK_DEVICES)}\n\n"

        with patch("devices.views._device_sse_generator", new=finite_gen):
            response = await async_client.get("/devices/stream")
        assert "text/event-stream" in response["Content-Type"]

    async def test_sse_sets_cache_control_no_cache(self, async_client):
        """Cache-Control must be 'no-cache' so proxies don't buffer SSE."""
        async def finite_gen(request):
            yield f"data: {json.dumps(MOCK_DEVICES)}\n\n"

        with patch("devices.views._device_sse_generator", new=finite_gen):
            response = await async_client.get("/devices/stream")
        assert response["Cache-Control"] == "no-cache"

    async def test_sse_post_returns_405(self, async_client):
        response = await async_client.post("/devices/stream", {})
        assert response.status_code == 405


# ---------------------------------------------------------------------------
# Webhook — POST /webhook/devices
# ---------------------------------------------------------------------------


class TestWebhookReceiver:
    """Tests for the FastAPI→Django webhook endpoint."""

    async def test_webhook_returns_200(self, async_client):
        """Valid webhook POST must return 200."""
        payload = {"device_id": 2, "new_status": "Up", "timestamp": "2026-01-01T00:00:00+00:00"}
        with patch(_PATCH_TARGET, new_callable=AsyncMock, return_value=MOCK_DEVICES):
            with patch("devices.views.get_channel_layer") as mock_cl:
                mock_layer = MagicMock()
                mock_layer.group_send = AsyncMock()
                mock_cl.return_value = mock_layer
                response = await async_client.post(
                    "/webhook/devices",
                    data=json.dumps(payload),
                    content_type="application/json",
                )
        assert response.status_code == 200

    async def test_webhook_response_body(self, async_client):
        """Webhook response body must confirm receipt."""
        payload = {"device_id": 2, "new_status": "Down", "timestamp": "2026-01-01T00:00:00+00:00"}
        with patch(_PATCH_TARGET, new_callable=AsyncMock, return_value=MOCK_DEVICES):
            with patch("devices.views.get_channel_layer") as mock_cl:
                mock_layer = MagicMock()
                mock_layer.group_send = AsyncMock()
                mock_cl.return_value = mock_layer
                response = await async_client.post(
                    "/webhook/devices",
                    data=json.dumps(payload),
                    content_type="application/json",
                )
        assert json.loads(response.content) == {"status": "received"}

    async def test_webhook_broadcasts_to_channel_group(self, async_client):
        """Webhook must call group_send on the 'devices' channel group."""
        payload = {"device_id": 2, "new_status": "Up", "timestamp": "2026-01-01T00:00:00+00:00"}
        with patch(_PATCH_TARGET, new_callable=AsyncMock, return_value=MOCK_DEVICES):
            with patch("devices.views.get_channel_layer") as mock_cl:
                mock_layer = MagicMock()
                mock_layer.group_send = AsyncMock()
                mock_cl.return_value = mock_layer
                await async_client.post(
                    "/webhook/devices",
                    data=json.dumps(payload),
                    content_type="application/json",
                )
        mock_layer.group_send.assert_awaited_once()
        call_args = mock_layer.group_send.call_args[0]
        assert call_args[0] == "devices"
        assert call_args[1]["type"] == "devices_update"

    async def test_webhook_get_returns_405(self, async_client):
        response = await async_client.get("/webhook/devices")
        assert response.status_code == 405

    async def test_webhook_invalid_json_returns_400(self, async_client):
        response = await async_client.post(
            "/webhook/devices",
            data="not-json",
            content_type="application/json",
        )
        assert response.status_code == 400


# ---------------------------------------------------------------------------
# WebSocket consumer — ws://host/ws/devices/
# ---------------------------------------------------------------------------


class TestWebSocketConsumer:
    """Tests for the Channels WebSocket consumer."""

    async def test_websocket_connect(self):
        """Client must be able to connect to /ws/devices/."""
        from nre_project.asgi import application
        communicator = WebsocketCommunicator(application, "/ws/devices/")
        with patch(_PATCH_TARGET, new_callable=AsyncMock, return_value=MOCK_DEVICES):
            connected, _ = await communicator.connect()
        assert connected
        await communicator.disconnect()

    async def test_websocket_receives_initial_snapshot(self):
        """On connect the consumer must immediately push device data."""
        from nre_project.asgi import application
        communicator = WebsocketCommunicator(application, "/ws/devices/")
        with patch(_PATCH_TARGET, new_callable=AsyncMock, return_value=MOCK_DEVICES):
            await communicator.connect()
            message = await communicator.receive_json_from()
        assert message["type"] == "devices_update"
        assert message["trigger"] == "initial"
        assert message["devices"] == MOCK_DEVICES
        await communicator.disconnect()

    async def test_websocket_responds_to_refresh_command(self):
        """Sending {"command":"refresh"} must trigger a new device snapshot."""
        from nre_project.asgi import application
        communicator = WebsocketCommunicator(application, "/ws/devices/")
        with patch(_PATCH_TARGET, new_callable=AsyncMock, return_value=MOCK_DEVICES):
            await communicator.connect()
            await communicator.receive_json_from()  # consume initial
            await communicator.send_json_to({"command": "refresh"})
            message = await communicator.receive_json_from()
        assert message["type"] == "devices_update"
        assert message["trigger"] == "manual"
        await communicator.disconnect()

    async def test_websocket_disconnect(self):
        """Disconnecting must not raise an exception."""
        from nre_project.asgi import application
        communicator = WebsocketCommunicator(application, "/ws/devices/")
        with patch(_PATCH_TARGET, new_callable=AsyncMock, return_value=MOCK_DEVICES):
            await communicator.connect()
            await communicator.receive_json_from()
        await communicator.disconnect()


# ---------------------------------------------------------------------------
# Trigger proxy — POST /devices/trigger
# ---------------------------------------------------------------------------

_TRIGGER_RESULT = {
    "triggered":   True,
    "device_id":   6,
    "device_name": "AccessPoint-FL2",
    "new_status":  "Up",
}

_TRIGGER_PATCH = "devices.views.httpx.AsyncClient"


class TestTriggerProxy:
    """Tests for POST /devices/trigger (Django proxies to FastAPI trigger)."""

    async def test_trigger_returns_200(self, async_client):
        """Valid trigger request must return 200 OK."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = _TRIGGER_RESULT
        mock_resp.raise_for_status = MagicMock()
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_resp)
        with patch(_TRIGGER_PATCH, return_value=mock_client):
            response = await async_client.post("/devices/trigger")
        assert response.status_code == 200

    async def test_trigger_returns_fastapi_payload(self, async_client):
        """Response body must match the payload returned by FastAPI."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = _TRIGGER_RESULT
        mock_resp.raise_for_status = MagicMock()
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_resp)
        with patch(_TRIGGER_PATCH, return_value=mock_client):
            response = await async_client.post("/devices/trigger")
        assert json.loads(response.content) == _TRIGGER_RESULT

    async def test_trigger_get_returns_405(self, async_client):
        """GET /devices/trigger must return 405."""
        response = await async_client.get("/devices/trigger")
        assert response.status_code == 405

    async def test_trigger_upstream_unavailable_returns_503(self, async_client):
        """503 must be returned when FastAPI is unreachable."""
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(side_effect=httpx.RequestError("refused"))
        with patch(_TRIGGER_PATCH, return_value=mock_client):
            response = await async_client.post("/devices/trigger")
        assert response.status_code == 503

    async def test_trigger_upstream_error_returns_502(self, async_client):
        """502 must be returned when FastAPI responds with an error status."""
        mock_req = httpx.Request("POST", "http://test")
        mock_resp_err = httpx.Response(500, request=mock_req)
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(
            side_effect=httpx.HTTPStatusError("error", request=mock_req, response=mock_resp_err)
        )
        with patch(_TRIGGER_PATCH, return_value=mock_client):
            response = await async_client.post("/devices/trigger")
        assert response.status_code == 502
