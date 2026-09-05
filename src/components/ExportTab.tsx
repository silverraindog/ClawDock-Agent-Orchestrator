import React, { useState, useEffect } from 'react';
import { 
  FolderTree, 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Terminal, 
  Container, 
  CheckCircle2, 
  ExternalLink,
  Code2
} from 'lucide-react';

interface ExportFile {
  path: string;
  language: string;
  description: string;
  content: string;
}

export const ExportTab: React.FC = () => {
  const [files, setFiles] = useState<ExportFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('python_backend/main.py');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/export/code')
      .then(res => res.json())
      .then(data => {
        if (data && data.files) {
          setFiles(data.files);
          if (data.files.length > 0) {
            setSelectedPath(data.files[0].path);
          }
        }
      })
      .catch(err => console.error('Export fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  const currentFile = files.find(f => f.path === selectedPath) || files[0];

  const copyContent = () => {
    if (!currentFile) return;
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    if (!currentFile) return;
    const blob = new Blob([currentFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.path.split('/').pop() || 'file';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Python Docker Web Application &amp; File Structure
              </h2>
              <p className="text-xs text-slate-400">
                Ready-to-run standalone Python FastAPI app, Pydantic configuration schemas, Dockerfile, and docker-compose.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/export/archive.tar.gz"
              download="clawdock-bot-admin.tar.gz"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
              title="Download all project files including Dockerfile, docker-compose.yml, source code, and python_backend"
            >
              <Download className="w-3.5 h-3.5" />
              Download Full Archive (.tar.gz)
            </a>
            <button
              onClick={downloadFile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Selected File
            </button>
          </div>
        </div>

        {/* Quick run command */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between font-mono text-xs text-indigo-400 gap-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-slate-500">$</span>
            <span className="text-emerald-400">docker compose build && docker compose up -d</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Mounts /var/run/docker.sock and builds ClawDock + agents
          </span>
        </div>
      </div>

      {/* Troubleshooting Alert Banner for "open Dockerfile: no such file or directory" */}
      <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Terminal className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-amber-200">
              Fixing &quot;failed to read dockerfile: open Dockerfile: no such file or directory&quot;
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              When running <code className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300 font-mono text-[11px]">docker compose build</code> in <code className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-mono text-[11px]">/opt/bots/bot-admin-ui</code>, Docker requires the <code className="text-white font-mono font-semibold">Dockerfile</code> to be in the same root directory alongside <code className="text-white font-mono font-semibold">docker-compose.yml</code>.
            </p>
            <p className="text-[11px] text-slate-400">
              Also, the <code className="text-slate-300 font-mono">version: &apos;3.8&apos;</code> line has been removed from <code className="text-slate-300 font-mono">docker-compose.yml</code> to eliminate the Docker Compose v2 obsolete attribute warning.
            </p>
          </div>
        </div>

        {/* Quick copy command for host terminal */}
        <div className="space-y-2 pt-1 border-t border-amber-500/20">
          <div className="text-[11px] font-semibold text-slate-300">
            Run this in <code className="font-mono text-amber-300">/opt/bots/bot-admin-ui</code> on your host (e.g. athena) to extract everything cleanly:
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto space-y-1">
            <div className="text-slate-500"># 1. Download the complete deployment package with Dockerfile and all sources:</div>
            <div className="text-indigo-300 select-all">curl -fsSL &quot;{window.location.origin}/api/export/archive.tar.gz&quot; | tar -xz</div>
            <div className="text-slate-500 mt-2"># 2. Re-run docker compose build &amp; start:</div>
            <div className="text-emerald-400 select-all">docker compose down &amp;&amp; docker compose build &amp;&amp; docker compose up -d &amp;&amp; docker compose logs -f</div>
          </div>
        </div>
      </div>

      {/* Two Pane Explorer: Left File Tree, Right Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: File Tree List */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 pb-2 border-b border-slate-800">
            <FolderTree className="w-4 h-4 text-indigo-400" />
            Project File Tree
          </div>

          <div className="space-y-1">
            {files.map((file) => {
              const isSelected = file.path === selectedPath;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedPath(file.path)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-white shadow-sm'
                      : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <FileCode className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-mono font-medium truncate">
                      {file.path}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {file.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Code Viewer */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden flex flex-col">
          {currentFile && (
            <>
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80">
                <div>
                  <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <span>{currentFile.path}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                      {currentFile.language}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {currentFile.description}
                  </p>
                </div>

                <button
                  onClick={copyContent}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-indigo-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Code'}
                </button>
              </div>

              <div className="p-4 bg-slate-950 overflow-x-auto max-h-[600px] overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed">
                <pre>
                  <code>{currentFile.content}</code>
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
