import React, { useState } from 'react';
import { 
  AlertTriangle, 
  WifiOff, 
  FileWarning, 
  CheckCircle2, 
  Loader2, 
  X, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert,
  Terminal
} from 'lucide-react';
import { AgentId } from '../types';

export type InjectionStatusType = 'idle' | 'validating' | 'success' | 'network_error' | 'schema_error';

export interface InjectionStatusInfo {
  status: InjectionStatusType;
  agentId: AgentId;
  title: string;
  message: string;
  statusCode?: number;
  endpoint?: string;
  schemaErrors?: string[];
  warnings?: string[];
  timestamp?: string;
}

interface ConfigInjectionAlertProps {
  info: InjectionStatusInfo | null;
  currentAgentId?: AgentId;
  onDismiss: () => void;
  onRetry?: (agentId: AgentId) => void;
}

export const ConfigInjectionAlert: React.FC<ConfigInjectionAlertProps> = ({
  info,
  currentAgentId,
  onDismiss,
  onRetry
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!info || info.status === 'idle') {
    return null;
  }

  // Ensure banner is strictly scoped to the active agent if currentAgentId is provided
  if (currentAgentId && info.agentId !== currentAgentId) {
    return null;
  }

  const isNetworkError = info.status === 'network_error';
  const isSchemaError = info.status === 'schema_error';
  const isValidating = info.status === 'validating';
  const isSuccess = info.status === 'success';

  // Distinct styling based on failure archetype
  const borderClass = isNetworkError 
    ? 'border-amber-500/40 bg-amber-950/20 text-amber-200' 
    : isSchemaError 
    ? 'border-rose-500/40 bg-rose-950/20 text-rose-200'
    : isValidating
    ? 'border-indigo-500/40 bg-indigo-950/20 text-indigo-200'
    : 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200';

  const badgeClass = isNetworkError
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    : isSchemaError
    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    : isValidating
    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

  return (
    <div 
      id="config-injection-status-banner"
      className={`rounded-xl border p-4 mb-4 shadow-lg transition-all duration-200 ${borderClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-slate-950/50 border border-white/5 shrink-0 mt-0.5">
            {isNetworkError && <WifiOff className="w-5 h-5 text-amber-400" />}
            {isSchemaError && <FileWarning className="w-5 h-5 text-rose-400" />}
            {isValidating && <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />}
            {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeClass}`}>
                {isNetworkError && 'Network Transport Error'}
                {isSchemaError && 'Validation Schema Error'}
                {isValidating && 'Validating Schema'}
                {isSuccess && 'Injection & Schema Verified'}
              </span>
              <span className="text-xs text-slate-400 font-mono">Target: {info.agentId}</span>
              {info.statusCode && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-900 text-slate-300 rounded border border-slate-700">
                  HTTP {info.statusCode}
                </span>
              )}
            </div>

            <h3 className="text-sm font-semibold text-white mt-1">
              {info.title}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              {info.message}
            </p>

            {/* Error breakdown accordion for Schema Errors or Network details */}
            {(info.schemaErrors && info.schemaErrors.length > 0) || info.endpoint ? (
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white underline-offset-2 hover:underline"
                >
                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {expanded ? 'Hide Diagnostic Breakdown' : `View ${info.schemaErrors?.length || 1} Error Details`}
                </button>

                {expanded && (
                  <div className="mt-2 p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-1.5 text-slate-300">
                    {info.endpoint && (
                      <div className="text-slate-400">
                        <span className="text-slate-500">Endpoint:</span> {info.endpoint}
                      </div>
                    )}
                    {info.schemaErrors && info.schemaErrors.length > 0 && (
                      <div>
                        <div className="text-rose-400 font-semibold mb-1 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Schema Inconsistencies Detected:
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300 pl-1">
                          {info.schemaErrors.map((err, idx) => (
                            <li key={idx} className="text-rose-300/90">{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onRetry && (isNetworkError || isSchemaError) && (
            <button
              type="button"
              id="retry-injection-btn"
              onClick={() => onRetry(info.agentId)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}

          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
