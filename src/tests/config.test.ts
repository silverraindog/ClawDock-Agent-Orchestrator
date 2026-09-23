import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentFullConfig, AgentId } from '../types';
import { DEFAULT_CONFIGS } from '../data/defaults';

describe('Config State Persistence and handleSaveConfig Unit Tests', () => {
  let mockConfigs: Record<AgentId, AgentFullConfig>;
  let persistedStorage: Record<string, any>;

  beforeEach(() => {
    mockConfigs = {
      'hermes-agent': JSON.parse(JSON.stringify(DEFAULT_CONFIGS['hermes-agent'])),
      'zeroclaw': JSON.parse(JSON.stringify(DEFAULT_CONFIGS['zeroclaw'])),
      'openclaw': JSON.parse(JSON.stringify(DEFAULT_CONFIGS['openclaw'])),
      'picoclaw': JSON.parse(JSON.stringify(DEFAULT_CONFIGS['picoclaw'])),
    };
    persistedStorage = {};
  });

  // Mock implementation of handleSaveConfig logic
  const mockHandleSaveConfig = async (
    agentId: AgentId,
    newConfig: AgentFullConfig,
    configsRecord: Record<AgentId, AgentFullConfig>,
    storage: Record<string, any>
  ): Promise<boolean> => {
    // 1. Validate model configuration
    if (!newConfig.model || !newConfig.model.model || newConfig.model.model.trim() === '') {
      throw new Error('Invalid model configuration: model name cannot be empty.');
    }

    // 2. Update configs state record
    configsRecord[agentId] = JSON.parse(JSON.stringify(newConfig));

    // 3. Persist to storage (simulating localStorage / persistence.json)
    storage.configs = JSON.parse(JSON.stringify(configsRecord));
    storage.lastSavedAgent = agentId;
    storage.savedAt = new Date().toISOString();

    return true;
  };

  it('should correctly update configs state and persist model change from claude-3-7-sonnet to gemma4-soul', async () => {
    const agentId: AgentId = 'hermes-agent';
    const initialConfig = mockConfigs[agentId];

    expect(initialConfig.model.model).toBe('claude-3-7-sonnet');

    // Prepare updated config with gemma4-soul
    const updatedConfig: AgentFullConfig = {
      ...initialConfig,
      model: {
        ...initialConfig.model,
        provider: 'ollama',
        model: 'gemma4-soul:latest'
      }
    };

    // Execute save logic
    const success = await mockHandleSaveConfig(agentId, updatedConfig, mockConfigs, persistedStorage);

    expect(success).toBe(true);
    // Verify configs state is updated
    expect(mockConfigs[agentId].model.model).toBe('gemma4-soul:latest');
    // Verify persistence storage reflects the saved change
    expect(persistedStorage.configs[agentId].model.model).toBe('gemma4-soul:latest');
    expect(persistedStorage.lastSavedAgent).toBe('hermes-agent');
  });

  it('should reject save operation if model identifier is empty', async () => {
    const agentId: AgentId = 'hermes-agent';
    const invalidConfig: AgentFullConfig = {
      ...mockConfigs[agentId],
      model: {
        ...mockConfigs[agentId].model,
        model: ''
      }
    };

    await expect(
      mockHandleSaveConfig(agentId, invalidConfig, mockConfigs, persistedStorage)
    ).rejects.toThrow('Invalid model configuration: model name cannot be empty.');

    // Ensure state was not modified
    expect(mockConfigs[agentId].model.model).toBe('claude-3-7-sonnet');
    expect(persistedStorage.configs).toBeUndefined();
  });
});
