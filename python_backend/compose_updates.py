import os
import json
import subprocess
import threading

from docker.errors import DockerException, NotFound


HERMES_IMAGE = "docker.io/nousresearch/hermes-agent:latest"
_update_lock = threading.Lock()


class UpdateError(Exception):
    pass


def update_hermes(client):
    if os.environ.get("CLAWDOCK_ENABLE_COMPOSE_UPDATES", "").lower() != "true":
        raise UpdateError("Compose updates are disabled. Enable them after securing the orchestrator and completing migration.")
    if client is None:
        raise UpdateError("Docker is unavailable.")
    directory = os.environ.get("CLAWDOCK_COMPOSE_DIR")
    project = os.environ.get("CLAWDOCK_COMPOSE_PROJECT")
    if not directory or not os.path.isabs(directory) or not project:
        raise UpdateError("Compose directory and project must be configured.")
    compose_file = os.path.join(directory, "docker-compose.yml")
    if not os.path.isfile(compose_file):
        raise UpdateError("The host Compose file is not mounted inside the orchestrator.")

    if not _update_lock.acquire(blocking=False):
        raise UpdateError("An update is already in progress.")
    try:
        try:
            container = client.containers.get("hermes-agent")
            labels = container.attrs["Config"].get("Labels") or {}
            if (
                labels.get("com.docker.compose.project") != project
                or labels.get("com.docker.compose.service") != "hermes"
                or labels.get("com.docker.compose.project.working_dir") != directory
                or container.status != "running"
            ):
                raise UpdateError(
                    "Hermes is not a running service of this Compose project. "
                    "Complete the documented migration first."
                )
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
                if service.get("image") != HERMES_IMAGE or service.get("container_name") != "hermes-agent" or "build" in service:
                    raise UpdateError("The Compose Hermes service does not use the expected official latest image.")
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError, ValueError, KeyError) as exc:
                raise UpdateError("Could not validate the Hermes Compose configuration.") from exc
            for args in (["pull", "hermes"], ["up", "-d", "--no-deps", "--force-recreate", "hermes"]):
                try:
                    subprocess.run(
                        command + args, check=True, stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE, timeout=600,
                    )
                except subprocess.TimeoutExpired as exc:
                    raise UpdateError(f"Compose {' '.join(args[:1])} timed out; inspect the container before retrying.") from exc
                except subprocess.CalledProcessError as exc:
                    raise UpdateError(f"Compose {' '.join(args[:1])} failed (exit {exc.returncode}); inspect Docker and Compose logs.") from exc
                except OSError as exc:
                    raise UpdateError("Docker Compose could not be started.") from exc

            updated = client.containers.get("hermes-agent")
            updated.reload()
            image = client.images.get(HERMES_IMAGE)
            labels = updated.attrs["Config"].get("Labels") or {}
            if (
                updated.status != "running"
                or updated.image.id != image.id
                or labels.get("com.docker.compose.project") != project
                or labels.get("com.docker.compose.service") != "hermes"
            ):
                raise UpdateError("Hermes was recreated but its running image could not be verified; inspect Docker before retrying.")
            return {"success": True, "image": HERMES_IMAGE, "containerId": updated.id[:12]}
        except NotFound as exc:
            raise UpdateError("Hermes container or image was not found; complete the documented migration first.") from exc
        except DockerException as exc:
            raise UpdateError("Docker inspection failed; check the Docker daemon and permissions.") from exc
    finally:
        _update_lock.release()
