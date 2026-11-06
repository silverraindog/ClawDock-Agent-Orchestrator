import unittest

from docker_manager import DockerManager


class DockerManagerWithoutDockerTests(unittest.TestCase):
    def test_restart_returns_a_result_in_emulation_mode(self):
        manager = DockerManager.__new__(DockerManager)
        manager.client = None

        result = manager.restart_container("hermes-agent")

        self.assertTrue(result["success"])
        self.assertEqual(result["status"], "running")
        self.assertEqual(result["action"], "restarted")
        self.assertTrue(result["containerId"])


if __name__ == "__main__":
    unittest.main()
