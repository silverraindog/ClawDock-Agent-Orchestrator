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
docker compose down && docker compose build && docker compose up -d && docker compose logs -f
```

Access the web interface at **http://localhost:3000**.

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
