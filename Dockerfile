# ==============================================================================
# ClawDock Agent Orchestrator - Production Multi-Stage Dockerfile
# Stage 1: Build the Modern Sleek React Web UI (Vite + Tailwind CSS)
# Stage 2: Python 3.11 Runtime with Docker Engine CLI & Socket Bridge
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Frontend Builder
# ------------------------------------------------------------------------------
FROM node:20-slim AS frontend-builder
WORKDIR /app

# Copy package manifests
COPY package.json ./

# Install frontend dependencies
RUN npm install

# Copy source code and build Vite bundle
COPY tsconfig.json vite.config.ts index.html server.ts ./
COPY src/ ./src/
COPY public/ ./public/

# Compile production SPA into /app/dist
RUN npx vite build

# ------------------------------------------------------------------------------
# Stage 2: Python Backend & Docker Orchestration Runtime
# ------------------------------------------------------------------------------
FROM python:3.11-slim AS runtime

LABEL maintainer="ClawDock Maintainers <support@clawdock.io>"
LABEL description="Python Web Orchestrator for Hermes-Agent, ZeroClaw, OpenClaw & PicoClaw in Docker"
LABEL version="1.4.2"

WORKDIR /app

# Install system dependencies, curl, ca-certificates, and Docker CLI
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    git \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Install official Docker CLI & Docker Compose plugin to manage containers via /var/run/docker.sock
RUN install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && apt-get install -y --no-install-recommends \
    docker-ce-cli \
    docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY python_backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python backend files
COPY python_backend/ ./

# Copy built frontend assets from Stage 1 into /app/dist for FastAPI static serving
COPY --from=frontend-builder /app/dist /app/dist

# Set up runtime configuration and data directories
ENV PORT=3000 \
    PYTHONUNBUFFERED=1 \
    CONFIG_STORE_DIR=/data/configs \
    DOCKER_HOST=unix:///var/run/docker.sock

# Create standard persistent mount points
RUN mkdir -p /data/configs /workspace

# Declare volumes for Docker socket communication and persistent storage
VOLUME ["/var/run/docker.sock", "/data/configs", "/workspace"]

# Healthcheck to verify the web service is responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Expose Web UI & API Port
EXPOSE 3000

# Start Uvicorn ASGI Server serving both FastAPI REST API and React SPA
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3000"]
