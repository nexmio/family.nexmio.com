# Stage 1: build the frontend
FROM docker.io/library/node:22-alpine AS frontend
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json frontend/
RUN cd frontend && npm ci
COPY frontend frontend
RUN cd frontend && npm run build

# Stage 2: the backend image, which also serves the built frontend
FROM docker.io/library/python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NEXMIO_DATA_DIR=/data \
    NEXMIO_FRONTEND_DIR=/app/frontend_dist
WORKDIR /app
COPY backend/pyproject.toml backend/pyproject.toml
COPY backend/app backend/app
RUN pip install --no-cache-dir ./backend
COPY --from=frontend /src/frontend/dist /app/frontend_dist
RUN useradd --uid 10001 --create-home app && mkdir /data && chown app /data
USER app
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request as u; u.urlopen('http://localhost:8080/api/health')"
CMD ["uvicorn", "app.main:get_app", "--factory", "--host", "0.0.0.0", "--port", "8080"]
