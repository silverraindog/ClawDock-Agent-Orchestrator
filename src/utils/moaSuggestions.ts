import { AgentId, LLMProvider } from '../types';
import { suggestModelCombinations as suggestModelNames } from './suggestModelCombinations';

export type AgentPurpose = 'balanced' | 'reasoning-heavy' | 'coding-focused';

export { suggestModelNames };

/**
 * Returns an array of optimized model names based on agent purpose:
 * - balanced
 * - reasoning-heavy
 * - coding-focused
 */
export function suggestModelCombinations(purpose: string): string[] {
  return suggestModelNames(purpose);
}

export interface ProposerModelSuggestion {
  value: string;
  label: string;
  role: string;
  tag: string;
  isLocal: boolean;
  priority: number;
}

export interface ModelCombinationSuggestion {
  id: string;
  name: string;
  purpose: AgentPurpose;
  targetCategory: 'local' | 'cloud' | 'hybrid';
  proposers: string[];
  aggregator: string;
  rounds: number;
  description: string;
  rationale: string;
  badge: string;
  badgeColor: string;
}

export interface PurposeMetadata {
  id: AgentPurpose;
  label: string;
  shortLabel: string;
  description: string;
  recommendedRounds: number;
  temperatureSpread: number;
  consensusThreshold: number;
  color: string;
  activeColor: string;
}

export const PURPOSE_METADATA: Record<AgentPurpose, PurposeMetadata> = {
  'coding-focused': {
    id: 'coding-focused',
    label: 'Coding-Focused',
    shortLabel: 'Coding',
    description: 'Prioritizes AST syntax parsing, library compatibility, type safety, and test case generation.',
    recommendedRounds: 2,
    temperatureSpread: 0.2,
    consensusThreshold: 0.9,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40',
    activeColor: 'bg-emerald-600 text-white border-emerald-500'
  },
  'reasoning-heavy': {
    id: 'reasoning-heavy',
    label: 'Reasoning-Heavy',
    shortLabel: 'Reasoning',
    description: 'Enforces multi-step chain-of-thought, mathematical verification, and cross-model argument auditing.',
    recommendedRounds: 3,
    temperatureSpread: 0.35,
    consensusThreshold: 0.85,
    color: 'text-amber-400 border-amber-500/30 bg-amber-950/40',
    activeColor: 'bg-amber-600 text-white border-amber-500'
  },
  'balanced': {
    id: 'balanced',
    label: 'Balanced',
    shortLabel: 'Balanced',
    description: 'Optimal balance of execution velocity, contextual recall, and natural conversational synthesis.',
    recommendedRounds: 1,
    temperatureSpread: 0.25,
    consensusThreshold: 0.8,
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/40',
    activeColor: 'bg-cyan-600 text-white border-cyan-500'
  }
};

/**
 * Determines the default operational purpose for an agent based on its ID.
 *
 * - 'hermes-agent': 'coding-focused' (specialized coding & reasoning engine)
 * - 'zeroclaw': 'balanced' (lightweight edge runtime)
 * - 'openclaw': 'balanced' (multi-channel integration gateway)
 * - 'picoclaw': 'balanced' (embedded RISC-V edge assistant)
 */
export function getAgentDefaultPurpose(agentId?: AgentId | string): AgentPurpose {
  switch (agentId) {
    case 'hermes-agent':
      return 'coding-focused';
    case 'zeroclaw':
    case 'openclaw':
    case 'picoclaw':
    default:
      return 'balanced';
  }
}

export interface SuggestionOptions {
  isLocal?: boolean;
  provider?: LLMProvider;
  currentModel?: string;
}

/**
 * Helper function to suggest individual proposer models tailored for the Proposer Models dropdown
 * based on the selected agent's purpose ('balanced', 'reasoning-heavy', or 'coding-focused').
 */
