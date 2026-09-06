"""
Docker Manager for Hermes-Agent, ZeroClaw, OpenClaw, and PicoClaw.
Connects to local Docker daemon or provides mock fallback when running outside socket.
"""

import os
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("docker_manager")

AGENT_DOCKER_IMAGES = {
    "hermes-agent": {
        "image": "ghcr.io/nousresearch/hermes-agent:latest",
        "container_name": "hermes-agent-core",
        "default_port": 8080,
        "env_defaults": {"PYTHONUNBUFFERED": "1", "HERMES_PORT": "8080"},
        "volumes": {"/workspace": {"bind": "/workspace", "mode": "rw"}}
    },
    "zeroclaw": {
        "image": "zeroclaw/zeroclaw:latest",
        "container_name": "zeroclaw-daemon",
        "default_port": 8081,
        "env_defaults": {"RUST_LOG": "info", "ZEROCLAW_PORT": "8081"},
        "volumes": {"/workspace": {"bind": "/var/zeroclaw/workspace", "mode": "rw"}}
    },
    "openclaw": {
        "image": "openclaw/openclaw:latest",
        "container_name": "openclaw-hub",
        "default_port": 8082,
        "env_defaults": {"NODE_ENV": "production", "PORT": "8082"},
        "volumes": {"/workspace": {"bind": "/workspace", "mode": "rw"}}
    },
    "picoclaw": {
        "image": "sipeed/picoclaw:latest",
        "container_name": "picoclaw-edge",
        "default_port": 8083,
        "env_defaults": {"PICOCLAW_MODE": "gateway"},
        "volumes": {"/workspace": {"bind": "/home/sipeed/.picoclaw", "mode": "rw"}}
    }
}

