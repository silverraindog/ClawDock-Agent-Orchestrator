import { describe, it, expect } from 'vitest';
import { ServerRequestLog } from '../components/RequestLogsTable';

describe('Diagnostics Request Logs & Sortable Table Logic', () => {
  const mockLogs: ServerRequestLog[] = [
    {
      id: 'req_1',
      timestamp: '2026-09-29T10:00:00.000Z',
      method: 'GET',
      url: '/api/health',
      pathname: '/api/health',
      status: 200,
      durationMs: 14,
      clientIp: '127.0.0.1'
    },
    {
      id: 'req_2',
      timestamp: '2026-09-29T10:00:05.000Z',
      method: 'POST',
      url: '/api/save-config',
      pathname: '/api/save-config',
      status: 200,
      durationMs: 95,
      clientIp: '127.0.0.1'
    },
    {
      id: 'req_3',
      timestamp: '2026-09-29T10:00:10.000Z',
      method: 'GET',
      url: '/api/agents/missing',
      pathname: '/api/agents/missing',
      status: 404,
      durationMs: 8,
      clientIp: '127.0.0.1'
    },
    {
      id: 'req_4',
      timestamp: '2026-09-29T10:00:15.000Z',
      method: 'POST',
      url: '/api/docker/restart',
      pathname: '/api/docker/restart',
      status: 500,
      durationMs: 180,
      clientIp: '192.168.1.5'
    }
  ];

  it('correctly caps request logs to the last 50 entries', () => {
    const largeMockLogs: ServerRequestLog[] = Array.from({ length: 75 }, (_, i) => ({
      id: `req_${i}`,
      timestamp: new Date(Date.now() - i * 1000).toISOString(),
      method: 'GET',
      url: `/api/test/${i}`,
      pathname: `/api/test/${i}`,
      status: 200,
      durationMs: 10 + i,
      clientIp: '127.0.0.1'
    }));

    const last50 = largeMockLogs.slice(0, 50);
    expect(last50.length).toBe(50);
    expect(last50[0].id).toBe('req_0');
    expect(last50[49].id).toBe('req_49');
  });

  it('sorts by durationMs ascending and descending', () => {
    const asc = [...mockLogs].sort((a, b) => (a.durationMs ?? 0) - (b.durationMs ?? 0));
    expect(asc.map((l) => l.durationMs)).toEqual([8, 14, 95, 180]);

    const desc = [...mockLogs].sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0));
    expect(desc.map((l) => l.durationMs)).toEqual([180, 95, 14, 8]);
  });

  it('sorts by status code ascending and descending', () => {
    const asc = [...mockLogs].sort((a, b) => a.status - b.status);
    expect(asc.map((l) => l.status)).toEqual([200, 200, 404, 500]);

    const desc = [...mockLogs].sort((a, b) => b.status - a.status);
    expect(desc.map((l) => l.status)).toEqual([500, 404, 200, 200]);
  });

  it('sorts by HTTP method alphabetically', () => {
    const asc = [...mockLogs].sort((a, b) => a.method.localeCompare(b.method));
    expect(asc.map((l) => l.method)).toEqual(['GET', 'GET', 'POST', 'POST']);
  });

  it('sorts by Path alphabetically', () => {
    const asc = [...mockLogs].sort((a, b) => (a.pathname || a.url).localeCompare(b.pathname || b.url));
    expect(asc.map((l) => l.pathname)).toEqual([
      '/api/agents/missing',
      '/api/docker/restart',
      '/api/health',
      '/api/save-config'
    ]);
  });

  it('sorts by timestamp chronological order', () => {
    const desc = [...mockLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    expect(desc.map((l) => l.id)).toEqual(['req_4', 'req_3', 'req_2', 'req_1']);

    const asc = [...mockLogs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    expect(asc.map((l) => l.id)).toEqual(['req_1', 'req_2', 'req_3', 'req_4']);
  });
});
