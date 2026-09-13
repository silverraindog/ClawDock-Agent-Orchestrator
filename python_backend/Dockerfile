# ==============================================================================
# ClawDock Python Backend Standalone Dockerfile
# Lightweight Python 3.11 Runtime for API and Docker Engine Orchestration
# ==============================================================================
FROM python:3.11-slim

LABEL maintainer="ClawDock Maintainers <support@clawdock.io>"
LABEL description="Python FastAPI Orchestrator for Hermes, ZeroClaw, OpenClaw & PicoClaw"

WORKDIR /app

# Install system dependencies, curl, ca-certificates, and Docker CLI
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CLI to manage containers via /var/run/docker.sock
RUN install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && apt-get install -y --no-install-recommends \
    docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./

ENV PORT=3000 \
    PYTHONUNBUFFERED=1 \
    CONFIG_STORE_DIR=/data/configs \
    DOCKER_HOST=unix:///var/run/docker.sock

RUN mkdir -p /data/configs /workspace

VOLUME ["/var/run/docker.sock", "/data/configs", "/workspace"]

EXPOSE 3000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3000"]