export function getSuggestedProposersForPurpose(
  purpose: AgentPurpose | string,
  options: SuggestionOptions = {}
): ProposerModelSuggestion[] {
  const normPurpose: AgentPurpose = 
    purpose === 'coding-focused' || purpose === 'reasoning-heavy' ? purpose : 'balanced';

  const { isLocal = false } = options;

  switch (normPurpose) {
    case 'coding-focused':
      return [
        {
          value: 'qwen2.5-coder:7b',
          label: 'Qwen 2.5 Coder 7B',
          role: 'Syntax AST & Quick Autocomplete',
          tag: 'Code Specialist',
          isLocal: true,
          priority: 1
        },
        {
          value: 'qwen2.5-coder:14b',
          label: 'Qwen 2.5 Coder 14B',
          role: 'Architecture & Full-File Refactoring',
          tag: 'Deep Code',
          isLocal: true,
          priority: 2
        },
        {
          value: 'deepseek-r1:8b',
          label: 'DeepSeek-R1 8B',
          role: 'Algorithmic Verification & Edge Cases',
          tag: 'Reasoning CoT',
          isLocal: true,
          priority: 3
        },
        {
          value: 'claude-3-7-sonnet',
          label: 'Claude 3.7 Sonnet',
          role: 'Frontier Architecture & Synthesis',
          tag: 'Frontier Code',
          isLocal: false,
          priority: 4
        },
        {
          value: 'gpt-4o',
          label: 'GPT-4o',
          role: 'Unit Tests & API Integrations',
          tag: 'Generalist Code',
          isLocal: false,
          priority: 5
        },
        {
          value: 'gemma4-soul:latest',
          label: 'Gemma 4 Soul',
          role: 'Documentation & Clean Code Comments',
          tag: 'Local Prose',
          isLocal: true,
          priority: 6
        }
      ].sort((a, b) => {
        if (isLocal) {
          return (b.isLocal ? 1 : 0) - (a.isLocal ? 1 : 0) || a.priority - b.priority;
        }
        return a.priority - b.priority;
      });

    case 'reasoning-heavy':
      return [
        {
          value: 'deepseek-r1:8b',
          label: 'DeepSeek-R1 8B',
          role: 'Chain-of-Thought Math & Proof Logic',
          tag: 'Reasoning CoT',
          isLocal: true,
          priority: 1
        },
        {
          value: 'deepseek-r1',
          label: 'DeepSeek-R1 (Cloud)',
          role: 'Full 671B Deep Reasoning Tree',
          tag: 'Frontier CoT',
          isLocal: false,
          priority: 2
        },
        {
          value: 'o3-mini',
          label: 'OpenAI o3-mini',
          role: 'Algorithmic Heuristics & Tree Search',
          tag: 'Fast Reasoning',
          isLocal: false,
          priority: 3
        },
        {
          value: 'llama3.3:70b',
          label: 'Llama 3.3 70B',
          role: 'Extensive World Logic & Deductions',
          tag: 'Deep Knowledge',
          isLocal: true,
          priority: 4
        },
        {
          value: 'qwen2.5-coder:14b',
          label: 'Qwen 2.5 Coder 14B',
          role: 'Formal Symbolic Consistency',
          tag: 'Logic Validator',
          isLocal: true,
          priority: 5
        },
        {
          value: 'claude-3-7-sonnet',
          label: 'Claude 3.7 Sonnet',
          role: 'Nuanced Deductive Audit & Synthesis',
          tag: 'Frontier CoT',
          isLocal: false,
          priority: 6
        }
      ].sort((a, b) => {
        if (isLocal) {
          return (b.isLocal ? 1 : 0) - (a.isLocal ? 1 : 0) || a.priority - b.priority;
        }
        return a.priority - b.priority;
      });

    case 'balanced':
    default:
      return [
        {
          value: 'qwen2.5-coder:7b',
          label: 'Qwen 2.5 Coder 7B',
          role: 'Fast Syntax & Structured Output',
          tag: 'Speed & Code',
          isLocal: true,
          priority: 1
        },
        {
          value: 'mistral-nemo:12b',
          label: 'Mistral Nemo 12B',
          role: 'Conversational Fluency & Logic',
          tag: 'Versatile Edge',
          isLocal: true,
          priority: 2
        },
        {
          value: 'llama3.3:8b',
          label: 'Llama 3.3 8B',
          role: 'General Factuality & Instruction Follow',
          tag: 'Lightweight',
          isLocal: true,
          priority: 3
        },
        {
          value: 'gpt-4o',
          label: 'GPT-4o',
          role: 'Broad Multi-Domain Knowledge',
          tag: 'Frontier General',
          isLocal: false,
          priority: 4
        },
        {
          value: 'claude-3-7-sonnet',
          label: 'Claude 3.7 Sonnet',
          role: 'Instruction Nuance & Safe Synthesis',
          tag: 'Frontier Leader',
          isLocal: false,
          priority: 5
        },
        {
          value: 'gemini-2.5-pro',
          label: 'Gemini 2.5 Pro',
          role: 'Cross-Disciplinary Reasoning',
          tag: 'Google Frontier',
          isLocal: false,
          priority: 6
        }
      ].sort((a, b) => {
        if (isLocal) {
          return (b.isLocal ? 1 : 0) - (a.isLocal ? 1 : 0) || a.priority - b.priority;
        }
        return a.priority - b.priority;
      });
  }
}

