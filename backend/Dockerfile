FROM python:3.11-slim

WORKDIR /app

# Copy deps first — this layer only rebuilds when requirements.txt changes.
# Adding new routes, models, or workers never invalidates this cache.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code. New features land here — no Dockerfile changes needed.
COPY . .

# Non-root user for security
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

# PORT is set dynamically by Render/Railway/Fly. Falls back to 8000 locally.
# Shell form is intentional here so ${PORT:-8000} expands correctly.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
