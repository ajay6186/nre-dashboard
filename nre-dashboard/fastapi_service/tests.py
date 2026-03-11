"""
Unit tests for the FastAPI Device Status microservice.

Uses FastAPI's TestClient (built on httpx + Starlette) which runs the ASGI
app in-process — no running server is required.

Covers:
  - REST  GET /devices          (positive + negative)
  - SSE   GET /devices/stream   (headers + first event)
"""
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app import _DEVICE_INVENTORY, _UNSTABLE_DEVICE_IDS, _poll_device, app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Positive test cases
# ---------------------------------------------------------------------------


class TestGetDevicesPositive:
    """Happy-path tests for GET /devices on the FastAPI service."""

    def test_returns_200(self):
        """Endpoint must respond with HTTP 200 OK."""
        assert client.get("/devices").status_code == 200

    def test_returns_json_list(self):
        """Response body must be a JSON array."""
        assert isinstance(client.get("/devices").json(), list)

    def test_returns_correct_device_count(self):
        """Number of returned devices must match the inventory."""
        assert len(client.get("/devices").json()) == len(_DEVICE_INVENTORY)

    def test_each_device_has_required_fields(self):
        """Every device must expose all required fields."""
        required = {
            "id", "name", "ip_address", "device_type", "location",
            "status", "response_time_ms", "uptime_hours",
            "packet_loss_percent", "last_checked",
        }
        for device in client.get("/devices").json():
            assert required.issubset(device.keys()), (
                f"Device '{device.get('name')}' is missing required fields."
            )

    def test_status_values_are_valid(self):
        """Status must be one of the accepted values."""
        for device in client.get("/devices").json():
            assert device["status"] in ("Up", "Down", "Unknown")

    def test_down_device_has_null_response_time(self):
        """Devices that are Down must have response_time_ms = null."""
        for device in client.get("/devices").json():
            if device["status"] == "Down":
                assert device["response_time_ms"] is None

    def test_up_devices_have_positive_response_time(self):
        """Devices that are Up must have a positive response_time_ms."""
        for device in client.get("/devices").json():
            if device["status"] == "Up":
                assert device["response_time_ms"] is not None
                assert device["response_time_ms"] > 0

    def test_last_checked_is_valid_iso8601(self):
        """last_checked must be a parseable ISO-8601 datetime string."""
        for device in client.get("/devices").json():
            datetime.fromisoformat(device["last_checked"])

    def test_device_ids_are_unique(self):
        """All device IDs in the response must be unique."""
        ids = [d["id"] for d in client.get("/devices").json()]
        assert len(ids) == len(set(ids))

    def test_core_router_is_up(self):
        """CoreRouter-01 must be reported as Up with correct IP."""
        devices = client.get("/devices").json()
        router = next(d for d in devices if d["name"] == "CoreRouter-01")
        assert router["status"] == "Up"
        assert router["ip_address"] == "192.168.0.1"

    def test_accesspoint_fl2_starts_down(self):
        """AccessPoint-FL2 must start as Down (initial state)."""
        devices = client.get("/devices").json()
        ap = next(d for d in devices if d["name"] == "AccessPoint-FL2")
        assert ap["status"] == "Down"
        assert ap["response_time_ms"] is None

    def test_firewall_primary_is_up(self):
        """Firewall-Primary must be reported as Up."""
        devices = client.get("/devices").json()
        firewall = next(d for d in devices if d["name"] == "Firewall-Primary")
        assert firewall["status"] == "Up"

    def test_device_type_values_are_valid(self):
        """device_type must be one of the accepted values."""
        valid_types = {"router", "switch", "firewall", "access-point", "server", "load-balancer"}
        for device in client.get("/devices").json():
            assert device["device_type"] in valid_types

    def test_location_field_is_present(self):
        """Every device must have a non-empty location string."""
        for device in client.get("/devices").json():
            assert isinstance(device["location"], str)
            assert len(device["location"]) > 0

    def test_down_device_has_null_uptime(self):
        """Devices that are Down must have uptime_hours = null."""
        for device in client.get("/devices").json():
            if device["status"] == "Down":
                assert device["uptime_hours"] is None

    def test_down_device_has_full_packet_loss(self):
        """Devices that are Down must have packet_loss_percent = 100.0."""
        for device in client.get("/devices").json():
            if device["status"] == "Down":
                assert device["packet_loss_percent"] == 100.0


