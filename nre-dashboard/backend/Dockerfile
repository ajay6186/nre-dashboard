FROM python:3.12-slim

WORKDIR /app

# Copy root requirements (shared by Django + all dev tooling)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Django project source
COPY backend/ .

EXPOSE 8000

# Daphne is the ASGI server — handles HTTP (REST/SSE) and WebSocket
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "nre_project.asgi:application"]
