import React, { useState, useEffect, useRef } from 'react';
import { Activity, RefreshCw, CheckCircle2, AlertCircle, Clock, Server, ArrowRight } from 'lucide-react';
import { probeApiHealth, getLastKnownApiHealth, ApiHealthStatus } from '../utils/apiBridge';

export const ApiHealthIndicator: React.FC = () => {
  const [health, setHealth] = useState<ApiHealthStatus>(getLastKnownApiHealth());
  const [isPinging, setIsPinging] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [relativeTime, setRelativeTime] = useState<string>('Just now');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Helper to format relative time
  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Never';
    const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diffSec < 5) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr}h ago`;
  };

  // Helper to format server uptime in human-readable format
  const formatUptime = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return 'N/A';
    const totalSec = Math.floor(seconds);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  // Trigger active probe
  const handlePing = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsPinging(true);
    try {
      const res = await probeApiHealth();
      setHealth(res);
      setRelativeTime('Just now');
    } finally {
      setIsPinging(false);
    }
  };

  // Initial ping and setup background periodic check (every 10s)
  useEffect(() => {
    handlePing();

    const intervalId = setInterval(() => {
      probeApiHealth().then((res) => {
        setHealth(res);
      });
    }, 30000); // 30s background polling interval

    const timerId = setInterval(() => {
      if (health.timestamp) {
        setRelativeTime(formatRelativeTime(health.timestamp));
      }
    }, 2000);

    // Synchronize with any global health events dispatched across the app
    const handleGlobalHealthEvent = (event: Event) => {
      const customEvent = event as CustomEvent<ApiHealthStatus>;
      if (customEvent.detail) {
        setHealth(customEvent.detail);
        setRelativeTime('Just now');
      }
    };

    window.addEventListener('clawdock:api-health', handleGlobalHealthEvent);
    window.addEventListener('online', () => handlePing());
    window.addEventListener('offline', () => {
      setHealth(prev => ({
        ...prev,
        status: 'unhealthy',
        statusCode: 0,
        errorMessage: 'Browser offline'
      }));
    });

    return () => {
      clearInterval(intervalId);
      clearInterval(timerId);
      window.removeEventListener('clawdock:api-health', handleGlobalHealthEvent);
    };
  }, []);

  // Update relative time whenever health timestamp changes
  useEffect(() => {
    if (health.timestamp) {
      setRelativeTime(formatRelativeTime(health.timestamp));
    }
  }, [health.timestamp]);

  // Click outside listener for popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isHealthy = health.status === 'healthy';
  const isChecking = isPinging || health.status === 'checking';

  return (
    <div className="relative inline-flex items-center" ref={popoverRef}>
      {/* Persistent Badge Button in Navbar */}
      <button
        id="navbar-api-health-btn"
        onClick={() => setPopoverOpen(!popoverOpen)}
        className={`group flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
          isChecking
            ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
            : isHealthy
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/15'
            : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/15'
        }`}
        title={`API Health: ${isHealthy ? 'Online (200 OK)' : 'Offline / Unreachable'} - Click for details`}
      >
        {/* Glowing/Pulsing Dot */}
        <span className="relative flex h-2 w-2">
          {isHealthy && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isChecking
                ? 'bg-cyan-400 animate-pulse'
                : isHealthy
                ? 'bg-emerald-400'
                : 'bg-rose-500 animate-pulse'
            }`}
          />
        </span>

        {/* Status Text with Latency or Short Label */}
        <div className="flex items-center gap-1.5">
          <span className="font-semibold tracking-tight text-[11px] sm:text-xs">
            {isChecking ? (
              'API: Probing'
            ) : isHealthy ? (
              <>
                <span className="hidden sm:inline text-emerald-400/80 font-normal">API</span>
                <span>Health:</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {health.latencyMs !== null ? `${health.latencyMs}ms` : 'OK'}
                </span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">API:</span>
                <span className="font-bold text-rose-400">Offline</span>
              </>
            )}
          </span>

          <RefreshCw
            className={`w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity ${
              isPinging ? 'animate-spin text-cyan-400' : 'text-slate-400'
            }`}
          />
        </div>
      </button>

      {/* Health Details Dropdown Card */}
      {popoverOpen && (
        <div
          id="api-health-popover"
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl shadow-black/90 p-3.5 z-50 animate-in fade-in zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center ${
                  isHealthy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight">API Health Monitor</h4>
                <p className="text-[10px] text-slate-400 font-mono">/api/health</p>
              </div>
            </div>

            <button
              id="api-health-ping-now-btn"
              onClick={handlePing}
              disabled={isPinging}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-750 text-slate-200 text-[11px] font-medium border border-slate-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 text-indigo-400 ${isPinging ? 'animate-spin' : ''}`} />
              <span>Ping</span>
            </button>
          </div>

          {/* Metric Rows */}
          <div className="py-2.5 space-y-2 text-xs">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                <Server className="w-3 h-3 text-slate-500" />
                Backend Status
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                  isHealthy
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {isHealthy ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {isHealthy ? '200 OK (Reachable)' : health.errorMessage || 'Unreachable'}
              </span>
            </div>

            {/* Latency */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                <Activity className="w-3 h-3 text-slate-500" />
                Roundtrip Latency
              </span>
              <span className="font-mono text-[11px] text-slate-200 font-medium">
                {health.latencyMs !== null ? `${health.latencyMs} ms` : '—'}
              </span>
            </div>

            {/* Server Uptime */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                <Clock className="w-3 h-3 text-slate-500" />
                Server Uptime
              </span>
              <span className="font-mono text-[11px] text-slate-200">
                {formatUptime(health.uptime)}
              </span>
            </div>

            {/* Last Checked */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Last Checked</span>
              <span className="text-slate-400 text-[11px] font-mono">{relativeTime}</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span>Auto-polls every 10s</span>
            <span className="text-indigo-400 hover:text-indigo-300 cursor-pointer" onClick={handlePing}>
              Force Refresh
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