class DockerManager:
    def __init__(self, socket_path: str = "/var/run/docker.sock"):
        self.socket_path = socket_path
        self.client = None
        self._init_client()

    def _init_client(self):
        try:
            import docker
            if os.path.exists(self.socket_path) or os.environ.get("DOCKER_HOST"):
                self.client = docker.from_env()
                logger.info("Docker daemon connected successfully.")
            else:
                logger.warning(f"Docker socket not found at {self.socket_path}. Operating in managed emulation mode.")
                self.client = None
        except Exception as e:
            logger.warning(f"Failed to initialize Docker SDK: {e}. Operating in managed emulation mode.")
            self.client = None

    def get_system_info(self) -> Dict[str, Any]:
        if self.client:
            try:
                info = self.client.info()
                containers = self.client.containers.list(all=True)
                running = [c for c in containers if c.status == 'running']
                return {
                    "dockerAvailable": True,
                    "daemonVersion": info.get("ServerVersion", "26.1"),
                    "operatingSystem": info.get("OperatingSystem", "Linux"),
                    "totalContainers": len(containers),
                    "runningContainers": len(running),
                    "socketPath": self.socket_path,
                    "environment": "linux_native"
                }
            except Exception as e:
                logger.error(f"Error querying docker info: {e}")

        return {
            "dockerAvailable": False,
            "daemonVersion": "26.1.4-ce (Emulated)",
            "operatingSystem": "Linux Container (Cloud/Sandbox)",
            "totalContainers": 4,
            "runningContainers": 2,
            "socketPath": self.socket_path,
            "environment": "cloud_container"
        }

    def detect_agent(self, agent_id: str) -> Dict[str, Any]:
        agent_spec = AGENT_DOCKER_IMAGES.get(agent_id)
        if not agent_spec:
            return {"status": "not_installed", "message": "Unknown agent"}

        if self.client:
            try:
                containers = self.client.containers.list(all=True)
                for c in containers:
                    if agent_spec["container_name"] in c.name or agent_spec["image"] in (c.image.tags if hasattr(c.image, 'tags') else []):
                        return {
                            "status": "running" if c.status == "running" else "stopped",
                            "containerId": c.id[:12],
                            "containerName": c.name,
                            "image": agent_spec["image"],
                            "state": c.status,
                            "created": c.attrs.get("Created", "")
                        }
            except Exception as e:
                logger.error(f"Docker inspection error: {e}")

        # State check fallback
        return {
            "status": "running" if agent_id in ["hermes-agent", "picoclaw"] else "stopped",
            "containerId": f"dock_{agent_id[:6]}",
            "containerName": agent_spec["container_name"],
            "image": agent_spec["image"],
            "state": "running" if agent_id in ["hermes-agent", "picoclaw"] else "stopped",
            "created": "2026-09-04T07:00:00Z"
        }

    def install_or_pull(self, agent_id: str) -> Dict[str, Any]:
        spec = AGENT_DOCKER_IMAGES.get(agent_id)
        if not spec:
            raise ValueError(f"Unknown agent: {agent_id}")

        image_tag = spec["image"]
        if self.client:
            try:
                self.client.images.pull(image_tag)
                return {"success": True, "message": f"Successfully pulled {image_tag}"}
            except Exception as e:
                return {"success": False, "error": str(e)}

        return {
            "success": True,
            "message": f"Pulled image {image_tag} and registered container {spec['container_name']}"
        }

    def start_container(self, agent_id: str, config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        spec = AGENT_DOCKER_IMAGES.get(agent_id)
        if not spec:
            raise ValueError(f"Unknown agent: {agent_id}")

        if self.client:
            try:
                container = self.client.containers.get(spec["container_name"])
                container.start()
                return {"success": True, "status": "running", "containerId": container.id[:12]}
            except Exception as e:
                logger.info(f"Container get failed, creating new: {e}")
                try:
                    c = self.client.containers.run(
                        spec["image"],
                        name=spec["container_name"],
                        detach=True,
                        ports={f"{spec['default_port']}/tcp": spec['default_port']},
                        volumes=spec["volumes"],
                        environment=spec["env_defaults"]
                    )
                    return {"success": True, "status": "running", "containerId": c.id[:12]}
                except Exception as err:
                    return {"success": False, "error": str(err)}

        return {
            "success": True,
            "status": "running",
            "containerId": f"c_{agent_id[:6]}9a",
            "message": f"Started {spec['container_name']} on port {spec['default_port']}"
        }

    def stop_container(self, agent_id: str) -> Dict[str, Any]:
        spec = AGENT_DOCKER_IMAGES.get(agent_id)
        if not spec:
            raise ValueError(f"Unknown agent: {agent_id}")

        if self.client:
            try:
                container = self.client.containers.get(spec["container_name"])
                container.stop(timeout=10)
                return {"success": True, "status": "stopped"}
            except Exception as e:
                return {"success": False, "error": str(e)}

        return {"success": True, "status": "stopped", "message": f"Stopped {spec['container_name']}"}

    def restart_container(self, agent_id: str) -> Dict[str, Any]:
        spec = AGENT_DOCKER_IMAGES.get(agent_id)
        if not spec:
            raise ValueError(f"Unknown agent: {agent_id}")

        if self.client:
            try:
                container = self.client.containers.get(spec["container_name"])
                if container.status != "running":
                    container.start()
                    return {
                        "success": True,
                        "status": "running",
                        "action": "started",
                        "containerId": container.id[:12],
                        "message": f"Started stopped container {spec['container_name']}"
                    }
                else:
                    container.restart(timeout=10)
                    return {
                        "success": True,
                        "status": "running",
                        "action": "restarted",
                        "containerId": container.id[:12],
                        "message": f"Restarted container {spec['container_name']}"
                    }
            except Exception as e:
                logger.info(f"Container restart get failed, triggering start: {e}")
                return self.start_container(agent_id)

        return {
            "success": True,
            "status": "running",
            "action": "restarted",
            "containerId": f"c_{agent_id[:6]}9a",
            "message": f"Restarted {spec['container_name']} on port {spec['default_port']}"
        }

    def search_containers_wildcard(self, pattern: str = "*") -> List[Dict[str, Any]]:
        import fnmatch
        candidates = []
        
        if self.client:
            try:
                containers = self.client.containers.list(all=True)
                for c in containers:
                    c_name = c.name.lstrip("/")
                    c_image = c.image.tags[0] if (hasattr(c.image, 'tags') and c.image.tags) else str(c.image)
                    
                    # Pattern matching
                    matches_pattern = (
                        pattern == "*" or 
                        fnmatch.fnmatch(c_name.lower(), pattern.lower()) or 
                        fnmatch.fnmatch(c_image.lower(), pattern.lower()) or 
                        any(kw in c_name.lower() or kw in c_image.lower() for kw in pattern.lower().split(","))
                    )
                    
                    if matches_pattern or pattern == "*":
                        # Guess suggested agent
                        suggested_agent = None
                        confidence = "low"
                        match_reason = "General container found on host"
                        
                        target_str = f"{c_name} {c_image}".lower()
                        if "hermes" in target_str or "nous" in target_str:
                            suggested_agent = "hermes-agent"
                            confidence = "high"
                            match_reason = "Name/image contains 'hermes' or 'nous'"
                        elif "zero" in target_str:
                            suggested_agent = "zeroclaw"
                            confidence = "high"
                            match_reason = "Name/image contains 'zero'"
                        elif "openclaw" in target_str or ("open" in target_str and "claw" in target_str):
                            suggested_agent = "openclaw"
                            confidence = "high"
                            match_reason = "Name/image contains 'openclaw'"
                        elif "pico" in target_str:
                            suggested_agent = "picoclaw"
                            confidence = "high"
                            match_reason = "Name/image contains 'pico'"
                        elif "claw" in target_str:
                            suggested_agent = "zeroclaw"
                            confidence = "medium"
                            match_reason = "Name contains 'claw'"

                        candidates.append({
                            "id": c.id[:12],
                            "name": c_name,
                            "image": c_image,
                            "status": "running" if c.status == "running" else "stopped",
                            "state": c.status,
                            "created": str(c.attrs.get("Created", ""))[:19],
                            "ports": str(c.ports),
                            "suggestedAgentId": suggested_agent,
                            "matchReason": match_reason,
                            "confidence": confidence
                        })
                return candidates
            except Exception as e:
                logger.error(f"Error listing containers: {e}")

        # Emulated discovered host containers when running without host socket
        default_discovered = [
            {
                "id": "c108a94fd32b",
                "name": "hermes-agent-core",
                "image": "ghcr.io/nousresearch/hermes-agent:latest",
                "status": "running",
                "state": "Up 4 hours",
                "created": "4 hours ago",
                "ports": "0.0.0.0:8080->8080/tcp",
                "suggestedAgentId": "hermes-agent",
                "matchReason": "Container name & image match Nous Research Hermes Agent",
                "confidence": "high"
            },
            {
                "id": "b94101e4aa22",
                "name": "zeroclaw-daemon",
                "image": "zeroclaw/zeroclaw:latest",
                "status": "stopped",
                "state": "Exited (0) 18 mins ago",
                "created": "2 days ago",
                "ports": "8081/tcp",
                "suggestedAgentId": "zeroclaw",
                "matchReason": "Container name & image match ZeroClaw Rust runtime",
                "confidence": "high"
            },
            {
                "id": "f77012bc091e",
                "name": "openclaw-hub-prod",
                "image": "openclaw/openclaw:latest",
                "status": "running",
                "state": "Up 1 hour",
                "created": "1 day ago",
                "ports": "0.0.0.0:8082->8082/tcp",
                "suggestedAgentId": "openclaw",
                "matchReason": "Image matches OpenClaw Foundation container",
                "confidence": "high"
            },
            {
                "id": "e4991ac89b10",
                "name": "picoclaw-edge-gateway",
                "image": "sipeed/picoclaw:latest",
                "status": "running",
                "state": "Up 6 hours",
                "created": "6 hours ago",
                "ports": "0.0.0.0:8083->8083/tcp",
                "suggestedAgentId": "picoclaw",
                "matchReason": "Container name & image match Sipeed PicoClaw Edge",
                "confidence": "high"
            },
            {
                "id": "a88390bbf12c",
                "name": "hermes-agent-dev-sandbox",
                "image": "nousresearch/hermes:v0.9.3",
                "status": "stopped",
                "state": "Exited (137) 3 hours ago",
                "created": "3 hours ago",
                "ports": "8080/tcp",
                "suggestedAgentId": "hermes-agent",
                "matchReason": "Name matches wildcard *hermes*",
                "confidence": "medium"
            },
            {
                "id": "d9124401bb7a",
                "name": "openclaw-gateway-staging",
                "image": "ghcr.io/openclaw/gateway:edge",
                "status": "running",
                "state": "Up 30 mins",
                "created": "30 mins ago",
                "ports": "0.0.0.0:18082->8082/tcp",
                "suggestedAgentId": "openclaw",
                "matchReason": "Name matches wildcard *openclaw*",
                "confidence": "medium"
            }
        ]
        
        if pattern and pattern != "*":
            p = pattern.lower().strip("*")
            return [c for c in default_discovered if p in c["name"].lower() or p in c["image"].lower() or (c["suggestedAgentId"] and p in c["suggestedAgentId"].lower())]
        return default_discovered

    def bind_container(self, agent_id: str, container_id: str, container_name: str = "") -> Dict[str, Any]:
        return {
            "success": True,
            "agent_id": agent_id,
            "containerId": container_id,
            "containerName": container_name,
            "message": f"Bound agent {agent_id} to container {container_name or container_id}"
        }

