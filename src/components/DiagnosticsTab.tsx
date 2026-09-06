import React, { useState, useEffect } from 'react';
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Server,
  Terminal,
  Copy,
  Check,
  Code,
  Sparkles,
  Eye,
  FileJson,
  Zap
} from 'lucide-react';
import { RequestLogsTable } from './RequestLogsTable';

interface ProblematicRouteTest {
  id: string;
  title: string;
  method: 'GET' | 'POST';
  endpoint: string;
  status: number;
  statusText: string;
  ok: boolean;
  durationMs: number;
  rawBody: string;
  timestamp: string;
}

interface InspectorTarget {
  id: string;
  name: string;
  shortLabel: string;
  method: 'GET' | 'POST';
  endpoint: string;
  body?: any;
  category: 'state' | 'docker-exec';
  description: string;
}

const INSPECTOR_TARGETS: InspectorTarget[] = [
  {
    id: 'state-get',
    name: 'GET /api/state',
    shortLabel: '/api/state (GET)',
    method: 'GET',
    endpoint: '/api/state',
    category: 'state',
    description: 'Retrieves active orchestrator runtime states and bound container IDs.'
  },
  {
    id: 'state-post',
    name: 'POST /api/state',
    shortLabel: '/api/state (POST Ping)',
    method: 'POST',
    endpoint: '/api/state',
    body: {},
    category: 'state',
    description: 'Synchronizes and verifies state endpoints supporting POST/PUT operations.'
  },
  {
    id: 'hermes-docker-exec-post',
    name: 'POST /api/agents/hermes-agent/docker-exec-config',
    shortLabel: 'Hermes exec (POST)',
    method: 'POST',
    endpoint: '/api/agents/hermes-agent/docker-exec-config',
    category: 'docker-exec',
    description: 'Executes container extraction and reads mounted hermes.yaml configuration.'
  },
  {
    id: 'hermes-docker-exec-get',
    name: 'GET /api/agents/hermes-agent/docker-exec-config',
    shortLabel: 'Hermes exec (GET)',
    method: 'GET',
    endpoint: '/api/agents/hermes-agent/docker-exec-config',
    category: 'docker-exec',
    description: 'GET fallback endpoint for Hermes container configuration.'
  },
  {
    id: 'zeroclaw-docker-exec-post',
    name: 'POST /api/agents/zeroclaw/docker-exec-config',
    shortLabel: 'ZeroClaw exec (POST)',
    method: 'POST',
    endpoint: '/api/agents/zeroclaw/docker-exec-config',
    category: 'docker-exec',
    description: 'Executes container extraction and reads mounted zeroclaw.json configuration.'
  },
  {
    id: 'openclaw-docker-exec-post',
    name: 'POST /api/agents/openclaw/docker-exec-config',
    shortLabel: 'OpenClaw exec (POST)',
    method: 'POST',
    endpoint: '/api/agents/openclaw/docker-exec-config',
    category: 'docker-exec',
    description: 'Executes container extraction and reads mounted openclaw.json configuration.'
  },
  {
    id: 'picoclaw-docker-exec-post',
    name: 'POST /api/agents/picoclaw/docker-exec-config',
    shortLabel: 'PicoClaw exec (POST)',
    method: 'POST',
    endpoint: '/api/agents/picoclaw/docker-exec-config',
    category: 'docker-exec',
    description: 'Executes container extraction and reads mounted picoclaw.json configuration.'
  }
];

