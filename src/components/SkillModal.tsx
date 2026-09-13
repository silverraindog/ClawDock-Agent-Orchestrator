import React from 'react';
import { X, Check, Download, ExternalLink, ShieldCheck, Box, Terminal } from 'lucide-react';
import { SkillItem } from '../types';

interface SkillModalProps {
  skill: SkillItem | null;
  onClose: () => void;
  onToggleInstall: (skillId: string) => void;
}

export const SkillModal: React.FC<SkillModalProps> = ({
  skill,
  onClose,
  onToggleInstall
}) => {
  if (!skill) return null;

  return (
    <div id="skill-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div 
        id="skill-modal-content"
        className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{skill.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {skill.version}
                </span>
              </div>
              <p className="text-xs text-slate-400">Author: {skill.author}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Description
            </h4>
            <p className="text-sm text-slate-200 leading-relaxed">
              {skill.description}
            </p>
          </div>

          {/* Badges / Metadata */}
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300">
              Category: {skill.category.toUpperCase()}
            </span>
            {skill.requiresDocker && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5" />
                Requires Docker Container
              </span>
            )}
            {skill.builtIn && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Core Standard Skill
              </span>
            )}
          </div>

          {/* Parameters Schema */}
          {skill.parameters && skill.parameters.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Tool Parameters &amp; Arguments
              </h4>
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Parameter</th>
                      <th className="py-2.5 px-3 font-semibold">Type</th>
                      <th className="py-2.5 px-3 font-semibold">Required</th>
                      <th className="py-2.5 px-3 font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                    {skill.parameters.map((p) => (
                      <tr key={p.name} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-indigo-400 font-bold">{p.name}</td>
                        <td className="py-2 px-3 text-cyan-300">{p.type}</td>
                        <td className="py-2 px-3 text-slate-300">
                          {p.required ? <span className="text-rose-400 font-bold">Yes</span> : 'No'}
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-sans">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SKILL.md Content */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              SKILL.md Source Definition
            </h4>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {skill.skillMdContent}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="text-xs text-slate-400">
            Compatible with Hermes, ZeroClaw, OpenClaw &amp; PicoClaw
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                onToggleInstall(skill.id);
                onClose();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                skill.installed
                  ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-500/20'
              }`}
            >
              {skill.installed ? 'Uninstall Skill' : 'Install Skill into Container'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
