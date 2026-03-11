"""
Root URL configuration for the NRE Network Device Dashboard.
"""
from django.urls import path, include

urlpatterns = [
    path('', include('devices.urls')),
]
