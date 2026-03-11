"""
Django settings for the NRE Network Device Dashboard.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY: change this in production
SECRET_KEY = 'django-insecure-nre-assessment-key-not-for-production'

DEBUG = True

ALLOWED_HOSTS = ['127.0.0.1', '127.0.0.0', 'localhost', '*']

# daphne MUST be first so `manage.py runserver` uses the ASGI server
INSTALLED_APPS = [
    'daphne',
    'django.contrib.contenttypes',
    'corsheaders',
    'rest_framework',
    'channels',
    'devices',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'nre_project.urls'

# ASGI application — used by Daphne for HTTP + WebSocket
ASGI_APPLICATION = 'nre_project.asgi.application'

# Allow the React dev server to call the API
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

USE_TZ = True
STATIC_URL = '/static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---------------------------------------------------------------------------
# Channel Layers
# In Docker (REDIS_URL env var set): use Redis for multi-process fan-out.
# Locally / in tests: use in-memory layer (no Redis required).
# ---------------------------------------------------------------------------
_REDIS_URL = os.getenv("REDIS_URL")

if _REDIS_URL:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [_REDIS_URL]},
        }
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }

# ---------------------------------------------------------------------------
# Service URLs
# ---------------------------------------------------------------------------

# FastAPI device-status microservice URL
FLASK_SERVICE_URL = os.getenv("FLASK_SERVICE_URL", "http://127.0.0.1:5001")

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [],
    'UNAUTHENTICATED_USER': None,
}
