# Stage 1: Extract the latest ZeroClaw binary
FROM ghcr.io/zeroclaw-labs/zeroclaw:latest AS zeroclaw-source

# Stage 2: Build the final environment using a lean, stable Python base
FROM python:3.12-slim

ENV ZEROCLAW_CONFIG_PATH=/home/zeroclaw/config.toml
# FIXES: "neither $SHELL nor %ComSpec% is set"
ENV SHELL=/bin/bash

# Install nano and basic runtime tools (Debian-based slim)
RUN apt-get update && apt-get install -y --no-install-recommends \
    nano \
    bash \
    git \
    iputils-ping \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the zero-claw binary from the official image
COPY --from=zeroclaw-source /usr/local/bin/zeroclaw /usr/local/bin/zeroclaw

# Create user/group with UID/GID 1001 and ensure correct directory ownership
RUN (groupadd -g 1001 zeroclaw || true) && \
    (useradd -u 1001 -g 1001 -m -s /bin/bash zeroclaw || useradd -g 1001 -m -s /bin/bash zeroclaw) && \
    mkdir -p /home/zeroclaw && \
    chown -R 1001:1001 /home/zeroclaw

RUN git clone https://github.com/tt-a1i/everos-mcp.git /tmp/everos-mcp

WORKDIR /tmp/everos-mcp
# Install 'uv' globally via pip (Native to the Python environment)
RUN pip install --no-cache-dir uv

# Ensure uv's user-level application binaries end up in the path for user 1001
ENV PATH="/home/zeroclaw/.local/bin:${PATH}"

# Set the default working directory
WORKDIR /home/zeroclaw

# Switch to the non-root user
USER zeroclaw

# Expose the default communication port
EXPOSE 42617

# Run the daemon by default
ENTRYPOINT ["zeroclaw"]
CMD ["daemon"]