/**
 * Curated preset ensembles of proposers, an optimal aggregator, recommended round count,
 * and explanation of why the ensemble succeeds for that purpose.
 */
export function suggestModelCombinationPresets(
  purpose: AgentPurpose | string,
  options: SuggestionOptions = {}
): ModelCombinationSuggestion[] {
  const normPurpose: AgentPurpose = 
    purpose === 'coding-focused' || purpose === 'reasoning-heavy' ? purpose : 'balanced';

  switch (normPurpose) {
    case 'coding-focused':
      return [
        {
          id: 'code-local-trio',
          name: 'Local Code & Syntax Trio',
          purpose: 'coding-focused',
          targetCategory: 'local',
          proposers: ['qwen2.5-coder:7b', 'deepseek-r1:8b', 'gemma4-soul:latest'],
          aggregator: 'qwen2.5-coder:14b',
          rounds: 2,
          description: 'AST syntax generation + algorithmic bug verification + clear documentation.',
          rationale: 'Qwen provides programmatic syntax correctness; DeepSeek-R1 catches logic and memory edge cases; Gemma formulates coherent docstrings and API explanations.',
          badge: 'Edge Coding',
          badgeColor: 'border-emerald-500/30 bg-emerald-950/60 text-emerald-300'
        },
        {
          id: 'code-frontier-polyglot',
          name: 'Frontier Polyglot Engineering Stack',
          purpose: 'coding-focused',
          targetCategory: 'cloud',
          proposers: ['claude-3-7-sonnet', 'deepseek-r1', 'gpt-4o'],
          aggregator: 'claude-3-7-sonnet',
          rounds: 2,
          description: 'Comprehensive frontier code refactoring, formal correctness, and automated unit testing.',
          rationale: 'Combines Claude’s deep architecture refactoring with DeepSeek’s mathematical proof verification and GPT-4o’s expansive test-case coverage.',
          badge: 'Frontier Engineering',
          badgeColor: 'border-purple-500/30 bg-purple-950/60 text-purple-300'
        },
        {
          id: 'code-fast-edge',
          name: 'Low-Latency Edge Code Completer',
          purpose: 'coding-focused',
          targetCategory: 'local',
          proposers: ['qwen2.5-coder:7b', 'qwen2.5-coder:14b', 'mistral-nemo:12b'],
          aggregator: 'qwen2.5-coder:14b',
          rounds: 1,
          description: 'High-speed local syntax draft with immediate aggregator consolidation.',
          rationale: 'Double-checks AST tokens between 7B and 14B weights in a single fast pass with minimal VRAM contention.',
          badge: 'Low VRAM Code',
          badgeColor: 'border-teal-500/30 bg-teal-950/60 text-teal-300'
        }
      ];

    case 'reasoning-heavy':
      return [
        {
          id: 'reasoning-deep-audit',
          name: 'Deep Reasoning & Math Audit',
          purpose: 'reasoning-heavy',
          targetCategory: 'local',
          proposers: ['deepseek-r1:8b', 'llama3.3:70b', 'qwen2.5-coder:14b'],
          aggregator: 'deepseek-r1:8b',
          rounds: 3,
          description: 'Rigorous chain-of-thought verification for proofs, symbolic logic, and algorithms.',
          rationale: 'DeepSeek-R1 enforces step-by-step mathematical proofs; Llama 70B checks multi-step consistency; Qwen validates formal algorithms across 3 iterative consensus passes.',
          badge: 'Heavy Math/Logic',
          badgeColor: 'border-amber-500/30 bg-amber-950/60 text-amber-300'
        },
        {
          id: 'reasoning-frontier-triad',
          name: 'Frontier Multi-Reasoner Triad',
          purpose: 'reasoning-heavy',
          targetCategory: 'cloud',
          proposers: ['deepseek-r1', 'o3-mini', 'claude-3-7-sonnet'],
          aggregator: 'deepseek-r1',
          rounds: 2,
          description: 'DeepSeek exhaustive chain-of-thought + OpenAI tree-search heuristics + Claude synthesis.',
          rationale: 'Cross-checks deductive arguments across non-overlapping model architectures, eliminating single-lab bias and false positive deductions.',
          badge: 'Frontier CoT',
          badgeColor: 'border-rose-500/30 bg-rose-950/60 text-rose-300'
        },
        {
          id: 'reasoning-reflective-edge',
          name: 'Reflective Logic Consensus (Edge)',
          purpose: 'reasoning-heavy',
          targetCategory: 'local',
          proposers: ['deepseek-r1:8b', 'mistral-nemo:12b', 'phi-4:14b'],
          aggregator: 'deepseek-r1:8b',
          rounds: 2,
          description: 'Multi-perspective deductive reasoning with zero cloud dependency.',
          rationale: 'Combines chain-of-thought reasoning with dense instruction-following models to filter invalid steps and verify facts locally.',
          badge: 'Edge Reasoner',
          badgeColor: 'border-orange-500/30 bg-orange-950/60 text-orange-300'
        }
      ];

    case 'balanced':
    default:
      return [
        {
          id: 'balanced-fast-consensus',
          name: 'Fast Balanced Consensus',
          purpose: 'balanced',
          targetCategory: 'local',
          proposers: ['qwen2.5-coder:7b', 'mistral-nemo:12b', 'llama3.3:8b'],
          aggregator: 'qwen2.5-coder:7b',
          rounds: 1,
          description: 'Rapid first-pass consensus across diverse 7B-12B foundation weights.',
          rationale: 'Three lightweight models run in parallel with negligible memory contention, preventing single-model hallucinations without latency bottlenecks.',
          badge: 'Fast & Versatile',
          badgeColor: 'border-cyan-500/30 bg-cyan-950/60 text-cyan-300'
        },
        {
          id: 'balanced-frontier-general',
          name: 'Frontier Generalist Triangulation',
          purpose: 'balanced',
          targetCategory: 'cloud',
          proposers: ['gpt-4o', 'claude-3-7-sonnet', 'gemini-2.5-pro'],
          aggregator: 'gpt-4o',
          rounds: 2,
          description: 'Multi-provider consensus cross-checking OpenAI, Anthropic, and Google frontier models.',
          rationale: 'Maximizes cross-domain knowledge coverage, factual recall, and nuance across diverse generalist agent queries.',
          badge: 'Frontier General',
          badgeColor: 'border-indigo-500/30 bg-indigo-950/60 text-indigo-300'
        },
        {
          id: 'balanced-hybrid-draft',
          name: 'Hybrid Edge-Draft + Cloud Audit',
          purpose: 'balanced',
          targetCategory: 'hybrid',
          proposers: ['qwen2.5-coder:7b', 'deepseek-r1:8b', 'claude-3-7-sonnet'],
          aggregator: 'claude-3-7-sonnet',
          rounds: 2,
          description: 'Local edge drafting combined with cloud frontier verification for speed and cost efficiency.',
          rationale: 'Local models generate immediate solution drafts privately and at zero token cost, while Claude audits the proposed solutions and synthesizes the optimal final artifact.',
          badge: 'Hybrid Efficiency',
          badgeColor: 'border-blue-500/30 bg-blue-950/60 text-blue-300'
        }
      ];
  }
}
