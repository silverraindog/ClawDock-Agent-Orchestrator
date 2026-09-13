import { describe, it, expect } from 'vitest';
import { isLocalDeployment, parseNativeConfigToSchema } from './configParser';

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
});
