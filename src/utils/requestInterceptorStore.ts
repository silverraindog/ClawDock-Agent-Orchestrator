/**
 * Global Request Interceptor Store & Lifecycle Hooks
 * 
 * Provides a global beforeRequest hook and a window-accessible store
 * to capture detailed metadata (headers, payload, timestamp, response stack traces)
 * for any failed PUT requests to /api/persistence/commit.
 */

export interface InterceptedRequestLog {
  id: string;
  timestamp: string;
  url: string;
  pathname: string;
  method: string;
  headers: Record<string, string>;
  payload: any;
  status?: number;
  statusText?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  stackTrace?: string;
  error?: string;
  durationMs: number;
}

export type BeforeRequestHook = (context: {
  id: string;
  url: string;
  pathname: string;
  method: string;
  headers: Record<string, string>;
  payload: any;
  timestamp: string;
}) => void | Promise<void>;

const STORAGE_KEY = 'clawdock_request_interceptor_logs';
const EVENT_NAME = 'request-interceptor-updated';

declare global {
  interface Window {
    __REQUEST_INTERCEPTOR_STORE__?: {
      logs: InterceptedRequestLog[];
      getLogs: () => InterceptedRequestLog[];
      clearLogs: () => void;
      addLog: (log: InterceptedRequestLog) => void;
      registerBeforeRequestHook: (hook: BeforeRequestHook) => () => void;
    };
    __REQUEST_INTERCEPTOR_HOOKS__?: BeforeRequestHook[];
    __REQUEST_INTERCEPTOR_INITIALIZED__?: boolean;
  }
}

function loadInitialLogs(): InterceptedRequestLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveLogs(logs: InterceptedRequestLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 100)));
  } catch {}
}

const beforeRequestHooks: BeforeRequestHook[] = [];

export function getInterceptedLogs(): InterceptedRequestLog[] {
  if (typeof window !== 'undefined' && window.__REQUEST_INTERCEPTOR_STORE__) {
    return window.__REQUEST_INTERCEPTOR_STORE__.logs || [];
  }
  return loadInitialLogs();
}

export function addInterceptedLog(log: InterceptedRequestLog): void {
  const current = getInterceptedLogs();
  const updated = [log, ...current.filter(l => l.id !== log.id)].slice(0, 100);
  
  if (typeof window !== 'undefined') {
    if (window.__REQUEST_INTERCEPTOR_STORE__) {
      window.__REQUEST_INTERCEPTOR_STORE__.logs = updated;
    }
    saveLogs(updated);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { log, logs: updated } }));
  }
}

export function clearInterceptedLogs(): void {
  if (typeof window !== 'undefined') {
    if (window.__REQUEST_INTERCEPTOR_STORE__) {
      window.__REQUEST_INTERCEPTOR_STORE__.logs = [];
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { logs: [] } }));
  }
}

export function registerBeforeRequestHook(hook: BeforeRequestHook): () => void {
  beforeRequestHooks.push(hook);
  if (typeof window !== 'undefined') {
    window.__REQUEST_INTERCEPTOR_HOOKS__ = beforeRequestHooks;
  }
  return () => {
    const idx = beforeRequestHooks.indexOf(hook);
    if (idx !== -1) {
      beforeRequestHooks.splice(idx, 1);
      if (typeof window !== 'undefined') {
        window.__REQUEST_INTERCEPTOR_HOOKS__ = beforeRequestHooks;
      }
    }
  };
}

/**
 * Initialize global window-accessible store and monkey-patch fetch to intercept failed requests
 */