# ---------------------------------------------------------------------------
# Negative test cases
# ---------------------------------------------------------------------------


class TestGetDevicesNegative:
    """Error and edge-case tests for the FastAPI service."""

    def test_post_not_allowed(self):
        """POST to /devices must return 405 Method Not Allowed."""
        assert client.post("/devices").status_code == 405

    def test_put_not_allowed(self):
        """PUT to /devices must return 405 Method Not Allowed."""
        assert client.put("/devices").status_code == 405

    def test_delete_not_allowed(self):
        """DELETE to /devices must return 405 Method Not Allowed."""
        assert client.delete("/devices").status_code == 405

    def test_unknown_route_returns_404(self):
        """Requests to unknown routes must return 404 Not Found."""
        assert client.get("/nonexistent").status_code == 404

    def test_openapi_docs_available(self):
        """FastAPI should expose interactive docs at /docs."""
        assert client.get("/docs").status_code == 200


# ---------------------------------------------------------------------------
# SSE endpoint tests
# ---------------------------------------------------------------------------


class TestSSEStream:
    """Tests for GET /devices/stream (Server-Sent Events).

    All tests patch _sse_event_generator with a finite version to avoid
    blocking on the internal asyncio.sleep(5) in the infinite generator.
    """

    @staticmethod
    def _finite_client():
        """Return a TestClient backed by a finite SSE generator."""
        from unittest.mock import patch

        async def finite_gen(request):
            devices = [_poll_device(d).model_dump() for d in _DEVICE_INVENTORY]
            import json as _json
            yield f"data: {_json.dumps(devices)}\n\n"

        return patch("app._sse_event_generator", new=finite_gen)

    def test_sse_returns_200(self):
        """SSE endpoint must respond with HTTP 200 OK."""
        with self._finite_client():
            with client.stream("GET", "/devices/stream") as response:
                assert response.status_code == 200

    def test_sse_content_type_is_event_stream(self):
        """Content-Type must be text/event-stream."""
        with self._finite_client():
            with client.stream("GET", "/devices/stream") as response:
                assert "text/event-stream" in response.headers["content-type"]

    def test_sse_first_event_contains_valid_device_json(self):
        """The first SSE event must contain a JSON array of all devices."""
        import json
        with self._finite_client():
            with client.stream("GET", "/devices/stream") as response:
                for line in response.iter_lines():
                    if line.startswith("data:"):
                        devices = json.loads(line[5:].strip())
                        assert isinstance(devices, list)
                        assert len(devices) == len(_DEVICE_INVENTORY)
                        break


# ---------------------------------------------------------------------------
# Trigger endpoint tests — POST /devices/trigger
# ---------------------------------------------------------------------------


class TestTriggerEndpoint:
    """Tests for POST /devices/trigger (forced device state change for demo)."""

    def test_trigger_returns_200(self):
        """POST /devices/trigger must return 200 even when webhook target is down."""
        from unittest.mock import patch, AsyncMock
        with patch("app._send_webhook", new_callable=AsyncMock):
            assert client.post("/devices/trigger").status_code == 200

    def test_trigger_returns_json_with_required_fields(self):
        """Response must include triggered, device_id, device_name, new_status."""
        from unittest.mock import patch, AsyncMock
        with patch("app._send_webhook", new_callable=AsyncMock):
            body = client.post("/devices/trigger").json()
        assert body["triggered"] is True
        assert body["device_id"] in _UNSTABLE_DEVICE_IDS
        assert isinstance(body["device_name"], str)
        assert body["new_status"] in ("Up", "Down")

    def test_trigger_only_changes_unstable_devices(self):
        """The triggered device must be one of the designated unstable devices."""
        from unittest.mock import patch, AsyncMock
        with patch("app._send_webhook", new_callable=AsyncMock):
            body = client.post("/devices/trigger").json()
        assert body["device_id"] in _UNSTABLE_DEVICE_IDS

    def test_trigger_fires_webhook(self):
        """POST /devices/trigger must call _send_webhook exactly once."""
        from unittest.mock import patch, AsyncMock
        with patch("app._send_webhook", new_callable=AsyncMock) as mock_webhook:
            client.post("/devices/trigger")
        mock_webhook.assert_awaited_once()

    def test_trigger_get_not_allowed(self):
        """GET to /devices/trigger must return 405 Method Not Allowed."""
        assert client.get("/devices/trigger").status_code == 405