export const DiagnosticsTab: React.FC = () => {
  // Problematic routes probe state
  const [isProbing, setIsProbing] = useState(false);
  const [probeResults, setProbeResults] = useState<ProblematicRouteTest[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedBodyId, setExpandedBodyId] = useState<string | null>(null);

  // Dedicated Raw JSON Inspector (<pre> block) state
  const [selectedTargetId, setSelectedTargetId] = useState<string>('state-get');
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectCopied, setInspectCopied] = useState(false);
  const [inspectResponse, setInspectResponse] = useState<{
    targetId: string;
    endpoint: string;
    method: string;
    status: number;
    statusText: string;
    ok: boolean;
    durationMs: number;
    formattedJson: string;
    parsedData: any;
    sizeBytes: number;
    timestamp: string;
  } | null>(null);

  const currentTarget = INSPECTOR_TARGETS.find((t) => t.id === selectedTargetId) || INSPECTOR_TARGETS[0];

  // Helper to format any raw string as JSON if possible
  const formatAsJson = (raw: string): string => {
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  };

  // Dedicated Button Handler: Inspect Single Endpoint & Output to Console
  const handleInspectEndpoint = async (target: InspectorTarget) => {
    setIsInspecting(true);
    const start = performance.now();
    const options: RequestInit = {
      method: target.method,
      headers: {
        'Accept': 'application/json',
        ...(target.body ? { 'Content-Type': 'application/json' } : {})
      },
      body: target.body ? JSON.stringify(target.body) : undefined
    };

    // Output complete request payload to browser console
    console.log('[DiagnosticsTab Button Handler: Inspect Endpoint] Complete Request Payload:', {
      targetId: target.id,
      name: target.name,
      endpoint: target.endpoint,
      method: target.method,
      headers: options.headers,
      body: target.body || null,
      timestamp: new Date().toISOString()
    });

    try {
      const res = await fetch(target.endpoint, options);
      const durationMs = Math.round(performance.now() - start);
      const text = await res.text();

      // Output response status to browser console
      console.log('[DiagnosticsTab Button Handler: Inspect Endpoint] Response Status:', res.status, res.statusText, 'from', target.endpoint);

      let parsedData: any = null;
      let formatted = text;
      try {
        parsedData = JSON.parse(text);
        formatted = JSON.stringify(parsedData, null, 2);
      } catch {
        formatted = text;
      }

      // Output full JSON body to browser console
      console.log('[DiagnosticsTab Button Handler: Inspect Endpoint] Full JSON Body:', parsedData !== null ? parsedData : text);

      setInspectResponse({
        targetId: target.id,
        endpoint: target.endpoint,
        method: target.method,
        status: res.status,
        statusText: res.statusText || (res.ok ? 'OK' : 'Error'),
        ok: res.ok,
        durationMs,
        formattedJson: formatted,
        parsedData,
        sizeBytes: new Blob([text]).size,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      console.error('[DiagnosticsTab Button Handler: Inspect Endpoint] Network/Fetch Error:', err);
      console.log('[DiagnosticsTab Button Handler: Inspect Endpoint] Response Status: 0 Network Error for', target.endpoint);
      console.log('[DiagnosticsTab Button Handler: Inspect Endpoint] Full JSON Body:', { error: err.message || 'Fetch failed' });

      setInspectResponse({
        targetId: target.id,
        endpoint: target.endpoint,
        method: target.method,
        status: 0,
        statusText: 'Network Error',
        ok: false,
        durationMs,
        formattedJson: JSON.stringify({ error: err.message || 'Fetch failed', endpoint: target.endpoint }, null, 2),
        parsedData: { error: err.message },
        sizeBytes: 0,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setIsInspecting(false);
    }
  };

  // Run initial inspect on mount
  useEffect(() => {
    handleInspectEndpoint(currentTarget);
  }, []);

  // Run comprehensive probe on problematic routes (/api/state and docker-exec-config)
  const runProblematicRoutesProbe = async () => {
    setIsProbing(true);

    const testDefinitions: Array<{ title: string; method: 'GET' | 'POST'; endpoint: string; body?: any }> = [
      { title: 'Agent Runtime State (GET)', method: 'GET', endpoint: '/api/state' },
      { title: 'Agent Runtime State (POST Ping)', method: 'POST', endpoint: '/api/state', body: {} },
      { title: 'Hermes Docker Exec Config (GET)', method: 'GET', endpoint: '/api/agents/hermes-agent/docker-exec-config' },
      { title: 'Hermes Docker Exec Config (POST)', method: 'POST', endpoint: '/api/agents/hermes-agent/docker-exec-config' },
      { title: 'ZeroClaw Docker Exec Config (GET)', method: 'GET', endpoint: '/api/agents/zeroclaw/docker-exec-config' },
      { title: 'ZeroClaw Docker Exec Config (POST)', method: 'POST', endpoint: '/api/agents/zeroclaw/docker-exec-config' },
      { title: 'OpenClaw Docker Exec Config (GET)', method: 'GET', endpoint: '/api/agents/openclaw/docker-exec-config' },
      { title: 'OpenClaw Docker Exec Config (POST)', method: 'POST', endpoint: '/api/agents/openclaw/docker-exec-config' },
      { title: 'PicoClaw Docker Exec Config (GET)', method: 'GET', endpoint: '/api/agents/picoclaw/docker-exec-config' },
      { title: 'PicoClaw Docker Exec Config (POST)', method: 'POST', endpoint: '/api/agents/picoclaw/docker-exec-config' }
    ];

    const results: ProblematicRouteTest[] = [];

    for (const test of testDefinitions) {
      const start = performance.now();
      const options: RequestInit = {
        method: test.method,
        headers: {
          'Accept': 'application/json',
          ...(test.body ? { 'Content-Type': 'application/json' } : {})
        },
        body: test.body ? JSON.stringify(test.body) : undefined
      };

      // Output complete request payload to browser console
      console.log('[DiagnosticsTab Button Handler: Probe Routes] Complete Request Payload:', {
        title: test.title,
        endpoint: test.endpoint,
        method: test.method,
        headers: options.headers,
        body: test.body || null,
        timestamp: new Date().toISOString()
      });

      try {
        const res = await fetch(test.endpoint, options);
        const durationMs = Math.round(performance.now() - start);
        const text = await res.text();

        // Output response status to browser console
        console.log('[DiagnosticsTab Button Handler: Probe Routes] Response Status:', res.status, res.statusText, 'for', test.endpoint);

        let parsedJson: any = null;
        try {
          parsedJson = JSON.parse(text);
        } catch {}

        // Output full JSON body to browser console
        console.log('[DiagnosticsTab Button Handler: Probe Routes] Full JSON Body:', parsedJson !== null ? parsedJson : text);

        results.push({
          id: `${test.method}_${test.endpoint}_${Date.now()}`,
          title: test.title,
          method: test.method,
          endpoint: test.endpoint,
          status: res.status,
          statusText: res.statusText || (res.status === 200 ? 'OK' : res.status === 404 ? 'Not Found' : res.status === 405 ? 'Method Not Allowed' : ''),
          ok: res.ok,
          durationMs,
          rawBody: text,
          timestamp: new Date().toLocaleTimeString()
        });
      } catch (err: any) {
        const durationMs = Math.round(performance.now() - start);
        console.error('[DiagnosticsTab Button Handler: Probe Routes] Fetch Error:', err);
        console.log('[DiagnosticsTab Button Handler: Probe Routes] Response Status: 0 Network Error for', test.endpoint);
        console.log('[DiagnosticsTab Button Handler: Probe Routes] Full JSON Body:', { error: err.message || 'Fetch request failed' });

        results.push({
          id: `${test.method}_${test.endpoint}_${Date.now()}`,
          title: test.title,
          method: test.method,
          endpoint: test.endpoint,
          status: 0,
          statusText: 'Network Error',
          ok: false,
          durationMs,
          rawBody: JSON.stringify({ error: err.message || 'Fetch request failed' }, null, 2),
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }

    setProbeResults(results);
    setIsProbing(false);
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyInspectJson = () => {
    if (inspectResponse?.formattedJson) {
      navigator.clipboard.writeText(inspectResponse.formattedJson);
      setInspectCopied(true);
      setTimeout(() => setInspectCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                API Diagnostics &amp; Route Inspector
              </h2>
              <p className="text-xs text-slate-400">
                Inspect raw JSON responses from <code className="text-indigo-300">/api/state</code> &amp; <code className="text-indigo-300">docker-exec-config</code>, run automated connectivity probes, and monitor live server request logs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto">
          <button
            id="run-problematic-probe-btn"
            onClick={runProblematicRoutesProbe}
            disabled={isProbing}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-60"
            title="Execute sequential probe across all /api/state and docker-exec-config routes with console logging"
          >
            <Terminal className={`w-4 h-4 ${isProbing ? 'animate-pulse text-indigo-200' : ''}`} />
            {isProbing ? 'Probing All Routes...' : 'Probe Problematic Routes'}
          </button>
        </div>
      </div>

      {/* DEDICATED FORMATTED RAW JSON RESPONSES INSPECTOR (<pre> BLOCK) */}
      <div className="p-6 rounded-2xl border border-indigo-500/30 bg-slate-900/90 backdrop-blur-sm space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Raw JSON Response Inspector (<code className="text-indigo-300">&lt;pre&gt;</code>)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Targeted real-time query for <code className="text-indigo-300">/api/state</code> and <code className="text-indigo-300">docker-exec-config</code> endpoints with formatted JSON output
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="fetch-inspect-endpoint-btn"
              onClick={() => handleInspectEndpoint(currentTarget)}
              disabled={isInspecting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm"
              title="Query selected endpoint, output request/response to console, and render JSON below"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isInspecting ? 'animate-spin' : ''}`} />
              {isInspecting ? 'Querying...' : 'Fetch & Inspect JSON'}
            </button>

            <button
              id="copy-inspect-json-btn"
              onClick={copyInspectJson}
              disabled={!inspectResponse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors disabled:opacity-40"
              title="Copy formatted JSON response to clipboard"
            >
              {inspectCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Endpoint Selector Tabs */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Select Target Endpoint:
          </div>
          <div className="flex flex-wrap gap-2">
            {INSPECTOR_TARGETS.map((target) => {
              const isSelected = target.id === selectedTargetId;
              return (
                <button
                  key={target.id}
                  onClick={() => {
                    setSelectedTargetId(target.id);
                    handleInspectEndpoint(target);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30 border border-indigo-400/50'
                      : 'bg-slate-950/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <span
                    className={`px-1.5 py-0.2 text-[9px] font-mono font-bold rounded ${
                      target.method === 'GET'
                        ? 'bg-sky-500/20 text-sky-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {target.method}
                  </span>
                  <span>{target.shortLabel}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 italic pt-1">
            {currentTarget.description}
          </p>
        </div>

        {/* Metadata Status Bar */}
        {inspectResponse && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-slate-400">
                Endpoint: <span className="text-indigo-300 font-bold">{inspectResponse.endpoint}</span>
              </span>
              <span className="text-slate-400">
                Method: <span className="text-white font-bold">{inspectResponse.method}</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${
                  inspectResponse.status >= 200 && inspectResponse.status < 300
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : inspectResponse.status === 405
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : inspectResponse.status === 404
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {inspectResponse.ok ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <AlertTriangle className="w-3 h-3" />
                )}
                HTTP {inspectResponse.status} {inspectResponse.statusText}
              </span>

              <span className="text-slate-400">
                Latency: <span className="text-slate-200">{inspectResponse.durationMs}ms</span>
              </span>

              <span className="text-slate-400">
                Size: <span className="text-slate-200">{(inspectResponse.sizeBytes / 1024).toFixed(2)} KB</span>
              </span>

              <span className="text-slate-500">
                {inspectResponse.timestamp}
              </span>
            </div>
          </div>
        )}

        {/* Formatted <pre> Tag Block displaying pretty-printed JSON response */}
        <div className="relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner">
          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-indigo-400" />
              <span>Formatted JSON Response Payload (&lt;pre&gt; Block)</span>
            </span>
            <span className="text-emerald-400 font-semibold text-[10px]">
              {inspectResponse?.ok ? '● Valid Payload Received' : '● Response Captured'}
            </span>
          </div>

          <pre
            id="raw-json-pre-block"
            className="p-4 font-mono text-xs text-emerald-400 bg-slate-950 overflow-x-auto overflow-y-auto max-h-[420px] leading-relaxed selection:bg-emerald-900 selection:text-white scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
          >
            {isInspecting ? (
              <span className="text-slate-500 animate-pulse">// Querying endpoint and parsing JSON...</span>
            ) : inspectResponse?.formattedJson ? (
              inspectResponse.formattedJson
            ) : (
              <span className="text-slate-600">// No response captured yet. Click "Fetch & Inspect JSON" above.</span>
            )}
          </pre>
        </div>
      </div>

      {/* Problematic Routes Probe Results Card */}
      {probeResults.length > 0 && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-sm space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Server className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Problematic Routes Connectivity Probe Results</h3>
                <p className="text-xs text-slate-400">
                  Automated probe of <code className="text-indigo-300">/api/state</code> and <code className="text-indigo-300">/api/agents/:id/docker-exec-config</code> (GET &amp; POST)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                {probeResults.filter((r) => r.ok).length} Successful
              </span>
              {probeResults.filter((r) => !r.ok).length > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-bold">
                  {probeResults.filter((r) => !r.ok).length} Failed
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {probeResults.map((test) => {
              const is2xx = test.status >= 200 && test.status < 300;
              const is405 = test.status === 405;
              const is404 = test.status === 404;
              const isExpanded = expandedBodyId === test.id;
              const formattedContent = formatAsJson(test.rawBody);

              return (
                <div
                  key={test.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3 flex flex-col justify-between hover:border-slate-700 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                            test.method === 'GET'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}
                        >
                          {test.method}
                        </span>
                        <span className="text-xs font-semibold text-slate-200">{test.title}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-slate-500">{test.durationMs}ms</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold flex items-center gap-1 ${
                            is2xx
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : is405
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : is404
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {is2xx ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : is405 ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {test.status} {test.statusText}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-indigo-300/80 truncate">
                      {test.endpoint}
                    </div>
                  </div>

                  {/* Formatted JSON Body (<pre> block) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Code className="w-3 h-3 text-slate-500" />
                        Formatted JSON Body (&lt;pre&gt;)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(test.id, formattedContent)}
                          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors"
                          title="Copy formatted JSON body to clipboard"
                        >
                          {copiedId === test.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setExpandedBodyId(isExpanded ? null : test.id)}
                          className="text-[10px] text-indigo-400 hover:underline"
                        >
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </button>
                      </div>
                    </div>

                    <pre
                      className={`p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 font-mono text-[11px] text-emerald-300/90 overflow-x-auto transition-all ${
                        isExpanded ? 'max-h-72' : 'max-h-24'
                      }`}
                    >
                      {formattedContent || '<Empty response body>'}
                    </pre>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* NEW SUB-COMPONENT: Live Server Request Logs Table (/api/diagnostics/request-logs) */}
      <RequestLogsTable />
    </div>
  );
};
