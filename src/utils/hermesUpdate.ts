export async function applyHermesUpdate(): Promise<string> {
  const response = await fetch('/api/updates/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'update-agent-hermes', targetVersion: 'latest' })
  });
  const result = await response.json();
  if (!response.ok || result.success !== true) {
    throw new Error(typeof result.detail === 'string' ? result.detail :
      typeof result.error === 'string' ? result.error : 'Update failed.');
  }
  if (typeof result.containerId !== 'string' || !result.containerId) {
    throw new Error('The backend did not confirm the updated container.');
  }
  return result.containerId;
}
