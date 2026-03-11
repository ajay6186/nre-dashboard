"""
ASGI configuration for the NRE Network Device Dashboard.

Handles both standard HTTP requests and WebSocket connections:
  - HTTP  → Django views (REST, SSE, webhook receiver)
  - WS    → Django Channels consumers (/ws/devices/)

Daphne (added first to INSTALLED_APPS) uses this file automatically
when you run `python manage.py runserver`.
"""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nre_project.settings")

# Initialise Django apps BEFORE importing anything that depends on them
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
import nre_project.routing  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": URLRouter(nre_project.routing.websocket_urlpatterns),
    }
)
