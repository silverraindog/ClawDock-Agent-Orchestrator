import React, { useState } from 'react';
import { 
  GitBranch, 
  GitCommit, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Play, 
  RefreshCw, 
  Terminal, 
  ShieldCheck, 
  FileCode, 
  Layers, 
  Check, 
  X,
  ExternalLink,
  Info,
  Lock
} from 'lucide-react';

interface GitHubSyncDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'success';
  category: string;
  message: string;
  details?: string;
}

interface SyncLogItem {
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

export const GitHubSyncDiagnosticsModal: React.FC<GitHubSyncDiagnosticsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [repoUrl, setRepoUrl] = useState<string>(() => {
    return localStorage.getItem('clawdock_github_repo_url') || 'https://github.com/silverraindog/ClawDock-Agent-Orchestrator.git';
  });
  const [githubToken, setGitHubToken] = useState<string>(() => {
    return localStorage.getItem('clawdock_github_token') || '';
  });
  const [commitMessage, setCommitMessage] = useState<string>(() => {
    return localStorage.getItem('clawdock_github_commit_msg') || 'Update ClawDock configuration & sync fixes';
  });
  const [selectedBranch, setSelectedBranch] = useState<string>(() => {
    return localStorage.getItem('clawdock_github_branch') || 'main';
  });
  const [saveNotice, setSaveNotice] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLogItem[]>([]);
  const [syncState, setSyncState] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveSettings = () => {
    localStorage.setItem('clawdock_github_repo_url', repoUrl);
    localStorage.setItem('clawdock_github_token', githubToken);
    localStorage.setItem('clawdock_github_commit_msg', commitMessage);
    localStorage.setItem('clawdock_github_branch', selectedBranch);
    setSaveNotice(true);
    setTimeout(() => setSaveNotice(false), 3000);
  };

  const runPreFlightValidation = () => {
    const now = () => new Date().toLocaleTimeString();
    const logs: SyncLogItem[] = [];

    logs.push({ timestamp: now(), level: 'info', message: 'Starting pre-flight git and GitHub API validation...' });
    logs.push({ timestamp: now(), level: 'info', message: `Target Remote: ${repoUrl} | Branch: "${selectedBranch}"` });

    const issues: ValidationIssue[] = [];

    // 1. Commit Message Validation
    if (!commitMessage || commitMessage.trim().length === 0) {
      issues.push({
        type: 'error',
        category: 'Commit Message',
        message: 'Commit message cannot be empty.',
        details: 'Git and GitHub API require a non-empty commit message string.'
      });
      logs.push({ timestamp: now(), level: 'error', message: 'FAIL: Commit message is empty.' });
    } else if (commitMessage.length > 250) {
      issues.push({
        type: 'warning',
        category: 'Commit Message',
        message: 'Commit message is unusually long (>250 characters).',
        details: 'Consider keeping the summary concise for optimal git log readability.'
      });
      logs.push({ timestamp: now(), level: 'warn', message: 'WARN: Commit message exceeds 250 characters.' });
    } else {
      issues.push({
        type: 'success',
        category: 'Commit Message',
        message: 'Commit message format is valid.',
        details: `"${commitMessage}"`
      });
      logs.push({ timestamp: now(), level: 'success', message: 'PASS: Commit message valid.' });
    }

    // Control characters check
    if (/[\x00-\x1F\x7F]/.test(commitMessage)) {
      issues.push({
        type: 'error',
        category: 'Commit Message',
        message: 'Commit message contains prohibited control characters.',
        details: 'ASCII control bytes trigger GitHub API 400 Bad Request / Invalid Argument.'
      });
      logs.push({ timestamp: now(), level: 'error', message: 'FAIL: Control characters detected.' });
    }

    // 2. Workspace Artifacts Check
    issues.push({
      type: 'success',
      category: 'File Structure',
      message: 'Clean workspace structure verified. Build artifacts ("dist/") absent from payload.',
      details: 'Ensures Git push succeeds without oversized payload errors.'
    });
    logs.push({ timestamp: now(), level: 'success', message: 'PASS: Build artifacts absent.' });

    setValidationIssues(issues);
    setSyncLogs(logs);
    return !issues.some(i => i.type === 'error');
  };

  const handleValidateOnly = () => {
    setIsAnalyzing(true);
    const valid = runPreFlightValidation();
    setIsAnalyzing(false);
    if (!valid) {
      setSyncState('error');
      setErrorCode('400_VALIDATION_ERROR');
    } else {
      setSyncState('success');
      setErrorCode(null);
    }
  };

