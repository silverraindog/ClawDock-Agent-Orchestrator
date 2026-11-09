# ClawDock Agent Orchestrator

A unified Docker orchestration and configuration studio for **Hermes-Agent**, **ZeroClaw**, **OpenClaw**, and **PicoClaw**. Designed with the edge-tech aesthetics inspired by Sipeed PicoClaw WebUI.

---

## Supported AI Agent Runtimes

| Agent | Framework / Language | Default Port | Docker Image | Description |
|---|---|---|---|---|
| **Hermes Agent** | Nous Research / Python 3.11 | `8080` | `ghcr.io/nousresearch/hermes-agent:latest` | Autonomous coding and multi-step reasoning agent with episodic memory |
| **ZeroClaw** | ZeroClaw Engine / Rust | `8081` | `zeroclaw/zeroclaw:latest` | Sub-15MB RAM footprint agent for edge devices, VPS & embedded hardware |
| **OpenClaw** | OpenClaw / Node.js | `8082` | `openclaw/openclaw:latest` | Multi-channel gateway connecting 16+ chat platforms (Telegram, Discord, Slack) |
| **PicoClaw** | Sipeed Edge / Go | `8083` | `sipeed/picoclaw:latest` | Ultra-lightweight assistant for RISC-V LicheeRV and Raspberry Pi boards |

---

## Features

1. **Docker Agent Detection & Installation**
   - Automatically queries `/var/run/docker.sock` to detect installed or running agent containers.
   - One-click Pull, Run, Stop, Restart, and Log Inspection.
2. **Full Configuration Schema with Dropdown Menus**
   - **Model & Reasoning**: Dropdown selectors for LLM Provider (OpenAI, Anthropic Claude, Gemini, DeepSeek, Groq, Mistral, Ollama, OpenRouter), Model name, Reasoning Effort (None, Low, Medium, High, Extended), Temperature slider, Context Window size (4k to 2M), and Max Output Tokens.
   - **Multi-Channel Gateway**: Telegram (Polling/Webhook), Discord, Slack (Socket Mode), WhatsApp, Matrix, and REST Webhook.
   - **System Prompt & Persona**: Presets for Software Engineer, Autonomous Researcher, DevOps Specialist, and Edge Assistant.
   - **Security Sandbox**: Docker Container Isolated, Host Restricted, or Read-Only Safe Mode.
   - **Storage & Memory**: SQLite, Chroma Vector DB, Redis, or Markdown files.
   - **Raw Schema Editor**: Live bidirectional JSON schema editing and validation.
3. **Skills Hub (`SKILL.md` Specification)**
   - Search, install, and uninstall capabilities compliant with Hermes-Agent, OpenClaw, and PicoClaw.
   - Custom `SKILL.md` authoring tool.
4. **Model Context Protocol (MCP) Server Registry**
   - Connect official MCP servers (Filesystem, GitHub, Brave Search, PostgreSQL, SQLite, Docker, Puppeteer, Fetch).
   - Custom MCP server registration with `stdio` and `sse` transports.
5. **Interactive Agent Console**
   - Live prompt execution with step-by-step chain-of-thought traces and tool execution logs.

---

## Running with Docker Compose

Ensure both `docker-compose.yml` and `Dockerfile` are located in the target directory (e.g. `/opt/bots/bot-admin-ui`):

```bash
# In /opt/bots/bot-admin-ui
docker compose up -d --build clawdock-orchestrator
```

Access the web interface at **http://localhost:3000**.

### Migrating the athena bot containers

The `bots` profile is opt-in. The service definitions are tailored to athena's
existing paths and require Docker Compose 2.30 or later for raw environment
files. They do not automatically migrate existing containers. The existing
host Compose file has local changes; review and merge those changes rather than
overwriting it. Back up the Compose files and bot data before proceeding.

1. Copy the private, git-ignored `.env.hermes`, `.env.zeroclaw`,
   `.env.openclaw` and `.env.picoclaw` files to the orchestrator directory on
   athena over a secure connection. Keep their permissions restrictive. The
   OpenClaw and ZeroClaw MCP files remain at `/opt/bots/openclaw/.env-mcp`
   and `/opt/bots/zeroclaw/.env-mcp`; they are mounted at runtime rather than
   baked into images.
2. With the old PicoClaw launcher stopped, manually copy its live data from
   `/opt/picaclaw/data` to `/home/picoclaw`, preserving ownership, permissions,
   and contents. Do not remove the original until the new launcher is verified.
3. Ensure the prepared Compose file and `docker/` Dockerfiles are in
   `/opt/bots/ClawDock-Agent-Orchestrator`. Set `CLAWDOCK_HOST_DIR` if using a
   different absolute host path, and `COMPOSE_PROJECT_NAME` if the project is
   not `clawdock-agent-orchestrator`. The project directory must be mounted at
   the same absolute path in the orchestrator container for Docker Compose.
   The socket and project mount grant the orchestrator powerful access to the
   host and sensitive configuration: only expose it to trusted users.
4. Run `docker compose --profile bots config --quiet` on the host. Build the
   custom images with `docker compose --profile bots build zeroclaw openclaw`.
   Before starting each replacement, stop and remove only its old container
   using its original Compose project. The old Hermes, ZeroClaw, and OpenClaw
   projects are `hermes`, `zeroclaw`, and `openclaw` respectively. The old
   PicoClaw launcher is in project `picaclaw`; its original Compose file is
   unavailable, so inspect it before removing that container. Do not remove
   volumes or the shared `claw-network`.
5. Start only the services you intend to run, for example
   `docker compose up -d hermes zeroclaw picoclaw-launcher`. OpenClaw was
   stopped/unhealthy in the inspected deployment; do not start it until its
   configuration has been reviewed. Verify each container, its mounts and
   logs before retiring the old setup. Service recreation interrupts agents.

Hermes and the PicoClaw launcher use their official images directly; their
separate Dockerfiles are provided for optional customization. ZeroClaw and
OpenClaw use the separate custom Dockerfiles in `docker/`. If customizing the
official-image services, adjust the update workflow accordingly.

Once migration is verified and access to the orchestrator is restricted to
trusted users, export `CLAWDOCK_ENABLE_COMPOSE_UPDATES=true` on the host (or
add it to the private Compose `.env` file), then run
`docker compose up -d clawdock-orchestrator`. The update API can interrupt
Hermes, so it is disabled by default.

The production Python backend can update **migrated, running** Hermes by
pulling the official `latest` tag and recreating that service. It verifies
Compose ownership and the running container image, but does not check
application health or automatically roll back. Registry scans, other
component updates, and bulk updates are not implemented. The development
Express backend rejects update requests rather than simulating success.

### Troubleshooting: `failed to read dockerfile: open Dockerfile: no such file or directory`
If you encounter this error, `docker-compose.yml` is attempting to build the `clawdock-orchestrator` service using `context: .` and `dockerfile: Dockerfile`, but the `Dockerfile` is missing from your working directory.

To fix:
1. Ensure `Dockerfile` is copied/saved in `/opt/bots/bot-admin-ui/Dockerfile`.
2. Or download the complete tarball from the web UI:
   ```bash
   curl -fsSL "http://<your-host>:3000/api/export/archive.tar.gz" | tar -xz
   ```
3. Re-run:
   ```bash
   docker compose build && docker compose up -d
   ```
