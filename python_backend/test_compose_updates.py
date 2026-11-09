import json
import os
import subprocess
import unittest
from unittest.mock import Mock, patch

from compose_updates import HERMES_IMAGE, UpdateError, update_hermes


class ComposeUpdateTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(os.environ, {
            "CLAWDOCK_COMPOSE_DIR": "/host/project",
            "CLAWDOCK_COMPOSE_PROJECT": "clawdock",
            "CLAWDOCK_ENABLE_COMPOSE_UPDATES": "true",
        })
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.file = patch("compose_updates.os.path.isfile", return_value=True)
        self.file.start()
        self.addCleanup(self.file.stop)
        self.client = Mock()
        self.container = Mock()
        self.container.status = "running"
        self.container.id = "0123456789abcdef"
        self.container.image.id = "sha256:updated"
        self.container.attrs = {"Config": {"Labels": {
            "com.docker.compose.project": "clawdock",
            "com.docker.compose.service": "hermes",
            "com.docker.compose.project.working_dir": "/host/project",
        }}}
        self.client.containers.get.return_value = self.container
        self.client.images.get.return_value.id = "sha256:updated"
        self.config = json.dumps({"services": {"hermes": {
            "image": HERMES_IMAGE, "container_name": "hermes-agent",
        }}}).encode()

    @patch("compose_updates.subprocess.run")
    def test_pulls_recreates_and_verifies_image(self, run):
        run.return_value.stdout = self.config
        result = update_hermes(self.client)
        self.assertEqual(result["containerId"], "0123456789ab")
        self.assertEqual([call.args[0][-2:] for call in run.call_args_list], [
            ["json", "hermes"], ["pull", "hermes"], ["--force-recreate", "hermes"],
        ])
        self.client.images.get.assert_called_once_with(HERMES_IMAGE)
        self.container.reload.assert_called_once()

    @patch("compose_updates.subprocess.run")
    def test_rejects_another_compose_project_before_pulling(self, run):
        self.container.attrs["Config"]["Labels"]["com.docker.compose.project"] = "hermes"
        with self.assertRaisesRegex(UpdateError, "migration"):
            update_hermes(self.client)
        run.assert_not_called()

    @patch("compose_updates.subprocess.run")
    def test_rejects_unexpected_image_before_pulling(self, run):
        run.return_value.stdout = b'{"services":{"hermes":{"image":"wrong","container_name":"hermes-agent"}}}'
        with self.assertRaisesRegex(UpdateError, "expected official"):
            update_hermes(self.client)
        self.assertEqual(run.call_count, 1)

    @patch("compose_updates.subprocess.run")
    def test_pull_failure_never_recreates(self, run):
        run.side_effect = [Mock(stdout=self.config), subprocess.CalledProcessError(1, ["docker"])]
        with self.assertRaisesRegex(UpdateError, "pull failed"):
            update_hermes(self.client)
        self.assertEqual(run.call_count, 2)

    @patch("compose_updates.subprocess.run")
    def test_recreate_failure_is_not_reported_as_success(self, run):
        run.side_effect = [Mock(stdout=self.config), Mock(), subprocess.CalledProcessError(1, ["docker"])]
        with self.assertRaisesRegex(UpdateError, "up failed"):
            update_hermes(self.client)
        self.client.images.get.assert_not_called()

    @patch("compose_updates.subprocess.run")
    def test_missing_compose_configuration_does_not_pull(self, run):
        run.return_value.stdout = b"{}"
        with self.assertRaisesRegex(UpdateError, "validate"):
            update_hermes(self.client)
        self.assertEqual(run.call_count, 1)

    @patch("compose_updates.subprocess.run")
    def test_does_not_report_success_for_wrong_running_image(self, run):
        run.return_value.stdout = self.config
        self.container.image.id = "sha256:old"
        with self.assertRaisesRegex(UpdateError, "could not be verified"):
            update_hermes(self.client)

    def test_unavailable_docker_is_an_error(self):
        with self.assertRaisesRegex(UpdateError, "unavailable"):
            update_hermes(None)

    def test_updates_require_explicit_opt_in(self):
        with patch.dict(os.environ, {"CLAWDOCK_ENABLE_COMPOSE_UPDATES": "false"}):
            with self.assertRaisesRegex(UpdateError, "disabled"):
                update_hermes(self.client)
        self.client.containers.get.assert_not_called()


if __name__ == "__main__":
    unittest.main()
