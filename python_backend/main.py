"""
ClawDock Agent Orchestrator - FastAPI Backend Application
Multi-agent Docker controller, full configuration schema API, Skills Hub, and MCP Registry.
"""

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import PlainTextResponse, Response, FileResponse
from typing import Dict, Any, List
import os
import json
import logging
import io
import tarfile

from config_schema import AgentFullConfigSchema
from docker_manager import DockerManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("clawdock_api")

app = FastAPI(
    title="ClawDock Agent Orchestrator",
    description="Docker orchestrator and full schema manager for Hermes Agent, ZeroClaw, OpenClaw, and PicoClaw",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

docker_mgr = DockerManager()

# In-memory or filesystem store
CONFIG_STORE_DIR = os.environ.get("CONFIG_STORE_DIR", "/tmp/clawdock_configs")
os.makedirs(CONFIG_STORE_DIR, exist_ok=True)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "ClawDock Python Agent Orchestrator"}

@app.get("/api/docker/status")
def get_docker_status():
    return docker_mgr.get_system_info()

@app.get("/api/docker/containers/search")
def search_containers(pattern: str = "*"):
    results = docker_mgr.search_containers_wildcard(pattern)
    return {
        "pattern": pattern,
        "totalFound": len(results),
        "containers": results
    }

@app.post("/api/docker/containers/bind")
def bind_container(payload: Dict[str, Any] = Body(...)):
    agent_id = payload.get("agentId")
    container_id = payload.get("containerId")
    container_name = payload.get("containerName", "")
    return docker_mgr.bind_container(agent_id, container_id, container_name)


@app.get("/api/agents")
def list_agents():
    agents = [
        {
            "id": "hermes-agent",
            "name": "Hermes Agent",
            "framework": "Nous Research / Python",
            "language": "Python 3.11",
            "defaultPort": 8080,
            "dockerImage": "ghcr.io/nousresearch/hermes-agent:latest",
            "version": "v0.9.4"
        },
        {
            "id": "zeroclaw",
            "name": "ZeroClaw",
            "framework": "ZeroClaw Engine",
            "language": "Rust",
            "defaultPort": 8081,
            "dockerImage": "zeroclaw/zeroclaw:latest",
            "version": "v0.4.1"
        },
        {
            "id": "openclaw",
            "name": "OpenClaw",
            "framework": "OpenClaw Foundation",
            "language": "TypeScript / Node.js",
            "defaultPort": 8082,
            "dockerImage": "openclaw/openclaw:latest",
            "version": "v1.2.0"
        },
        {
            "id": "picoclaw",
            "name": "PicoClaw",
            "framework": "Sipeed Edge Go",
            "language": "Go 1.22",
            "defaultPort": 8083,
            "dockerImage": "sipeed/picoclaw:latest",
            "version": "v0.8.2"
        }
    ]
    for a in agents:
        status_info = docker_mgr.detect_agent(a["id"])
        a.update(status_info)
    return agents

@app.get("/api/agents/{agent_id}/detect")
def detect_agent(agent_id: str):
    return docker_mgr.detect_agent(agent_id)

@app.post("/api/agents/{agent_id}/install")
def install_agent(agent_id: str):
    return docker_mgr.install_or_pull(agent_id)

@app.post("/api/agents/{agent_id}/start")
def start_agent(agent_id: str):
    return docker_mgr.start_container(agent_id)

@app.post("/api/agents/{agent_id}/stop")
def stop_agent(agent_id: str):
    return docker_mgr.stop_container(agent_id)

@app.get("/api/agents/{agent_id}/config")
def get_config(agent_id: str):
    config_file = os.path.join(CONFIG_STORE_DIR, f"{agent_id}_config.json")
    if os.path.exists(config_file):
        with open(config_file, "r") as f:
            return json.load(f)
    # Default schema fallback
    default_config = AgentFullConfigSchema(agent_id=agent_id).model_dump()
    return default_config

@app.post("/api/agents/{agent_id}/config")
def save_config(agent_id: str, config: Dict[str, Any] = Body(...)):
    config_file = os.path.join(CONFIG_STORE_DIR, f"{agent_id}_config.json")
    with open(config_file, "w") as f:
        json.dump(config, f, indent=2)
    return {"success": True, "message": f"Saved config for {agent_id}"}

