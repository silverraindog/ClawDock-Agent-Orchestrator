import os
import json
import subprocess
import threading
from typing import Optional, Dict, Any


from docker.errors import DockerException, NotFound


HERMES_IMAGE = "docker.io/nousresearch/hermes-agent:latest"
_update_lock = threading.Lock()


class UpdateError(Exception):
    """Exception raised during compose update operations."""
    pass


class ComposeUpdateError(UpdateError):
    """Subexception for compose-specific update errors."""
    pass


def update_hermes(client: Any, directory: Optional[str] = None, project: Optional[str] = None) -> Dict[str, Any]:
    """
    Update the Hermes agent container using Docker Compose.
    
    Args:
        client: Docker client instance
        directory: Compose file directory (required if not in env)
        project: Compose project name (required if not in env)
    
    Returns:
        Dictionary with success status and container info
    
    Raises:
        UpdateError: If update fails or prerequisites are not met
        ComposeUpdateError: For compose-specific errors
    """
    if not directory:
        directory = os.environ.get("CLAWDOCK_COMPOSE_DIR")
    if not project:
        project = os.environ.get("CLAWDOCK_COMPOSE_PROJECT")
    
    if not os.environ.get("CLAWDOCK_ENABLE_COMPOSE_UPDATES", "").lower() == "true":
        raise ComposeUpdateError(
            "Compose updates are disabled. Enable them after securing the orchestrator and completing migration."
        )
    
    if client is None:
        raise UpdateError("Docker is unavailable.")
    
    # Validate compose directory and project
    if not directory or not os.path.isabs(directory) or not project:
        raise UpdateError("Compose directory and project must be configured.")
    
    compose_file = os.path.join(directory, "docker-compose.yml")
    if not os.path.isfile(compose_file):
        raise ComposeUpdateError("The host Compose file is not mounted inside the orchestrator.")
    
    # Use lock to prevent concurrent updates
    if not _update_lock.acquire(blocking=True):
        raise UpdateError("An update is already in progress. Please wait for current update to complete.")
    
    try:
        # Get and verify existing container
        try:
            container = client.containers.get("hermes-agent")
            labels = container.attrs["Config"].get("Labels") or {}
            
            if (
                labels.get("com.docker.compose.project") != project or
                labels.get("com.docker.compose.service") != "hermes" or
                labels.get("com.docker.compose.project.working_dir") != directory or
                container.status != "running"
            ):
                raise ComposeUpdateError(
                    "Hermes is not a running service of this Compose project. "
                    "Complete the documented migration first."
                )
            
            # Validate current image matches expected
            command = [
                "docker", "compose", "--project-name", project,
                "--project-directory", directory, "-f", compose_file,
            ]
            
            try:
                config = subprocess.run(
                    command + ["config", "--format", "json", "hermes"],
                    check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60,
                )
                service = json.loads(config.stdout)["services"]["hermes"]
                
                if (service.get("image") != HERMES_IMAGE or
                    service.get("container_name") != "hermes-agent" or
                    "build" in service):
                    raise ComposeUpdateError(
                        "The Compose Hermes service does not use the expected official latest image."
                    )
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError, ValueError, KeyError) as exc:
                # Specific error handling for config issues
                if isinstance(exc, subprocess.TimeoutExpired):
                    raise ComposeUpdateError(
                        "Hermes compose config timed out. Check Docker and network connectivity."
                    ) from exc
                if isinstance(exc, KeyError):
                    raise ComposeUpdateError(
                        "Hermes compose configuration missing required fields."
                    ) from exc
                if isinstance(exc, (subprocess.CalledProcessError, OSError)):
                    raise ComposeUpdateError(
                        f"Hermes compose config failed (exit {exc.returncode} if available). "
                        "Inspect Docker and Compose logs."
                    ) from exc
                raise ComposeUpdateError("Could not validate the Hermes Compose configuration.") from exc
        
        except NotFound as exc:
            raise ComposeUpdateError(
                "Hermes container was not found. Complete the documented migration first."
            ) from exc
    
    except DockerException as exc:
        raise ComposeUpdateError(f"Docker inspection failed; check the Docker daemon and permissions.") from exc
    
    finally:
        _update_lock.release()
    
    # Reload the container
    updated = client.containers.get("hermes-agent")
    updated.reload()
    
    # Verify the update
    image = client.images.get(HERMES_IMAGE)
    labels = updated.attrs["Config"].get("Labels") or {}
    
    if (
        updated.status != "running" or
        updated.image.id != image.id or
        labels.get("com.docker.compose.project") != project or
        labels.get("com.docker.compose.service") != "hermes"
    ):
        raise ComposeUpdateError(
            "Hermes was recreated but its running image could not be verified. "
            "Inspect Docker before retrying."
        )
    
    return {
        "success": True,
        "image": HERMES_IMAGE,
        "containerId": updated.id[:12],
        "status": "running"
    }
