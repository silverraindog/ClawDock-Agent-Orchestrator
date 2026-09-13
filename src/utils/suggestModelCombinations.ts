export type AgentPurpose = 'balanced' | 'reasoning-heavy' | 'coding-focused';

/**
 * Helper function that returns an array of optimized model names
 * based on agent purpose (balanced, reasoning-heavy, coding-focused).
 *
 * @param purpose The target agent operational purpose ('balanced' | 'reasoning-heavy' | 'coding-focused')
 * @returns Array of optimized model names
 */
export function suggestModelCombinations(purpose: string): string[] {
  const norm = (purpose || '').toLowerCase().trim();

  switch (norm) {
    case 'coding-focused':
    case 'coding':
    case 'code':
      return [
        'qwen2.5-coder:7b',
        'qwen2.5-coder:14b',
        'deepseek-r1:8b',
        'claude-3-7-sonnet',
        'gpt-4o'
      ];

    case 'reasoning-heavy':
    case 'reasoning':
    case 'reason':
    case 'math':
      return [
        'deepseek-r1:8b',
        'deepseek-r1:14b',
        'deepseek-r1',
        'o3-mini',
        'claude-3-7-sonnet'
      ];

    case 'balanced':
    default:
      return [
        'claude-3-7-sonnet',
        'gpt-4o',
        'qwen2.5-coder:7b',
        'deepseek-r1:8b',
        'mistral-nemo:12b'
      ];
  }
}

export default suggestModelCombinations;
