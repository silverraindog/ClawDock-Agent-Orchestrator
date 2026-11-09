import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyHermesUpdate } from './hermesUpdate';

afterEach(() => vi.unstubAllGlobals());

describe('applyHermesUpdate', () => {
  it('only reports a backend-confirmed container', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ success: true, containerId: '0123456789ab' })
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(applyHermesUpdate()).resolves.toBe('0123456789ab');
    expect(fetchMock).toHaveBeenCalledWith('/api/updates/apply', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ id: 'update-agent-hermes', targetVersion: 'latest' })
    }));
  });

  it('surfaces backend errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, json: async () => ({ detail: 'Complete migration first.' })
    }));
    await expect(applyHermesUpdate()).rejects.toThrow('Complete migration first.');
  });

  it('rejects an unconfirmed success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ success: true })
    }));
    await expect(applyHermesUpdate()).rejects.toThrow('did not confirm');
  });

  it('surfaces connection failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network unavailable')));
    await expect(applyHermesUpdate()).rejects.toThrow('Network unavailable');
  });
});
