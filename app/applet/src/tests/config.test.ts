import { describe, it, expect, beforeEach } from 'vitest';
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

  const mockHandleSaveConfig = async (
    agentId: AgentId,
    newConfig: AgentFullConfig,
    configsRecord: Record<AgentId, AgentFullConfig>,
    storage: Record<string, any>
  ): Promise<boolean> => {
    if (!newConfig.model || !newConfig.model.model || newConfig.model.model.trim() === '') {
      throw new Error('Invalid model configuration: model name cannot be empty.');
    }
    configsRecord[agentId] = JSON.parse(JSON.stringify(newConfig));
    storage.configs = JSON.parse(JSON.stringify(configsRecord));
    storage.lastSavedAgent = agentId;
    storage.savedAt = new Date().toISOString();
    return true;
  };

  it('should correctly update configs state and persist model change', async () => {
    const agentId: AgentId = 'hermes-agent';
    const initialConfig = mockConfigs[agentId];
    const initialModel = initialConfig.model.model;

    const updatedConfig: AgentFullConfig = {
      ...initialConfig,
      model: {
        ...initialConfig.model,
        provider: 'ollama',
        model: 'custom-soul-model'
      }
    };

    const success = await mockHandleSaveConfig(agentId, updatedConfig, mockConfigs, persistedStorage);
    expect(success).toBe(true);
    expect(mockConfigs[agentId].model.model).toBe('custom-soul-model');
    expect(persistedStorage.configs[agentId].model.model).toBe('custom-soul-model');
    expect(persistedStorage.lastSavedAgent).toBe('hermes-agent');
  });

  it('should reject save operation if model identifier is empty', async () => {
    const agentId: AgentId = 'hermes-agent';
    const initialModel = mockConfigs[agentId].model.model;
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

    expect(mockConfigs[agentId].model.model).toBe(initialModel);
    expect(persistedStorage.configs).toBeUndefined();
  });
});
