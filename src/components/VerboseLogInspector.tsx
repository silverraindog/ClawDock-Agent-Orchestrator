import React, { useState } from 'react';
import { 
  Terminal, 
  FileCode2, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Layers, 
  CheckCircle2, 
  AlertTriangle,
  Code2
} from 'lucide-react';

export interface VerboseLogData {
  action: string;
  agentId: string;
  logs: string[];
  rawJson: any;
  timestamp: string;
  source?: string;
  filePath?: string;
  status?: 'success' | 'warning' | 'error';
  elapsedMs?: number;
}

interface VerboseLogInspectorProps {
  data: VerboseLogData | null;
  onClose: () => void;
}

export const VerboseLogInspector: React.FC<VerboseLogInspectorProps> = ({ data, onClose }) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'json'>('logs');
  const [copied, setCopied] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!data) return null;

  const isError = data.status === 'error';
  const isSuccess = data.status !== 'error';

  const jsonString = React.useMemo(() => {
    try {
      return JSON.stringify(data.rawJson, null, 2);
    } catch {
      return String(data.rawJson);
    }
  }, [data.rawJson]);

  const handleCopy = () => {
    const textToCopy = activeTab === 'logs' ? data.logs.join('\n') : jsonString;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      id="verbose-log-inspector-panel"
      className="rounded-xl border border-slate-700/80 bg-slate-950/90 shadow-2xl backdrop-blur-md overflow-hidden my-4 transition-all animate-in fade-in duration-200"
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-1.5 rounded-lg border ${
            isError ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
          }`}>
            {isError ? <AlertTriangle className="w-4 h-4" /> : <Terminal className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide truncate">
                {data.action}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                {data.agentId}
              </span>
              {data.source && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                  {data.source}
                </span>
              )}
            </div>
            {data.filePath && (
              <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                Target: {data.filePath}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab selector */}
          <div className="flex items-center rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-xs">
            <button
              id="inspector-tab-logs"
              type="button"
              onClick={() => { setActiveTab('logs'); setIsMinimized(false); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                activeTab === 'logs' && !isMinimized 
                  ? 'bg-indigo-600 text-white font-medium' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Verbose Logs ({data.logs.length})
            </button>
            <button
              id="inspector-tab-json"
              type="button"
              onClick={() => { setActiveTab('json'); setIsMinimized(false); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                activeTab === 'json' && !isMinimized 
                  ? 'bg-indigo-600 text-white font-medium' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              JSON Payload
            </button>
          </div>

          <button
            id="inspector-copy-btn"
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Copy current tab contents"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isMinimized ? 'Expand' : 'Collapse'}
          >
            {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content panel */}
      {!isMinimized && (
        <div className="p-3 bg-slate-950">
          {activeTab === 'logs' ? (
            <div 
              id="verbose-logs-content"
              className="max-h-64 overflow-y-auto font-mono text-xs text-slate-300 space-y-1 p-3 rounded-lg bg-black/50 border border-slate-900 select-text"
            >
              {data.logs.length === 0 ? (
                <div className="text-slate-500 italic">No logs recorded yet.</div>
              ) : (
                data.logs.map((line, idx) => {
                  const isErr = line.includes('[ERROR]') || line.includes('error') || line.includes('failed');
                  const isWarn = line.includes('[WARN]') || line.includes('warning');
                  const isSuccessLine = line.includes('[SUCCESS]') || line.includes('Verified') || line.includes('Injected');
                  const isInit = line.includes('[INIT]') || line.includes('[START]');
                  const isHttp = line.includes('[HTTP]');
                  const isParse = line.includes('[PARSE]') || line.includes('[SCHEMA]');

                  let lineStyle = 'text-slate-300';
                  if (isErr) lineStyle = 'text-rose-400 font-semibold';
                  else if (isWarn) lineStyle = 'text-amber-400';
                  else if (isSuccessLine) lineStyle = 'text-emerald-400 font-semibold';
                  else if (isInit) lineStyle = 'text-cyan-400 font-semibold';
                  else if (isHttp) lineStyle = 'text-indigo-300';
                  else if (isParse) lineStyle = 'text-violet-300';

                  return (
                    <div key={idx} className={`leading-relaxed break-all ${lineStyle}`}>
                      {line}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div 
              id="verbose-json-content"
              className="max-h-72 overflow-y-auto font-mono text-xs text-emerald-300 p-3 rounded-lg bg-black/60 border border-slate-900 select-text"
            >
              <pre className="whitespace-pre-wrap break-words">{jsonString}</pre>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-900 text-[11px] text-slate-500">
            <span>Captured at {data.timestamp}</span>
            <span>Console output is also mirrored in browser DevTools</span>
          </div>
        </div>
      )}
    </div>
  );
};
