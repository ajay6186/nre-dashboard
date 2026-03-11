"""
Django Channels WebSocket consumer for real-time device status.

Clients connect to ws://host/ws/devices/ and receive:
  - An immediate device snapshot on connect (trigger: 'initial')
  - Pushed updates whenever FastAPI fires a webhook (trigger: 'webhook')
  - On-demand refresh when the client sends {"command": "refresh"}

All connected clients share the 'devices' channel group, so a single
webhook arriving at Django instantly fans out to every open browser tab.
"""
import json

from channels.generic.websocket import AsyncWebsocketConsumer


class DeviceConsumer(AsyncWebsocketConsumer):
    GROUP_NAME = "devices"

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------

    async def connect(self) -> None:
        """Join the shared group and send the initial device snapshot."""
        await self.channel_layer.group_add(self.GROUP_NAME, self.channel_name)
        await self.accept()

        # Send current device state immediately on connect
        try:
            from devices.views import fetch_devices_from_flask
            devices = await fetch_devices_from_flask()
            await self.send(json.dumps({
                "type": "devices_update",
                "devices": devices,
                "trigger": "initial",
            }))
        except Exception:
            # FastAPI may not be ready yet — client will retry via SSE/REST
            pass

    async def disconnect(self, close_code: int) -> None:
        """Leave the shared group on disconnect."""
        await self.channel_layer.group_discard(self.GROUP_NAME, self.channel_name)

    # ------------------------------------------------------------------
    # Messages from client → server
    # ------------------------------------------------------------------

    async def receive(self, text_data: str) -> None:
        """
        Handle commands sent by the React client over the WebSocket.

        Supported commands:
            {"command": "refresh"}  — fetch latest data and reply
        """
        try:
            message = json.loads(text_data)
        except json.JSONDecodeError:
            return

        if message.get("command") == "refresh":
            try:
                from devices.views import fetch_devices_from_flask
                devices = await fetch_devices_from_flask()
                await self.send(json.dumps({
                    "type": "devices_update",
                    "devices": devices,
                    "trigger": "manual",
                }))
            except Exception as exc:
                await self.send(json.dumps({
                    "type": "error",
                    "message": str(exc),
                }))

    # ------------------------------------------------------------------
    # Messages from channel layer → this consumer
    # ------------------------------------------------------------------

    async def devices_update(self, event: dict) -> None:
        """
        Called by channel_layer.group_send(..., {"type": "devices_update", ...}).
        Forwards the event as-is to the WebSocket client.
        """
        await self.send(json.dumps(event))
