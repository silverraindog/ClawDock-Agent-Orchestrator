# ==============================================================================
# STAGE 1: Build & Setup EverMemos MCP Environment
# ==============================================================================
FROM node:26-bookworm-slim AS mcp-builder

# Install uv from the official image cleanly
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV DEBIAN_FRONTEND=noninteractive
ENV UV_CACHE_DIR=/tmp/everos-mcp/.uv_cache

# Install dependencies required to fetch the repository and compile Python wheels if needed
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    git \
    python3 \
    python3-pip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Clone and construct the workspace inside our build isolation stage
WORKDIR /tmp/everos-mcp
RUN git clone https://github.com/tt-a1i/everos-mcp.git .

# Build/Synchronize Python virtual environments globally or isolated
RUN uv sync --group dev

# Generate the wrapper executable ahead of time
RUN mkdir -p /usr/local/bin && \
    echo '#!/bin/bash' > /usr/local/bin/everos && \
    echo 'exec uv run --directory /tmp/everos-mcp evermemos-mcp "$@"' >> /usr/local/bin/everos && \
    chmod +x /usr/local/bin/everos


# ==============================================================================
# STAGE 2: Combine with Official OpenClaw base Image
# ==============================================================================
FROM ghcr.io/openclaw/openclaw:2026.8.1

USER root

# Bring in the official 'uv' binary and python runtime elements
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install the minimal runtime Python packages to support your underlying MCP tasks
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Create custom user/group with ID 1002 matching your docker-compose setting
RUN groupadd -g 1002 openclaw && \
    useradd -u 1002 -g 1002 -m -s /bin/bash openclaw

# Copy your compiled/synchronized everos workspace and customized tool execution wrappers
COPY --from=mcp-builder /tmp/everos-mcp /tmp/everos-mcp
COPY --from=mcp-builder /usr/local/bin/everos /usr/local/bin/everos

# Ensure the new openclaw user explicitly owns the workspace files
RUN chown -R openclaw:openclaw /tmp/everos-mcp

# Set custom environmental paths to align with the new home workspace setup
ENV HOME=/home/openclaw
ENV OPENCLAW_HOME=/home/openclaw
ENV PATH="/home/openclaw/.local/bin:${PATH}"

# Switch execution user to the newly constructed openclaw profile
USER openclaw
WORKDIR /home/openclaw

# Configure plugin configurations via npx commands directly inside the target image configuration
RUN npx --yes --package @everos-ai/openclaw-plugin everos-setup --grant --accept-capabilities --no-restart && \
    openclaw plugins enable evermind-ai-everos --accept-capabilities

# Map data configurations to your custom persistent storage path
VOLUME ["/home/openclaw"]
EXPOSE 18789

# Hand the execution process flow back to the parent gateway service configuration
CMD ["openclaw", "gateway", "--allow-unconfigured"]
