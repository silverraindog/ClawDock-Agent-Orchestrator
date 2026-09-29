import { describe, it, expect } from 'vitest';
import { isLocalDeployment, parseNativeConfigToSchema, detectOpenClawConfigFormat, enhanceConfigWithNative, sanitizeConfigString } from './configParser';
import { AgentFullConfig } from '../types';

describe('Config Parser Utilities', () => {
  it('correctly identifies local deployments based on provider', () => {
    expect(isLocalDeployment('ollama', '', '')).toBe(true);
    expect(isLocalDeployment('custom', '', '')).toBe(true);
    expect(isLocalDeployment('anthropic', 'https://api.anthropic.com', 'claude-3')).toBe(false);
  });

  it('correctly identifies local deployments based on baseUrl', () => {
    expect(isLocalDeployment('anthropic', 'http://localhost:11434', '')).toBe(true);
    expect(isLocalDeployment('openai', 'http://192.168.1.50:8000', '')).toBe(true);
  });

  it('correctly identifies local deployments based on model name', () => {
    expect(isLocalDeployment('anthropic', '', 'qwen2.5-coder:7b')).toBe(true);
    expect(isLocalDeployment('openai', '', 'gpt-4o')).toBe(false);
  });

  it('parses JSON config correctly into schema', () => {
    const jsonContent = JSON.stringify({
      model: {
        model: 'deepseek-r1',
        provider: 'deepseek',
        temperature: 0.3,
        base_url: 'https://api.deepseek.com'
      }
    });

    const parsed = parseNativeConfigToSchema('zeroclaw', jsonContent, 'json');
    expect(parsed.model?.model).toBe('deepseek-r1');
    expect(parsed.model?.provider).toBe('deepseek');
    expect(parsed.model?.temperature).toBe(0.3);
    expect(parsed.model?.baseUrl).toBe('https://api.deepseek.com');
  });

  it('parses YAML config correctly into schema', () => {
    const yamlContent = `
model:
  model: "claude-3-7-sonnet"
  provider: "anthropic"
  temperature: 0.2
  context_length: 8192
    `.trim();

    const parsed = parseNativeConfigToSchema('hermes-agent', yamlContent, 'yaml');
    expect(parsed.model?.model).toBe('claude-3-7-sonnet');
    expect(parsed.model?.provider).toBe('anthropic');
    expect(parsed.model?.temperature).toBe(0.2);
    expect(parsed.model?.contextWindow).toBe(8192);
  });

  describe('detectOpenClawConfigFormat', () => {
    it('detects v1 format by default', () => {
      expect(detectOpenClawConfigFormat('{}')).toBe('v1');
    });
    it('detects v2 format based on gateway key', () => {
      expect(detectOpenClawConfigFormat('{"gateway": {}}')).toBe('v2');
    });
    it('detects v2 format based on agent version', () => {
      expect(detectOpenClawConfigFormat('{}', '2.0.0')).toBe('v2');
    });
  });

  describe('parseNativeConfigToSchema (TOML)', () => {
    it('parses TOML config correctly into schema', () => {
      const tomlContent = `
agent_name = "Hermes"
provider = "ollama"
model = "gemma4-soul:latest"
temperature = 0.5
      `.trim();
      const parsed = parseNativeConfigToSchema('hermes-agent', tomlContent, 'toml');
      expect(parsed.system?.agentName).toBe('Hermes');
      expect(parsed.model?.provider).toBe('ollama');
      expect(parsed.model?.model).toBe('gemma4-soul:latest');
    });
  });

  describe('enhanceConfigWithNative', () => {
    it('enhances base config with native settings', () => {
      const baseConfig: Partial<AgentFullConfig> = {
        model: { provider: 'openai', model: 'gpt-4o', temperature: 0.7, reasoningEffort: 'low', maxTokens: 100, contextWindow: 1000, topP: 1, apiKey: 'abc' }
      } as any;
      const nativeContent = `model: gemma4-soul:latest\nprovider: ollama`;
      const enhanced = enhanceConfigWithNative(baseConfig, nativeContent, 'yaml', 'hermes-agent');
      expect(enhanced.model.model).toBe('gemma4-soul:latest');
      expect(enhanced.model.provider).toBe('ollama');
      expect(enhanced.model.temperature).toBe(0.7); // Should retain from base
    });
  });

  describe('sanitizeConfigString', () => {
    it('normalizes corrupted port strings like 11434host:11434 to 11434 without altering valid configuration structures', () => {
      const corruptedConfig = {
        system: {
          agentName: 'Hermes Agent',
          description: 'Autonomous worker',
          port: '11434host:11434',
        },
        model: {
          provider: 'ollama',
          model: 'gemma4-soul:latest',
          baseUrl: 'http://localhost:11434host:11434',
          portString: '11434host:11434',
          temperature: 0.7,
          maxTokens: 4096,
        },
        fallback: {
          enabled: true,
          provider: 'custom',
          baseUrl: 'http://192.168.1.49:11434host:11434',
          maxRetries: 3,
        },
        channels: {
          discord: {
            enabled: true,
            webhookUrl: 'https://discord.com/api/webhooks/123/abc',
          },
        },
        tags: ['edge', 'local', '11434host:11434'],
      };

      const sanitizedConfig = sanitizeConfigString(corruptedConfig);

      // Verify corrupted strings are normalized to '11434'
      expect(sanitizedConfig.system.port).toBe('11434');
      expect(sanitizedConfig.model.baseUrl).toBe('http://localhost:11434');
      expect(sanitizedConfig.model.portString).toBe('11434');
      expect(sanitizedConfig.fallback.baseUrl).toBe('http://192.168.1.49:11434');
      expect(sanitizedConfig.tags).toEqual(['edge', 'local', '11434']);

      // Verify valid configuration structures are preserved
      expect(sanitizedConfig.system.agentName).toBe('Hermes Agent');
      expect(sanitizedConfig.system.description).toBe('Autonomous worker');
      expect(sanitizedConfig.model.provider).toBe('ollama');
      expect(sanitizedConfig.model.model).toBe('gemma4-soul:latest');
      expect(sanitizedConfig.model.temperature).toBe(0.7);
      expect(sanitizedConfig.model.maxTokens).toBe(4096);
      expect(sanitizedConfig.fallback.enabled).toBe(true);
      expect(sanitizedConfig.fallback.provider).toBe('custom');
      expect(sanitizedConfig.fallback.maxRetries).toBe(3);
      expect(sanitizedConfig.channels.discord.enabled).toBe(true);
      expect(sanitizedConfig.channels.discord.webhookUrl).toBe('https://discord.com/api/webhooks/123/abc');
    });

    it('normalizes standalone corrupted string to 11434', () => {
      expect(sanitizeConfigString('11434host:11434')).toBe('11434');
      expect(sanitizeConfigString('http://localhost:11434host:11434')).toBe('http://localhost:11434');
    });

    it('normalizes serialized config JSON string containing 11434host:11434', () => {
      const rawJson = JSON.stringify({
        endpoint: 'http://localhost:11434host:11434',
        port: '11434host:11434',
        provider: 'ollama',
      });
      const sanitizedJson = sanitizeConfigString(rawJson);
      expect(sanitizedJson).not.toContain('11434host:11434');
      const parsed = JSON.parse(sanitizedJson);
      expect(parsed.endpoint).toBe('http://localhost:11434');
      expect(parsed.port).toBe('11434');
      expect(parsed.provider).toBe('ollama');
    });
  });
});
