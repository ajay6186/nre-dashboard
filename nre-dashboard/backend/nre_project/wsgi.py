"""
WSGI config for the NRE Network Device Dashboard.
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nre_project.settings')

application = get_wsgi_application()
