import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Trash2, 
  Cpu, 
  CheckCircle2, 
  Clock, 
  Wrench,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { AgentInfo, ChatMessage } from '../types';

interface ConsoleTabProps {
  agent: AgentInfo;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClearHistory: () => void;
  isThinking: boolean;
}

export const ConsoleTab: React.FC<ConsoleTabProps> = ({
  agent,
  messages,
  onSendMessage,
  onClearHistory,
  isThinking
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isThinking) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const samplePrompts = [
    'Check Docker container health and port mappings',
    'List all loaded SKILL.md tools and MCP servers',
    'Write a python script that connects to /var/run/docker.sock',
    'Test reasoning loop with step-by-step verification'
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Console Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">
                Interactive Agent Sandbox ({agent.name})
              </h2>
              <span className={`w-2 h-2 rounded-full ${
                agent.status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`} />
            </div>
            <p className="text-xs text-slate-400">
              Direct live inference and command testbed running inside Docker.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Terminal
          </button>
        </div>
      </div>

      {/* Chat / Terminal Window */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 flex flex-col h-[520px] shadow-2xl overflow-hidden">
        {/* Messages feed */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 font-sans">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400">
                <Bot className="w-6 h-6" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  Agent Ready for Execution
                </h3>
                <p className="text-xs text-slate-400">
                  Send a prompt or shell task to {agent.name}. The agent will invoke installed SKILL.md specs and MCP servers.
                </p>
              </div>

              {/* Sample Prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full pt-2">
                {samplePrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => onSendMessage(prompt)}
                    className="p-2.5 text-left rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors"
                  >
                    &quot;{prompt}&quot;
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-800 text-indigo-400 border border-slate-700'
                }`}>
                  {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div className={`space-y-2 max-w-[85%] ${
                  msg.sender === 'user'
                    ? 'bg-indigo-500/10 border border-indigo-500/20 text-slate-100 rounded-2xl rounded-tr-sm p-4'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl rounded-tl-sm p-4'
                }`}>
                  <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400 border-b border-slate-800/50 pb-1 mb-2">
                    <span className="font-semibold text-white">
                      {msg.sender === 'user' ? 'You' : agent.name}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Reasoning steps if present */}
                  {msg.reasoningSteps && msg.reasoningSteps.length > 0 && (
                    <div className="mb-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-indigo-300 space-y-1">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-sans font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        Chain-of-Thought Reasoning
                      </div>
                      {msg.reasoningSteps.map((step, idx) => (
                        <div key={idx} className="leading-snug">{step}</div>
                      ))}
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="text-xs leading-relaxed whitespace-pre-wrap font-mono">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))
          )}

          {isThinking && (
            <div className="flex gap-3 max-w-3xl">
              <div className="w-8 h-8 rounded-xl bg-slate-800 text-indigo-400 border border-slate-700 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="p-3.5 rounded-2xl rounded-tl-sm bg-slate-900 border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>{agent.name} is reasoning and inspecting tools in Docker...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-900/60 flex gap-2">
          <input
            id="console-input"
            type="text"
            placeholder={`Message ${agent.name} (e.g. "Scan docker containers" or "Install SQLite skill")...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isThinking}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors font-mono"
          />
          <button
            id="send-console-btn"
            type="submit"
            disabled={isThinking || !inputText.trim()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium transition-colors shadow-sm shadow-indigo-500/20 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Execute</span>
          </button>
        </form>
      </div>
    </div>
  );
};
