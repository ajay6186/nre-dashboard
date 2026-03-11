from django.urls import path

from . import views

urlpatterns = [
    path("devices",           views.get_devices,            name="get_devices"),
    path("devices/stream",    views.sse_devices_stream,     name="sse_devices_stream"),
    path("devices/trigger",   views.trigger_device_change,  name="trigger_device_change"),
    path("webhook/devices",   views.receive_webhook,        name="receive_webhook"),
]
