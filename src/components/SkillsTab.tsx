import React, { useState } from 'react';
import { 
  Search, 
  Boxes, 
  Plus, 
  Check, 
  Download, 
  Info, 
  Terminal, 
  Globe, 
  Code, 
  GitBranch, 
  Database, 
  Brain, 
  Cpu,
  Sparkles,
  Zap
} from 'lucide-react';
import { SkillItem } from '../types';
import { SkillModal } from './SkillModal';

interface SkillsTabProps {
  skills: SkillItem[];
  onToggleSkill: (skillId: string) => void;
  onAddCustomSkill: (skill: SkillItem) => void;
}

export const SkillsTab: React.FC<SkillsTabProps> = ({
  skills,
  onToggleSkill,
  onAddCustomSkill
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeModalSkill, setActiveModalSkill] = useState<SkillItem | null>(null);
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  // New Skill form state
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCat, setNewSkillCat] = useState<any>('coding');
  const [newSkillDesc, setNewSkillDesc] = useState('');
  const [newSkillMd, setNewSkillMd] = useState('');

  const categories = [
    { id: 'all', label: 'All Skills' },
    { id: 'web', label: 'Web & Search', icon: Globe },
    { id: 'coding', label: 'Coding & Files', icon: Code },
    { id: 'system', label: 'Shell & System', icon: Terminal },
    { id: 'git', label: 'Git & PRs', icon: GitBranch },
    { id: 'database', label: 'Database & SQL', icon: Database },
    { id: 'memory', label: 'Memory & RAG', icon: Brain },
    { id: 'iot', label: 'IoT & Hardware', icon: Cpu },
  ];

  const filteredSkills = skills.filter((skill) => {
    const matchesCategory = selectedCategory === 'all' || skill.category === selectedCategory;
    const matchesSearch = 
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.parameters.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const installedCount = skills.filter(s => s.installed).length;

  const handleCreateSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    const newSkill: SkillItem = {
      id: 'custom-' + Date.now(),
      name: newSkillName.trim(),
      category: newSkillCat,
      description: newSkillDesc.trim() || 'Custom user created SKILL.md specification',
      version: '1.0.0',
      author: 'Local User',
      installed: true,
      builtIn: false,
      requiresDocker: false,
      parameters: [
        { name: 'input', type: 'string', description: 'Primary task input', required: true }
      ],
      skillMdContent: newSkillMd.trim() || `---\nname: ${newSkillName}\ndescription: ${newSkillDesc}\n---\n# Instructions\nExecute task directly.`
    };

    onAddCustomSkill(newSkill);
    setIsAddingSkill(false);
    setNewSkillName('');
    setNewSkillDesc('');
    setNewSkillMd('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Sleek Marketplace Container */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        {/* Header matching Sleek Interface specification */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Skills &amp; MCP Marketplace
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Browse, install, and configure extensible SKILL.md plugins for bot agents
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-bold text-slate-400">
              {skills.length} Total
            </span>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-bold">
              {installedCount} Installed
            </span>
            <button
              id="add-custom-skill-btn"
              onClick={() => setIsAddingSkill(true)}
              className="ml-2 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Skill</span>
            </button>
          </div>
        </div>

        {/* Search Bar matching Sleek Interface specification */}
        <div className="relative">
          <input
            id="skill-search-input"
            type="text"
            placeholder="Search skills, connectors, servers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-10 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
        </div>

        {/* Category Pills */}
        <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Custom Skill Modal */}
        {isAddingSkill && (
          <div className="p-5 rounded-2xl border border-indigo-500/30 bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Register New Custom Skill
              </h3>
              <button
                onClick={() => setIsAddingSkill(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateSkill} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Skill Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PDF Invoice Extractor"
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Category
                  </label>
                  <select
                    value={newSkillCat}
                    onChange={(e) => setNewSkillCat(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="coding">Coding &amp; Files</option>
                    <option value="web">Web &amp; Search</option>
                    <option value="system">Shell &amp; System</option>
                    <option value="git">Git &amp; PRs</option>
                    <option value="database">Database &amp; SQL</option>
                    <option value="memory">Memory &amp; RAG</option>
                    <option value="iot">IoT &amp; Hardware</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Brief summary of what this skill does"
                  value={newSkillDesc}
                  onChange={(e) => setNewSkillDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  SKILL.md Source Definition
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste Markdown / YAML instructions..."
                  value={newSkillMd}
                  onChange={(e) => setNewSkillMd(e.target.value)}
                  className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-indigo-300 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingSkill(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm shadow-indigo-500/20"
                >
                  Save Skill
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Skills Marketplace Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredSkills.map((skill) => (
            <div
              key={skill.id}
              className={`bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-start gap-3.5 transition-all ${
                skill.installed ? 'border-l-2 border-l-indigo-500' : 'opacity-85 hover:opacity-100'
              }`}
            >
              {/* Icon Container matching Sleek Interface */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                skill.installed 
                  ? 'bg-indigo-500/20 text-indigo-400' 
                  : 'bg-slate-800 text-slate-500'
              }`}>
                <Boxes className="w-5 h-5" />
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white truncate">
                    {skill.name}
                  </h3>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    {skill.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 mb-2 leading-relaxed">
                  {skill.description}
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveModalSkill(skill)}
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Configure
                  </button>

                  <span className="text-slate-700">•</span>

                  <button
                    id={`toggle-skill-${skill.id}`}
                    onClick={() => onToggleSkill(skill.id)}
                    className={`text-[11px] font-bold transition-colors ${
                      skill.installed
                        ? 'text-slate-400 hover:text-rose-400'
                        : 'text-indigo-400 hover:text-indigo-300'
                    }`}
                  >
                    {skill.installed ? 'Uninstall' : 'Install Skill'}
                  </button>
                </div>
              </div>

              {/* Installed Checkmark Icon matching Sleek Interface */}
              {skill.installed && (
                <div className="text-emerald-500 shrink-0 mt-0.5" title="Installed">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5"></path>
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredSkills.length === 0 && (
          <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-950 text-slate-400 text-xs">
            No skills match your search query &quot;{searchQuery}&quot;.
          </div>
        )}
      </div>

      {/* Skill Detail Modal */}
      <SkillModal
        skill={activeModalSkill}
        onClose={() => setActiveModalSkill(null)}
        onToggleInstall={onToggleSkill}
      />
    </div>
  );
};