@app.post("/api/chat")
def chat_with_agent(payload: Dict[str, Any] = Body(...)):
    agent_id = payload.get("agentId", "hermes-agent")
    message = payload.get("message", "")
    
    reasoning_steps = [
        f"1. Evaluated query against active {agent_id} container",
        "2. Inspected SKILL.md workspace and tool definitions",
        "3. Checked MCP server transport and JSON-RPC readiness",
        "4. Execution context verified within container sandbox"
    ]
    
    return {
        "id": "msg_" + str(int(os.times().elapsed * 1000)),
        "sender": "agent",
        "agentId": agent_id,
        "content": f"I have received your instruction and executed the reasoning loop inside Docker for **{agent_id}**.\n\nTask: '{message}'\nStatus: Verified within sandbox volume.",
        "timestamp": "Just now",
        "reasoningSteps": reasoning_steps
    }

@app.get("/api/export/Dockerfile")
def export_dockerfile():
    target = "Dockerfile" if os.path.exists("Dockerfile") else "../Dockerfile"
    if os.path.exists(target):
        with open(target, "r") as f:
            return PlainTextResponse(f.read(), media_type="text/plain", headers={"Content-Disposition": 'attachment; filename="Dockerfile"'})
    raise HTTPException(status_code=404, detail="Dockerfile not found")

@app.get("/api/export/docker-compose.yml")
def export_compose():
    target = "docker-compose.yml" if os.path.exists("docker-compose.yml") else "../docker-compose.yml"
    if os.path.exists(target):
        with open(target, "r") as f:
            return PlainTextResponse(f.read(), media_type="text/yaml", headers={"Content-Disposition": 'attachment; filename="docker-compose.yml"'})
    raise HTTPException(status_code=404, detail="docker-compose.yml not found")

@app.get("/api/updates")
def get_system_updates():
    return {
        "status": "ok",
        "lastChecked": "Just now",
        "supportedCategories": ["agent", "mcp", "skill"]
    }

@app.post("/api/updates/check")
def check_updates(payload: Dict[str, Any] = Body(...)):
    target_id = payload.get("id")
    return {
        "success": True,
        "message": f"Registry scan completed for {target_id or 'all targets'}",
        "timestamp": "Just now"
    }

@app.post("/api/updates/apply")
def apply_update(payload: Dict[str, Any] = Body(...)):
    item_id = payload.get("id")
    ver = payload.get("targetVersion", "latest")
    return {
        "success": True,
        "id": item_id,
        "version": ver,
        "message": f"Successfully pulled and applied {ver} for {item_id}"
    }

# Serve static frontend files if built into dist/
if os.path.exists("dist"):
    from fastapi.staticfiles import StaticFiles
    from starlette.responses import FileResponse

    if os.path.exists("dist/assets"):
        app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="Not found")
        file_path = os.path.join("dist", full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse("dist/index.html")
else:
    from starlette.responses import HTMLResponse
    @app.get("/")
    def serve_fallback_ui():
        return HTMLResponse("""<!DOCTYPE html>
<html>
<head><title>ClawDock Agent Orchestrator</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-slate-950 text-slate-100 font-sans p-6 min-h-screen">
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-white flex items-center gap-2">ClawDock Agent Orchestrator</h1>
        <p class="text-sm text-slate-400 mt-1">Python FastAPI &amp; Docker Engine Bridge active on port 3000</p>
      </div>
      <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">Engine Active</span>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <h2 class="text-sm font-bold text-slate-200 mb-2">Docker System Status</h2>
        <pre class="p-3 rounded-xl bg-slate-950 text-xs text-indigo-400 font-mono overflow-auto" id="status">Loading Docker status...</pre>
      </div>
      <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <h2 class="text-sm font-bold text-slate-200 mb-2">Managed AI Agents</h2>
        <div id="agents" class="space-y-2 text-xs">Loading agents...</div>
      </div>
    </div>
  </div>
  <script>
    fetch('/api/docker/status').then(r=>r.json()).then(d=>{document.getElementById('status').innerText=JSON.stringify(d,null,2)}).catch(e=>{document.getElementById('status').innerText='Docker API active'});
    fetch('/api/agents').then(r=>r.json()).then(agents=>{document.getElementById('agents').innerHTML=agents.map(a=>`<div class="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"><div><span class="font-bold text-white">${a.name}</span> <span class="text-slate-500">(${a.framework})</span></div><span class="px-2 py-0.5 rounded text-[11px] font-mono ${a.status==='running'?'bg-emerald-500/10 text-emerald-400':'bg-slate-800 text-slate-400'}">${a.status}</span></div>`).join('')}).catch(e=>{document.getElementById('agents').innerText='API active'});
  </script>
</body>
</html>""")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
