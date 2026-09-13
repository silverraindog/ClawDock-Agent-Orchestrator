import React, { useState, useRef } from 'react';
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench, 
  Sparkles, 
  Copy, 
  Check, 
  RotateCcw, 
  Code2, 
  Split, 
  Eye, 
  CornerDownRight, 
  CheckCheck,
  Search,
  Zap,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { DeepSchemaIssue, SyntaxValidationDetail } from '../utils/configValidator';
import { AgentFullConfig } from '../types';

interface InlineDiagnosticsEditorProps {
  content: string;
  onChangeContent: (newContent: string) => void;
  format: 'yaml' | 'toml' | 'json';
  rawMode: 'native' | 'schema';
  fileName?: string;
  issues: DeepSchemaIssue[];
  lineIssuesMap: Record<number, DeepSchemaIssue[]>;
  schemaConfig: AgentFullConfig;
  syntaxDetail?: SyntaxValidationDetail;
  onApplyFix: (issue: DeepSchemaIssue) => void;
  onAutoFixSyntax: () => void;
  onSyncNativeToSchema: () => void;
  rawError: string | null;
}

export const InlineDiagnosticsEditor: React.FC<InlineDiagnosticsEditorProps> = ({
  content,
  onChangeContent,
  format,
  rawMode,
  fileName = 'config',
  issues,
  lineIssuesMap,
  schemaConfig,
  syntaxDetail,
  onApplyFix,
  onAutoFixSyntax,
  onSyncNativeToSchema,
  rawError
}) => {
  const [viewMode, setViewMode] = useState<'annotated' | 'editor' | 'diff'>('annotated');
  const [copied, setCopied] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'error' | 'warning'>('all');
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fixedIssueIds, setFixedIssueIds] = useState<Set<string>>(new Set());

  const editorTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lines = content.split('\n');

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const mismatchCount = issues.filter(i => i.type === 'schema_mismatch').length;

  const filteredIssues = issues.filter(issue => {
    if (filterSeverity === 'error') return issue.severity === 'error';
    if (filterSeverity === 'warning') return issue.severity === 'warning';
    return true;
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFixIssue = (issue: DeepSchemaIssue) => {
    onApplyFix(issue);
    setFixedIssueIds(prev => new Set(prev).add(issue.id));
  };

  const jumpToLine = (lineNum: number) => {
    setSelectedLine(lineNum);
    const lineElement = document.getElementById(`editor-line-${lineNum}`);
    if (lineElement) {
      lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Real-time Syntax Parser Diagnostic Banner */}
      {errorCount > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/60 via-rose-900/30 to-slate-900 border border-rose-500/40 text-rose-100 shadow-lg space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-wide">
                    Real-Time Syntax Error Detected
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                    {syntaxDetail?.parserName || (format === 'yaml' ? 'YAML Parser' : format === 'toml' ? 'TOML Parser' : 'JSON Engine')}
                  </span>
                </div>
                <p className="text-xs text-rose-200/90 font-sans mt-0.5">
                  {syntaxDetail?.primaryError || issues.find(i => i.severity === 'error')?.message || 'Parser encountered syntax error in raw configuration.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {syntaxDetail?.primaryLine && (
                <button
                  onClick={() => jumpToLine(syntaxDetail.primaryLine!)}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-500/40 transition-colors"
                >
                  Jump to Line {syntaxDetail.primaryLine}
                </button>
              )}
              <button
                onClick={onAutoFixSyntax}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-all"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Quick Auto-Fix</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Control & Diagnostic Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-sm shadow-sm">
        {/* Left: Issue Summary Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>{lines.length} lines</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 font-mono text-[11px]">
            <span>Engine:</span>
            <span className="text-cyan-400 font-semibold">{syntaxDetail?.parserName || format.toUpperCase()}</span>
          </div>

          {errorCount > 0 ? (
            <button
              onClick={() => setFilterSeverity(filterSeverity === 'error' ? 'all' : 'error')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                filterSeverity === 'error'
                  ? 'bg-rose-500 text-white border-rose-400 font-bold'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>{errorCount} Syntax {errorCount === 1 ? 'Error' : 'Errors'}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>0 Syntax Errors</span>
            </span>
          )}

          {mismatchCount > 0 && (
            <button
              onClick={() => setFilterSeverity(filterSeverity === 'warning' ? 'all' : 'warning')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                filterSeverity === 'warning'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>{mismatchCount} Schema {mismatchCount === 1 ? 'Mismatch' : 'Mismatches'}</span>
            </button>
          )}

          {issues.length === 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Deep-Link Synchronized</span>
            </span>
          )}
        </div>

        {/* Right: View Mode Toggle & Fix All Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              id="view-mode-annotated-btn"
              onClick={() => setViewMode('annotated')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                viewMode === 'annotated'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="View code with inline error callout boxes under affected lines"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Inline Diagnostics</span>
            </button>

            <button
              id="view-mode-editor-btn"
              onClick={() => setViewMode('editor')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                viewMode === 'editor'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Full editable code area"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Live Editor</span>
            </button>

            <button
              id="view-mode-diff-btn"
              onClick={() => setViewMode('diff')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                viewMode === 'diff'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Side-by-side comparison between Native file and JSON Schema"
            >
              <Split className="w-3.5 h-3.5" />
              <span>Schema Diff</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Global Syntax Error Banner if any */}
      {rawError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-200 text-xs font-mono flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-rose-300">Parser Exception:</span> {rawError}
          </div>
        </div>
      )}

      {/* VIEW 1: ANNOTATED INLINE DIAGNOSTIC EDITOR */}
      {viewMode === 'annotated' && (
        <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-indigo-400 font-bold">{fileName}</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-sans uppercase text-[10px]">
                {format}
              </span>
              <span>• Click any error banner below to apply 1-click schema fix</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter lines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Line by Line Code View with Inline Error Boxes */}
          <div className="divide-y divide-slate-900/60 max-h-[640px] overflow-y-auto font-mono text-xs">
            {lines.map((lineText, idx) => {
              const lineNum = idx + 1;
              const lineIssues = lineIssuesMap[lineNum] || [];
              const hasError = lineIssues.some(i => i.severity === 'error');
              const hasWarning = lineIssues.some(i => i.severity === 'warning');
              const hasMismatch = lineIssues.some(i => i.type === 'schema_mismatch');
              const isSelected = selectedLine === lineNum;

              // If searching, filter lines (unless it has an issue)
              if (searchQuery && !lineText.toLowerCase().includes(searchQuery.toLowerCase()) && lineIssues.length === 0) {
                return null;
              }

              return (
                <div
                  key={`line-wrapper-${lineNum}`}
                  id={`editor-line-${lineNum}`}
                  className={`transition-colors ${
                    hasError 
                      ? 'bg-rose-950/20' 
                      : hasMismatch 
                      ? 'bg-amber-950/20' 
                      : isSelected 
                      ? 'bg-indigo-950/30' 
                      : 'hover:bg-slate-900/40'
                  }`}
                >
                  {/* The Code Line Row */}
                  <div className="flex items-start group">
                    {/* Gutter (Line Number + Status Glyph) */}
                    <div className="w-16 shrink-0 select-none py-1.5 px-2.5 text-right font-mono text-xs border-r border-slate-800/80 bg-slate-950/70 flex items-center justify-between">
                      <span className="text-slate-500 group-hover:text-slate-300">
                        {lineNum}
                      </span>
                      {hasError ? (
                        <span title="Syntax error on line" className="text-rose-400">🛑</span>
                      ) : hasMismatch ? (
                        <span title="Schema mismatch" className="text-amber-400">⚠️</span>
                      ) : hasWarning ? (
                        <span title="Warning" className="text-amber-300">💡</span>
                      ) : null}
                    </div>

                    {/* Code Content */}
                    <div className="flex-1 px-3 py-1.5 font-mono text-xs overflow-x-auto whitespace-pre">
                      <span className={
                        hasError 
                          ? 'text-rose-300 font-semibold underline decoration-rose-500/70 decoration-wavy' 
                          : hasMismatch
                          ? 'text-amber-200 font-medium'
                          : lineText.trim().startsWith('#')
                          ? 'text-slate-500 italic'
                          : lineText.trim().endsWith(':') || lineText.trim().startsWith('[')
                          ? 'text-indigo-300 font-bold'
                          : 'text-slate-300'
                      }>
                        {lineText || ' '}
                      </span>
                    </div>
                  </div>

                  {/* INLINE ERROR CALLOUT BOX DIRECTLY UNDER THE LINE */}
                  {lineIssues.length > 0 && (
                    <div className="px-4 py-2.5 ml-16 mr-3 mb-2 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-lg space-y-2.5">
                      {lineIssues.map((issue) => {
                        const isFixed = fixedIssueIds.has(issue.id);
                        return (
                          <div 
                            key={issue.id}
                            className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              issue.severity === 'error'
                                ? 'bg-rose-950/40 border-rose-500/50 text-rose-100'
                                : issue.type === 'schema_mismatch'
                                ? 'bg-amber-950/40 border-amber-500/50 text-amber-100'
                                : 'bg-indigo-950/40 border-indigo-500/50 text-indigo-100'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              {issue.severity === 'error' ? (
                                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              )}
                              
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    issue.severity === 'error' 
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  }`}>
                                    {issue.type.replace('_', ' ')}
                                  </span>
                                  <span className="font-mono text-[11px] text-slate-300">
                                    Path: <code className="text-indigo-300">{issue.path}</code>
                                  </span>
                                </div>

                                <p className="text-xs font-sans leading-relaxed text-slate-200">
                                  {issue.message}
                                </p>

                                {/* Discrepancy comparison pills */}
                                {issue.type === 'schema_mismatch' && (
                                  <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
                                    <div className="px-2 py-1 rounded bg-slate-950/80 border border-slate-800 text-amber-300">
                                      <span className="text-slate-400 text-[10px]">Native File:</span> {String(issue.nativeValue)}
                                    </div>
                                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                    <div className="px-2 py-1 rounded bg-slate-950/80 border border-indigo-500/40 text-indigo-300 font-bold">
                                      <span className="text-slate-400 text-[10px]">JSON Schema:</span> {String(issue.schemaValue)}
                                    </div>
                                  </div>
                                )}

                                {issue.suggestedFix && (
                                  <p className="text-[11px] font-sans text-emerald-300 flex items-center gap-1.5 pt-0.5">
                                    <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                                    <span>{issue.suggestedFix}</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Action Button: Apply Fix */}
                            {(issue.suggestedFix || issue.replacementText || issue.fixType) && (
                              <div className="shrink-0 flex items-center gap-2">
                                <button
                                  id={`fix-issue-${issue.id}-btn`}
                                  onClick={() => handleFixIssue(issue)}
                                  disabled={isFixed}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all ${
                                    isFixed
                                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default'
                                      : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/20 active:scale-95'
                                  }`}
                                  title="Apply replacement fix to this line"
                                >
                                  {isFixed ? (
                                    <>
                                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Fixed</span>
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                                      <span>Apply Fix</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: LIVE CODE EDITOR WITH SYNCED GUTTER */}
      {viewMode === 'editor' && (
        <div className="relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 font-mono">
            <span>Direct Editor: {fileName} ({format.toUpperCase()})</span>
            <div className="flex items-center gap-3">
              <span>{lines.length} lines</span>
              <span>{issues.length} active issues</span>
            </div>
          </div>

          <div className="flex relative">
            {/* Gutter */}
            <div className="w-12 shrink-0 select-none py-4 px-2 text-right font-mono text-xs text-slate-500 bg-slate-950/90 border-r border-slate-800/80 space-y-1">
              {lines.map((_, i) => {
                const lineNum = i + 1;
                const lineIssues = lineIssuesMap[lineNum] || [];
                const hasError = lineIssues.some(iss => iss.severity === 'error');
                const hasMismatch = lineIssues.some(iss => iss.type === 'schema_mismatch');

                return (
                  <div key={`gutter-${lineNum}`} className="h-5 flex items-center justify-between">
                    <span>{lineNum}</span>
                    {hasError ? (
                      <span className="text-rose-400 text-[10px]">🛑</span>
                    ) : hasMismatch ? (
                      <span className="text-amber-400 text-[10px]">⚠️</span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Editable Textarea */}
            <textarea
              ref={editorTextareaRef}
              id="raw-json-editor"
              rows={Math.max(20, lines.length)}
              value={content}
              onChange={(e) => onChangeContent(e.target.value)}
              className="flex-1 p-4 bg-slate-950 text-indigo-300 font-mono text-xs leading-5 focus:outline-none focus:ring-1 focus:ring-indigo-500 selection:bg-indigo-900 selection:text-white resize-none"
              placeholder="Enter configuration here..."
              spellCheck={false}
            />
          </div>
        </div>
      )}

      {/* VIEW 3: SCHEMA DIFF INSPECTOR */}
      {viewMode === 'diff' && (
        <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
            {/* Left: Native Configuration File */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-300 font-mono">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-400">Native File:</span>
                  <span>{fileName}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] uppercase">
                  {format}
                </span>
              </div>
              <pre className="p-4 bg-slate-950 text-slate-300 font-mono text-xs leading-relaxed overflow-x-auto max-h-[500px]">
                {content}
              </pre>
            </div>

            {/* Right: Runtime JSON Schema */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-300 font-mono">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-400">Target Schema:</span>
                  <span>AgentFullConfig (Active Runtime)</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-500/30 text-[10px]">
                  JSON
                </span>
              </div>
              <pre className="p-4 bg-slate-950 text-indigo-300 font-mono text-xs leading-relaxed overflow-x-auto max-h-[500px]">
                {JSON.stringify(schemaConfig, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Footer for Quick Synchronization & Auto-Fix */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Info className="w-4 h-4 text-indigo-400" />
          <span>Need to reconcile native configuration with active schema?</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAutoFixSyntax}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors"
            title="Auto-replace tabs with spaces and trim trailing whitespace"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Auto-Fix All Syntax</span>
          </button>

          <button
            onClick={onSyncNativeToSchema}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/40 transition-colors shadow-sm"
            title="Parse native content and update active JSON Schema"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Sync Native → Schema</span>
          </button>
        </div>
      </div>
    </div>
  );
};
