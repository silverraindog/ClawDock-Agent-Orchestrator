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
  Zap,
  ShieldCheck,
  ArrowUpDown,
  Cpu,
  Radio,
  Layers,
  ChevronDown,
  Database
} from 'lucide-react';
import { RequestLogsTable } from './RequestLogsTable';
import { AgentFullConfig, AgentInfo } from '../types';
import { validatePersistenceSchema } from '../utils/apiBridge';

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
  category: 'state' | 'docker-exec' | 'failback';
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
    id: 'hermes-failback-simulate',
    name: 'POST /api/agents/hermes-agent/simulate-failback',
    shortLabel: 'Hermes Failback (Simulate)',
    method: 'POST',
    endpoint: '/api/agents/hermes-agent/simulate-failback',
    body: {
      forced: true,
      prompt: 'Simulated failback health verification probe',
      fallbackProvider: 'ollama',
      fallbackModel: 'hermes-3-llama-3.1-8b',
      targetAgentId: 'zeroclaw',
      strategy: 'on_offline'
    },
    category: 'failback',
    description: 'Forces Hermes into failback mode, executing secondary gateway & local Ollama model routing.'
  },
  {
    id: 'zeroclaw-failback-simulate',
    name: 'POST /api/agents/zeroclaw/simulate-failback',
    shortLabel: 'ZeroClaw Failback (Simulate)',
    method: 'POST',
    endpoint: '/api/agents/zeroclaw/simulate-failback',
    body: {
      forced: true,
      prompt: 'Simulated failback health verification probe',
      fallbackProvider: 'mistral',
      fallbackModel: 'mistral-7b-instruct',
      targetAgentId: 'picoclaw',
      strategy: 'on_offline'
    },
    category: 'failback',
    description: 'Forces ZeroClaw into failback mode, redirecting traffic to PicoClaw edge engine.'
  },
  {
    id: 'openclaw-failback-simulate',
    name: 'POST /api/agents/openclaw/simulate-failback',
    shortLabel: 'OpenClaw Failback (Simulate)',
    method: 'POST',
    endpoint: '/api/agents/openclaw/simulate-failback',
    body: {
      forced: true,
      prompt: 'Simulated failback health verification probe',
      fallbackProvider: 'deepseek',
      fallbackModel: 'deepseek-chat',
      targetAgentId: 'hermes-agent',
      strategy: 'on_error'
    },
    category: 'failback',
    description: 'Forces OpenClaw into failback mode, routing traffic to Hermes core.'
  },
  {
    id: 'picoclaw-failback-simulate',
    name: 'POST /api/agents/picoclaw/simulate-failback',
    shortLabel: 'PicoClaw Failback (Simulate)',
    method: 'POST',
    endpoint: '/api/agents/picoclaw/simulate-failback',
    body: {
      forced: true,
      prompt: 'Simulated failback health verification probe',
      fallbackProvider: 'ollama',
      fallbackModel: 'picolm-1.1b',
      targetAgentId: 'zeroclaw',
      strategy: 'on_latency'
    },
    category: 'failback',
    description: 'Forces PicoClaw into failback mode, rerouting to ZeroClaw edge engine.'
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

export interface DiagnosticsTabProps {
  currentAgentId?: string;
  agent?: AgentInfo;
  config?: AgentFullConfig;
}

export const DiagnosticsTab: React.FC<DiagnosticsTabProps> = ({
  currentAgentId = 'hermes-agent',
  agent,
  config
}) => {
  // Failback simulation state
  const [isSimulatingFailback, setIsSimulatingFailback] = useState(false);
  const [simAgentId, setSimAgentId] = useState<string>(currentAgentId || 'hermes-agent');
  const [simStrategy, setSimStrategy] = useState<'on_offline' | 'on_error' | 'on_latency'>('on_offline');
  const [failbackConsoleLogs, setFailbackConsoleLogs] = useState<Array<{
    timestamp: string;
    level: 'INFO' | 'WARN' | 'SUCCESS' | 'ERROR';
    step: string;
    message: string;
    details?: any;
  }>>([]);
  const [consoleCopied, setConsoleCopied] = useState(false);

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

  // Persistence Inspector state
  const [backendPersistenceData, setBackendPersistenceData] = useState<string>('Click "Refresh persistence.json" to load raw server storage state.');
  const [isFetchingPersistence, setIsFetchingPersistence] = useState<boolean>(false);
  const [persistenceValidation, setPersistenceValidation] = useState<any>(null);

  const fetchBackendPersistence = async () => {
    setIsFetchingPersistence(true);
    try {
      const res = await fetch('/api/persistence');
      if (res.ok) {
        const json = await res.json();
        setBackendPersistenceData(JSON.stringify(json, null, 2));
        const validation = validatePersistenceSchema(json);
        setPersistenceValidation(validation);
      } else {
        setBackendPersistenceData(`Error fetching /api/persistence: HTTP ${res.status} ${res.statusText}`);
      }
    } catch (err: any) {
      setBackendPersistenceData(`Error fetching /api/persistence: ${err.message || err}`);
    } finally {
      setIsFetchingPersistence(false);
    }
  };

  useEffect(() => {
    fetchBackendPersistence();
  }, []);

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

  // Dedicated Button Handler: Simulate Failback & Output to Console
  const handleSimulateFailback = async (overrideAgentId?: string) => {
    const targetAgent = overrideAgentId || simAgentId || 'hermes-agent';
    setIsSimulatingFailback(true);
    const start = performance.now();
    const timestampStr = new Date().toLocaleTimeString();

    const fallbackProvider = config?.fallback?.fallbackProvider || config?.fallback?.provider || 'ollama';
    const fallbackModel = config?.fallback?.fallbackModel || config?.fallback?.model || 'hermes-3-llama-3.1-8b';
    const targetAgentId = config?.fallback?.targetAgentId || (targetAgent === 'hermes-agent' ? 'zeroclaw' : 'picoclaw');
    const strategy = simStrategy || config?.fallback?.strategy || 'on_offline';

    const reqPayload = {
      forced: true,
      agentId: targetAgent,
      fallbackProvider,
      fallbackModel,
      targetAgentId,
      strategy,
      prompt: 'Simulated failback health probe: testing secondary gateway failover routing & model fallback'
    };

    // Step 1: Output dispatch info to browser console
    console.log('[DiagnosticsTab: Simulate Failback] MANUAL FAILBACK REQUEST TRIGGERED');
    console.log('[DiagnosticsTab: Simulate Failback] Forcing Agent into Fallback Configuration with Payload:', reqPayload);

    const initialLogs: Array<{ timestamp: string; level: 'INFO' | 'WARN' | 'SUCCESS' | 'ERROR'; step: string; message: string; details?: any }> = [
      {
        timestamp: timestampStr,
        level: 'WARN',
        step: 'TRIGGER_FORCED_FAILOVER',
        message: `Triggering manual request forcing [${targetAgent}] into failback configuration. Trigger condition: [${strategy}].`,
        details: { targetAgent, strategy }
      },
      {
        timestamp: timestampStr,
        level: 'INFO',
        step: 'DISPATCH_ORCHESTRATOR',
        message: `Dispatched request to failback orchestrator at /api/agents/${targetAgent}/simulate-failback`,
        details: reqPayload
      }
    ];
    setFailbackConsoleLogs(initialLogs);

    try {
      const res = await fetch(`/api/agents/${targetAgent}/simulate-failback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(reqPayload)
      });
      const durationMs = Math.round(performance.now() - start);
      const text = await res.text();

      // Step 2: Output response status to browser console
      console.log('[DiagnosticsTab: Simulate Failback] Response Status:', res.status, res.statusText, `(${durationMs}ms)`);

      let parsedData: any = null;
      try {
        parsedData = JSON.parse(text);
      } catch {
        parsedData = { raw: text };
      }

      // Step 3: Output full result output to browser console as requested by user
      console.log('[DiagnosticsTab: Simulate Failback] Full Result Output:', parsedData);

      const successLog: { timestamp: string; level: 'INFO' | 'WARN' | 'SUCCESS' | 'ERROR'; step: string; message: string; details?: any } = {
        timestamp: new Date().toLocaleTimeString(),
        level: res.ok ? 'SUCCESS' : 'ERROR',
        step: res.ok ? 'FAILBACK_ROUTED_SUCCESS' : 'FAILBACK_ROUTED_FAILURE',
        message: res.ok
          ? `Failback orchestration succeeded! Gracefully rerouted to fallback target [${parsedData.fallbackTarget?.targetAgentId || targetAgentId}] using model [${parsedData.fallbackTarget?.fallbackModel || fallbackModel}].`
          : `Failback simulation failed with status ${res.status}: ${res.statusText}`,
        details: parsedData
      };

      setFailbackConsoleLogs(prev => [...prev, successLog]);

      // Set formatted JSON inspector response so the on-screen JSON view updates immediately
      const formattedJson = JSON.stringify(parsedData, null, 2);
      setInspectResponse({
        targetId: 'failback-simulation',
        endpoint: `/api/agents/${targetAgent}/simulate-failback`,
        method: 'POST',
        status: res.status,
        statusText: res.statusText || 'OK',
        ok: res.ok,
        durationMs,
        formattedJson,
        parsedData,
        sizeBytes: new Blob([text]).size,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      console.error('[DiagnosticsTab: Simulate Failback] Fetch Exception:', err);
      console.log('[DiagnosticsTab: Simulate Failback] Result Output (Error):', { error: err.message || 'Fetch failed' });

      setFailbackConsoleLogs(prev => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          level: 'ERROR',
          step: 'NETWORK_EXCEPTION',
          message: `Network error during failback simulation: ${err.message}`,
          details: { error: err.message, durationMs }
        }
      ]);
    } finally {
      setIsSimulatingFailback(false);
    }
  };

  // Dedicated Button Handler: Inspect Single Endpoint & Output to Console
  const handleInspectEndpoint = async (target: InspectorTarget) => {
    if (!target) return;
    setIsInspecting(true);
    const start = performance.now();
    const options: RequestInit = {
      method: target?.method || 'GET',
      headers: {
        'Accept': 'application/json',
        ...(target?.body ? { 'Content-Type': 'application/json' } : {})
      },
      body: target?.body ? JSON.stringify(target.body) : undefined
    };

    // Output complete request payload to browser console with null checks
    console.log('[DiagnosticsTab Button Handler: Inspect Endpoint] Complete Request Payload:', {
      targetId: target?.id,
      name: target?.name,
      endpoint: target?.endpoint,
      method: target?.method,
      headers: options?.headers,
      body: target?.body || null,
      enabled: target?.body?.enabled ?? null,
      timestamp: new Date().toISOString()
    });

    try {
      const endpoint = target?.endpoint || '/api/state';
      const res = await fetch(endpoint, options);
      const durationMs = Math.round(performance.now() - start);
      const text = await res.text();

      // Output response status to browser console
      console.log('[DiagnosticsTab Button Handler: Inspect Endpoint] Response Status:', res?.status, res?.statusText, 'from', endpoint);

      let parsedData: any = null;
      let formatted = text;
      try {
        parsedData = JSON.parse(text);
        formatted = JSON.stringify(parsedData, null, 2);
      } catch {
        formatted = text;
      }

      // Safe access with optional chaining for enabled checks
      const isEnabled = parsedData?.enabled ?? parsedData?.channels?.telegram?.enabled ?? true;
      console.log('[DiagnosticsTab Button Handler: Inspect Endpoint] Full JSON Body (parsedData?.enabled:', isEnabled, '):', parsedData !== null ? parsedData : text);

      setInspectResponse({
        targetId: target?.id || 'unknown',
        endpoint,
        method: target?.method || 'GET',
        status: res?.status || 200,
        statusText: res?.statusText || (res?.ok ? 'OK' : 'Error'),
        ok: res?.ok || false,
        durationMs,
        formattedJson: formatted,
        parsedData,
        sizeBytes: new Blob([text]).size,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      console.error('[DiagnosticsTab Button Handler: Inspect Endpoint] Network/Fetch Error:', err);
      console.log('[DiagnosticsTab Button Handler: Inspect Endpoint] Full JSON Body:', { error: err?.message || 'Fetch failed' });

      setInspectResponse({
        targetId: target?.id || 'unknown',
        endpoint: target?.endpoint || '/api/state',
        method: target?.method || 'GET',
        status: 0,
        statusText: 'Network Error',
        ok: false,
        durationMs,
        formattedJson: JSON.stringify({ error: err?.message || 'Fetch failed', endpoint: target?.endpoint }, null, 2),
        parsedData: { error: err?.message, enabled: false },
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
            id="simulate-failback-btn"
            onClick={() => handleSimulateFailback()}
            disabled={isSimulatingFailback}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-60"
            title="Trigger manual request forcing the agent to use the failback configuration, and display result in console"
          >
            <RefreshCw className={`w-4 h-4 ${isSimulatingFailback ? 'animate-spin' : ''}`} />
            {isSimulatingFailback ? 'Simulating Failback...' : 'Simulate Failback'}
          </button>

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

      {/* FAILBACK ORCHESTRATION & SIMULATION CONSOLE PANEL */}
      <div 
        id="diagnostics-failback-orchestration-card"
        className="p-6 rounded-2xl border border-emerald-500/30 bg-slate-900/90 backdrop-blur-sm space-y-4 shadow-xl relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Agent Failback Orchestration Simulator &amp; Console
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulate failover conditions (node down, 5xx upstream, or latency spike) and verify redundant routing to local models and secondary gateways
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="simulate-failback-panel-btn"
              onClick={() => handleSimulateFailback()}
              disabled={isSimulatingFailback}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm"
              title="Force agent into failback configuration and inspect result"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingFailback ? 'animate-spin' : ''}`} />
              {isSimulatingFailback ? 'Executing Failback...' : 'Simulate Failback'}
            </button>

            <button
              id="copy-failback-console-btn"
              onClick={() => {
                const logsText = failbackConsoleLogs.map(l => `[${l.timestamp}] [${l.level}] [${l.step}] ${l.message}\n${l.details ? JSON.stringify(l.details, null, 2) : ''}`).join('\n\n');
                if (logsText) {
                  navigator.clipboard.writeText(logsText);
                  setConsoleCopied(true);
                  setTimeout(() => setConsoleCopied(false), 2000);
                }
              }}
              disabled={failbackConsoleLogs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors disabled:opacity-40"
              title="Copy failback execution logs to clipboard"
            >
              {consoleCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Logs</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Configuration Selectors for Simulation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Primary Agent Target:
            </label>
            <select
              id="failback-sim-agent-select"
              value={simAgentId}
              onChange={(e) => setSimAgentId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500 text-xs"
            >
              <option value="hermes-agent">Hermes Agent (Port 8000)</option>
              <option value="zeroclaw">ZeroClaw (Port 8002)</option>
              <option value="openclaw">OpenClaw (Port 8001)</option>
              <option value="picoclaw">PicoClaw (Port 8003)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Simulated Failback Trigger:
            </label>
            <select
              id="failback-sim-strategy-select"
              value={simStrategy}
              onChange={(e) => setSimStrategy(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500 text-xs"
            >
              <option value="on_offline">On Offline (Heartbeat Lost / Node Down)</option>
              <option value="on_error">On Error (Upstream 503 / Provider Error)</option>
              <option value="on_latency">On Latency (Timeout &gt; 500ms Threshold)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Configured Failback Route:
            </label>
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-300 font-mono text-[11px] truncate flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                {config?.fallback?.fallbackProvider || 'ollama'}:{' '}
                <strong className="text-emerald-300 font-bold">{config?.fallback?.fallbackModel || 'hermes-3-llama-3.1-8b'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Live Failback Console Terminal Output */}
        <div className="relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner">
          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Failback Orchestration Execution Console Output</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-slate-500 text-[10px]">Streams to browser console &amp; UI</span>
              {failbackConsoleLogs.length > 0 && (
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-bold">
                  {failbackConsoleLogs.length} events
                </span>
              )}
            </span>
          </div>

          <div
            id="failback-console-terminal"
            className="p-4 font-mono text-xs text-slate-300 bg-slate-950 overflow-x-auto overflow-y-auto max-h-[260px] leading-relaxed space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
          >
            {isSimulatingFailback ? (
              <div className="flex items-center gap-2 text-emerald-400 animate-pulse py-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Simulating primary agent fault, triggering failback route, and awaiting secondary gateway response...</span>
              </div>
            ) : failbackConsoleLogs.length > 0 ? (
              failbackConsoleLogs.map((log, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-slate-500 text-[10px]">[{log.timestamp}]</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      log.level === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' :
                      log.level === 'WARN' ? 'bg-amber-500/20 text-amber-300' :
                      log.level === 'ERROR' ? 'bg-rose-500/20 text-rose-400' :
                      'bg-indigo-500/20 text-indigo-300'
                    }`}>
                      {log.step}
                    </span>
                    <span className="text-slate-200">{log.message}</span>
                  </div>
                  {log.details && (
                    <pre className="ml-6 p-2 rounded bg-slate-900/90 border border-slate-800 text-[11px] text-emerald-400/90 overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            ) : (
              <div className="text-slate-500 py-3 text-center space-y-1">
                <div>// Ready to simulate failback orchestration.</div>
                <div className="text-[11px] text-slate-600">
                  Click <strong className="text-emerald-400">"Simulate Failback"</strong> to trigger a manual request forcing the agent into its failback configuration. Results will output to the browser console and display here.
                </div>
              </div>
            )}
          </div>
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

      {/* Read-only Persistence Inspector for /data/clawdock/persistence.json */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              Persistence Inspector (/data/clawdock/persistence.json)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Read-only server storage inspection verifying whether agent model settings and configurations are correctly persisted after saves.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {persistenceValidation && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                persistenceValidation.isValid 
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}>
                {persistenceValidation.isValid ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {persistenceValidation.isValid ? 'Schema Valid' : `${persistenceValidation.mismatches.length} Mismatches Found`}
              </span>
            )}
            <button
              onClick={fetchBackendPersistence}
              disabled={isFetchingPersistence}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingPersistence ? 'animate-spin' : ''}`} />
              {isFetchingPersistence ? 'Fetching Server Persistence...' : 'Refresh persistence.json'}
            </button>
          </div>
        </div>

        {persistenceValidation && persistenceValidation.mismatches.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2">
            <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Schema Integrity Mismatches Highlighted:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-200/90 font-mono">
              {persistenceValidation.mismatches.map((m: any, idx: number) => (
                <li key={idx}>
                  <strong className="text-white">{m.agentId}</strong> ({m.field}): {m.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="relative rounded-xl bg-slate-950 p-4 border border-slate-800/80 overflow-x-auto max-h-96">
          <div className="absolute top-3 right-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(backendPersistenceData);
                alert('Persistence JSON copied to clipboard!');
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Raw JSON</span>
            </button>
          </div>
          <pre className="text-xs font-mono text-emerald-400/90 leading-relaxed pr-24">
            {backendPersistenceData}
          </pre>
        </div>
      </div>

      {/* NEW SUB-COMPONENT: Live Server Request Logs Table (/api/diagnostics/request-logs) */}
      <RequestLogsTable />
    </div>
  );
};