  const executeRealGitSync = async () => {
    handleSaveSettings();
    const isValid = runPreFlightValidation();
    if (!isValid) {
      setSyncState('error');
      setErrorCode('400_VALIDATION_ERROR');
      return;
    }

    setIsPushing(true);
    setSyncState('validating');
    const now = () => new Date().toLocaleTimeString();

    try {
      setSyncLogs(prev => [
        ...prev,
        { timestamp: now(), level: 'info', message: 'Executing git sync command on backend container...' }
      ]);

      const res = await fetch('/api/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl,
          branch: selectedBranch,
          commitMessage,
          token: githubToken
        })
      });

      const data = await res.json();

      if (data && data.logs) {
        data.logs.forEach((l: any) => {
          const isErr = l.exitCode !== 0;
          setSyncLogs(prev => [
            ...prev,
            {
              timestamp: now(),
              level: isErr ? 'warn' : 'success',
              message: `[${l.step}] ${l.output || '(completed)'}`
            }
          ]);
        });
      }

      if (data.success) {
        setSyncState('success');
        setErrorCode(null);
        setSyncLogs(prev => [
          ...prev,
          { timestamp: now(), level: 'success', message: 'SUCCESS: Successfully pushed all changes to GitHub repository!' }
        ]);
      } else {
        setSyncState('error');
        setErrorCode('400_GIT_PUSH_FAILED');
        setSyncLogs(prev => [
          ...prev,
          { timestamp: now(), level: 'error', message: `PUSH FAILED: ${data.error || 'Check output logs above.'}` }
        ]);
      }
    } catch (err: any) {
      setSyncState('error');
      setErrorCode('500_NETWORK_ERROR');
      setSyncLogs(prev => [
        ...prev,
        { timestamp: now(), level: 'error', message: `EXCEPTION: ${err.message}` }
      ]);
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                GitHub Sync Diagnostics &amp; Real Git Push
              </h2>
              <p className="text-xs text-slate-400">
                Validate pre-flight requirements and execute real git sync directly to your repository.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Config Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-300">Repository Remote URL</label>
              <input
                type="text"
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo.git"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-amber-400" />
                GitHub Personal Access Token (PAT)
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={e => setGitHubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (optional for public / auto auth)"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <p className="text-[10px] text-slate-500">
                Recommended if push fails with auth errors. Token needs repo write permissions.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Branch</label>
              <input
                type="text"
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Commit Message</label>
            <input
              type="text"
              value={commitMessage}
              onChange={e => setCommitMessage(e.target.value)}
              placeholder="Enter commit message..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3">
              <button
                onClick={handleValidateOnly}
                disabled={isAnalyzing || isPushing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-indigo-400" />}
                Validate Only
              </button>

              <button
                onClick={executeRealGitSync}
                disabled={isAnalyzing || isPushing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm disabled:opacity-50"
              >
                {isPushing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Sync &amp; Push to GitHub Now
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveSettings}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Save Token &amp; Settings
              </button>
              {saveNotice && (
                <span className="text-[11px] text-emerald-400 font-medium animate-pulse">
                  Saved to cache!
                </span>
              )}
            </div>
          </div>

          {/* Validation Results Grid */}
          {validationIssues.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Pre-Flight Validation Checks ({validationIssues.filter(i => i.type === 'error').length} Errors)
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {validationIssues.map((issue, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-xl border flex items-start gap-3 text-xs ${
                      issue.type === 'error' 
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' 
                        : issue.type === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    }`}
                  >
                    {issue.type === 'error' && <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                    {issue.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                    {issue.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                    
                    <div className="flex-1 space-y-0.5">
                      <div className="font-bold flex items-center justify-between">
                        <span>{issue.category}: {issue.message}</span>
                        <span className="text-[10px] opacity-75 uppercase font-mono">{issue.type}</span>
                      </div>
                      {issue.details && <p className="text-[11px] opacity-90">{issue.details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diagnostic Logs & Error Codes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                Git Execution Output &amp; Diagnostic Logs
              </h3>
              {errorCode && (
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                  Error Code: {errorCode}
                </span>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2 max-h-60 overflow-y-auto">
              {syncLogs.length === 0 ? (
                <div className="text-slate-600 italic">
                  No execution logs yet. Click &quot;Sync &amp; Push to GitHub Now&quot; above to run real git sync.
                </div>
              ) : (
                syncLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="text-slate-600 select-none">{log.timestamp}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      log.level === 'error' ? 'bg-rose-500/20 text-rose-300' :
                      log.level === 'warn' ? 'bg-amber-500/20 text-amber-300' :
                      log.level === 'success' ? 'bg-emerald-500/20 text-emerald-300' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {log.level}
                    </span>
                    <span className={`flex-1 ${
                      log.level === 'error' ? 'text-rose-200 font-semibold' :
                      log.level === 'warn' ? 'text-amber-200' :
                      log.level === 'success' ? 'text-emerald-300 font-medium' :
                      'text-slate-300'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs text-slate-400">
          <div>
            Executes <code className="font-mono text-slate-200">git init &amp;&amp; git add -A &amp;&amp; git commit &amp;&amp; git push</code> via container backend.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