export function initGlobalRequestInterceptor(): void {
  if (typeof window === 'undefined') return;

  // Initialize the window-accessible store
  const logs = loadInitialLogs();
  window.__REQUEST_INTERCEPTOR_STORE__ = {
    logs,
    getLogs: getInterceptedLogs,
    clearLogs: clearInterceptedLogs,
    addLog: addInterceptedLog,
    registerBeforeRequestHook
  };
  window.__REQUEST_INTERCEPTOR_HOOKS__ = beforeRequestHooks;

  if (window.__REQUEST_INTERCEPTOR_INITIALIZED__) {
    return;
  }
  window.__REQUEST_INTERCEPTOR_INITIALIZED__ = true;

  const originalFetch = window.fetch;
  if (!originalFetch) return;

  const interceptedFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    
    // Only target relevant API persistence and commit routes or intercept target
    const isPersistenceCommit = urlStr.includes('/api/persistence/commit');
    const isPersistenceRoute = urlStr.includes('/api/persistence');

    const timestamp = new Date().toISOString();
    const id = 'int_' + Math.random().toString(36).substring(2, 9);
    
    let headers: Record<string, string> = {};
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((val, key) => { headers[key] = val; });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([key, val]) => { headers[key] = val; });
      } else {
        headers = { ...init.headers as Record<string, string> };
      }
    } else if (input instanceof Request) {
      input.headers.forEach((val, key) => { headers[key] = val; });
    }

    let parsedPayload: any = null;
    if (init?.body) {
      try {
        if (typeof init.body === 'string') {
          parsedPayload = JSON.parse(init.body);
        } else {
          parsedPayload = init.body;
        }
      } catch {
        parsedPayload = init.body;
      }
    }

    let parsedUrlPathname = urlStr;
    try {
      const u = new URL(urlStr, window.location.origin);
      parsedUrlPathname = u.pathname;
    } catch {}

    // Execute global beforeRequest hooks
    const hookContext = {
      id,
      url: urlStr,
      pathname: parsedUrlPathname,
      method,
      headers,
      payload: parsedPayload,
      timestamp
    };

    for (const hook of beforeRequestHooks) {
      try {
        await hook(hookContext);
      } catch (err) {
        console.warn('[Request Interceptor] Error executing beforeRequest hook:', err);
      }
    }

    const startTime = performance.now();
    try {
      const response = await originalFetch.apply(this, [input, init]);
      const durationMs = Math.round(performance.now() - startTime);

      // Intercept failed requests (specifically 405 Method Not Allowed or 500 Server Errors, or failures on PUT /api/persistence/commit)
      if (!response.ok && (isPersistenceCommit || isPersistenceRoute || response.status === 405 || response.status >= 500)) {
        const cloned = response.clone();
        let responseBody: any = null;
        let stackTrace: string | undefined = undefined;

        try {
          const json = await cloned.json();
          responseBody = json;
          if (json && json.stackTrace) {
            stackTrace = json.stackTrace;
          }
        } catch {
          try {
            responseBody = await cloned.text();
          } catch {}
        }

        const respHeaders: Record<string, string> = {};
        response.headers.forEach((val, key) => {
          respHeaders[key] = val;
        });

        if (!stackTrace && response.status === 405) {
          stackTrace = `HTTP 405 Method Not Allowed: Method ${method} rejected on ${parsedUrlPathname}. Allowed methods: ${respHeaders['allow'] || 'Unknown'}\n    at window.fetch (requestInterceptor.ts:182:17)`;
        }

        const logItem: InterceptedRequestLog = {
          id,
          timestamp,
          url: urlStr,
          pathname: parsedUrlPathname,
          method,
          headers,
          payload: parsedPayload,
          status: response.status,
          statusText: response.statusText,
          responseHeaders: respHeaders,
          responseBody,
          stackTrace,
          durationMs
        };

        addInterceptedLog(logItem);
      }

      return response;
    } catch (fetchErr: any) {
      const durationMs = Math.round(performance.now() - startTime);
      if (isPersistenceCommit || isPersistenceRoute || method === 'PUT') {
        const logItem: InterceptedRequestLog = {
          id,
          timestamp,
          url: urlStr,
          pathname: parsedUrlPathname,
          method,
          headers,
          payload: parsedPayload,
          status: 0,
          statusText: 'Network Error',
          error: fetchErr?.message || 'Failed to fetch',
          stackTrace: fetchErr?.stack || String(fetchErr),
          durationMs
        };
        addInterceptedLog(logItem);
      }
      throw fetchErr;
    }
  };

  try {
    Object.defineProperty(window, 'fetch', {
      value: interceptedFetch,
      writable: true,
      configurable: true
    });
  } catch {
    try {
      (window as any).fetch = interceptedFetch;
    } catch (err) {
      console.warn('[Request Interceptor] Unable to monkey-patch window.fetch in this environment:', err);
    }
  }
}
