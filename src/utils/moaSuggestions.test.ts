import { describe, it, expect } from 'vitest';
import {
  suggestModelCombinations,
  suggestModelCombinationPresets,
  getSuggestedProposersForPurpose,
  getAgentDefaultPurpose,
  PURPOSE_METADATA,
  AgentPurpose
} from './moaSuggestions';

describe('MoA Proposer Suggestions by Agent Purpose', () => {
  describe('getAgentDefaultPurpose', () => {
    it('detects coding-focused for hermes-agent', () => {
      expect(getAgentDefaultPurpose('hermes-agent')).toBe('coding-focused');
    });

    it('detects balanced for edge and gateway agents', () => {
      expect(getAgentDefaultPurpose('zeroclaw')).toBe('balanced');
      expect(getAgentDefaultPurpose('openclaw')).toBe('balanced');
      expect(getAgentDefaultPurpose('picoclaw')).toBe('balanced');
    });

    it('defaults unknown agents to balanced', () => {
      expect(getAgentDefaultPurpose('custom-agent' as any)).toBe('balanced');
      expect(getAgentDefaultPurpose(undefined)).toBe('balanced');
    });
  });

  describe('suggestModelCombinations (model names array)', () => {
    it('returns an array of optimized model names for coding-focused', () => {
      const models = suggestModelCombinations('coding-focused');
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models.some(m => m.includes('coder'))).toBe(true);
    });

    it('returns an array of optimized model names for reasoning-heavy', () => {
      const models = suggestModelCombinations('reasoning-heavy');
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models.some(m => m.includes('r1') || m.includes('o3'))).toBe(true);
    });

    it('returns an array of optimized model names for balanced', () => {
      const models = suggestModelCombinations('balanced');
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    it('falls back to balanced when an unknown purpose is passed', () => {
      const models = suggestModelCombinations('unknown' as any);
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });
  });

  describe('suggestModelCombinationPresets', () => {
    it('suggests coding-focused combinations with coder models and appropriate rounds', () => {
      const combos = suggestModelCombinationPresets('coding-focused');
      expect(combos.length).toBeGreaterThan(0);
      
      const localTrio = combos.find(c => c.id === 'code-local-trio');
      expect(localTrio).toBeDefined();
      expect(localTrio?.proposers).toContain('qwen2.5-coder:7b');
      expect(localTrio?.aggregator).toBe('qwen2.5-coder:14b');
      expect(localTrio?.purpose).toBe('coding-focused');

      const frontierStack = combos.find(c => c.id === 'code-frontier-polyglot');
      expect(frontierStack).toBeDefined();
      expect(frontierStack?.proposers).toContain('claude-3-7-sonnet');
      expect(frontierStack?.proposers).toContain('deepseek-r1');
    });

    it('suggests reasoning-heavy combinations with high-effort chain-of-thought models', () => {
      const combos = suggestModelCombinationPresets('reasoning-heavy');
      expect(combos.length).toBeGreaterThan(0);
      
      const deepAudit = combos.find(c => c.id === 'reasoning-deep-audit');
      expect(deepAudit).toBeDefined();
      expect(deepAudit?.proposers).toContain('deepseek-r1:8b');
      expect(deepAudit?.rounds).toBe(3);

      const frontierTriad = combos.find(c => c.id === 'reasoning-frontier-triad');
      expect(frontierTriad).toBeDefined();
      expect(frontierTriad?.proposers).toContain('o3-mini');
      expect(frontierTriad?.proposers).toContain('deepseek-r1');
    });

    it('suggests balanced combinations prioritizing versatility and speed', () => {
      const combos = suggestModelCombinationPresets('balanced');
      expect(combos.length).toBeGreaterThan(0);
      
      const fastConsensus = combos.find(c => c.id === 'balanced-fast-consensus');
      expect(fastConsensus).toBeDefined();
      expect(fastConsensus?.rounds).toBe(1);

      const generalTrio = combos.find(c => c.id === 'balanced-frontier-general');
      expect(generalTrio).toBeDefined();
      expect(generalTrio?.proposers).toContain('gpt-4o');
      expect(generalTrio?.proposers).toContain('claude-3-7-sonnet');
    });

    it('falls back to balanced when an unexpected purpose string is passed', () => {
      const combos = suggestModelCombinationPresets('unknown-purpose' as any);
      expect(combos.length).toBeGreaterThan(0);
      expect(combos[0].purpose).toBe('balanced');
    });
  });

  describe('getSuggestedProposersForPurpose', () => {
    it('returns prioritized coding models for coding-focused purpose', () => {
      const models = getSuggestedProposersForPurpose('coding-focused');
      expect(models.length).toBeGreaterThan(0);
      expect(models.some(m => m.value.includes('coder'))).toBe(true);
      expect(models.some(m => m.role.toLowerCase().includes('syntax') || m.role.toLowerCase().includes('ast'))).toBe(true);
    });

    it('returns reasoning models for reasoning-heavy purpose', () => {
      const models = getSuggestedProposersForPurpose('reasoning-heavy');
      expect(models.length).toBeGreaterThan(0);
      expect(models.some(m => m.value.includes('r1'))).toBe(true);
      expect(models.some(m => m.role.toLowerCase().includes('math') || m.role.toLowerCase().includes('proof') || m.role.toLowerCase().includes('reasoning'))).toBe(true);
    });

    it('prioritizes local models when isLocal is true', () => {
      const models = getSuggestedProposersForPurpose('coding-focused', { isLocal: true });
      expect(models[0].isLocal).toBe(true);
    });
  });

  describe('PURPOSE_METADATA', () => {
    it('contains valid definitions for all AgentPurpose keys', () => {
      const purposes: AgentPurpose[] = ['balanced', 'reasoning-heavy', 'coding-focused'];
      purposes.forEach(p => {
        const meta = PURPOSE_METADATA[p];
        expect(meta).toBeDefined();
        expect(meta.label).toBeTruthy();
        expect(meta.recommendedRounds).toBeGreaterThan(0);
        expect(meta.consensusThreshold).toBeGreaterThan(0);
      });
    });
  });
});
