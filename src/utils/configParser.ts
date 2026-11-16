import { AgentFullConfig, AgentId, ChannelConfig, FallbackConfig, LLMProvider, ModelConfig, MoAConfig } from '../types';
import { DEFAULT_NATIVE_FILES } from '../data/defaults';
import { mergeWithDefaultConfig } from './apiBridge';
import YAML from 'yaml';

/**
 * Checks whether the configuration indicates a local edge or self-hosted deployment
 * (e.g. Ollama, local network IP like 192.168.x.x, localhost, or custom private endpoint).
 */
export function isLocalDeployment(provider?: string, baseUrl?: string, model?: string): boolean {
  if (provider === 'ollama' || provider === 'custom') return true;
  if (baseUrl) {
    const lowerUrl = baseUrl.toLowerCase();
    if (
      lowerUrl.includes('11434') ||
      lowerUrl.includes('localhost') ||
      lowerUrl.includes('127.0.0.1') ||
      lowerUrl.includes('192.168.') ||
      lowerUrl.includes('10.') ||
      lowerUrl.includes('172.16.') ||
      lowerUrl.includes(':8000') ||
      lowerUrl.includes(':5000') ||
      lowerUrl.includes('v1') && lowerUrl.includes('192.')
    ) {
      return true;
    }
  }
  if (model) {
    const lowerModel = model.toLowerCase();
    if (
      lowerModel.includes('ollama') ||
      lowerModel.includes('qwen2.5') ||
      lowerModel.includes(':latest') ||
      lowerModel.includes('gemma') ||
      lowerModel.includes('llama3')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Detects whether an OpenClaw configuration payload or content is v1 (Classic) or v2 (Enterprise Gateway).
 */
export function detectOpenClawConfigFormat(
  contentOrObj: string | any,
  agentVersion?: string
): 'v1' | 'v2' {
  // 1. Explicit daemon/package version check (e.g. v2.0.0, 2.1.0)
  if (agentVersion) {
    const cleanVer = agentVersion.replace(/^v/, '').trim();
    if (cleanVer.startsWith('2.') || cleanVer.startsWith('3.')) {
      return 'v2';
    }
  }

  // 2. Object or parsed content inspection
  let obj: any = contentOrObj;
  if (typeof contentOrObj === 'string') {
    try {
      obj = JSON.parse(contentOrObj);
    } catch {
      // Check YAML / key patterns
      if (
        contentOrObj.includes('gateway:') ||
        contentOrObj.includes('lastTouchedVersion') ||
        contentOrObj.includes('agents:') ||
        contentOrObj.includes('ownership: explicit') ||
        contentOrObj.includes('models:')
      ) {
        return 'v2';
      }
      return 'v1';
    }
  }

  if (obj && typeof obj === 'object') {
    // OpenClaw v2 structural signatures
    if (
      obj.meta?.lastTouchedVersion ||
      obj.meta?.migrations ||
      obj.gateway ||
      obj.agents?.ownership ||
      obj.agents?.defaults ||
      obj.agents?.entries ||
      obj.models?.providers ||
      obj.models?.mode ||
      obj.tools?.profile ||
      obj.channels?.defaults ||
      obj.acp ||
      obj.secrets?.egressProxy
    ) {
      return 'v2';
    }

    // Check version field inside v1 vs v2
    if (obj.version && (String(obj.version).startsWith('2.') || String(obj.version).startsWith('v2.'))) {
      return 'v2';
    }
  }

  return 'v1';
}

/**
 * Sanitizes configuration strings by normalizing corrupted URLs.
 * Removes malformed URL patterns like "11434host:11434" which indicate corruption.
 */
export function sanitizeConfigString(input: string): string {
  if (!input) return input;
  
  // Remove corrupted patterns like "11434host:11434" or "host:11434"
  // These are indicators of corrupted configuration strings
  const sanitized = input.replace(/11434/g, '').replace(/host:11434/g, '');
  return sanitized;
}

/**
 * Parses native container configuration files (YAML, JSON, TOML)
 * into a strongly-typed Partial<AgentFullConfig>.
 * 
 * Supports both OpenClaw v1 and OpenClaw v2 schema formats.
 */
export function parseNativeConfigToSchema(
  agentId: AgentId,
  nativeContent: string,
  format: string = 'yaml'
): Partial<AgentFullConfig> {
  // Validate input is a non-empty string
  if (!nativeContent || typeof nativeContent !== 'string') {
    return {};
  }

  const result: Partial<AgentFullConfig> = {
    agentId
  };

  const trimmed = nativeContent.trim();
  const detectedFormat = format || (trimmed.startsWith('{') ? 'json' : 'yaml');

  let parsedModelName: string | undefined;
  let parsedProvider: LLMProvider | undefined;
  let parsedBaseUrl: string | undefined;
  let parsedContextLength: number | undefined;
  let parsedMaxTokens: number | undefined;
  let parsedTemperature: number | undefined;
  let parsedApiKey: string | undefined;
  let parsedUseProxy: boolean | undefined;
  let parsedAgentName: string | undefined;
  let parsedSystemPrompt: string | undefined;
  let parsedPreset: any;
  let parsedAggregatorModel: string | undefined;
  let parsedProposerModels: string[] | undefined;
  let parsedMoaEnabled: boolean | undefined;
  let parsedProviderMapping: Record<string, string> | undefined = undefined;
  let parsedChannels: Partial<ChannelConfig> | undefined;
  let parsedFallback: Partial<FallbackConfig> | undefined;

  // 1. JSON Parsing (Handles both OpenClaw v1 and OpenClaw v2)
  if (detectedFormat === 'json') {
    try {
      const json = JSON.parse(nativeContent);
      const isV2 = agentId === 'openclaw' && detectOpenClawConfigFormat(json);

      if (isV2 === 'v2') {
        // --- OpenClaw v2 JSON Schema Parsing ---
        const openclawEntry = json.agents?.entries?.openclaw || json.agents?.entries?.[Object.keys(json.agents?.entries || {})[0]];
        const agentDefaults = json.agents?.defaults || {};

        parsedAgentName = openclawEntry?.name || 'OpenClaw Gateway';
        parsedSystemPrompt = openclawEntry?.description || agentDefaults.workspace || 'You are OpenClaw, a multi-channel cooperative assistant gateway.';

        // Model parsing: e.g. "openai/gpt-4o" or { primary: "openai/gpt-4o", fallbacks: [...] }
        const rawModelRef = openclawEntry?.model || agentDefaults.model;
        let modelString = typeof rawModelRef === 'string' ? rawModelRef : rawModelRef?.primary || '';
        
        if (modelString.includes('/')) {
          const parts = modelString.split('/');
          const prov = parts[0] as LLMProvider;
          const mod = parts.slice(1).join('/');
          parsedProvider = prov;
          parsedModelName = mod;
        } else if (modelString) {
          parsedModelName = modelString;
        }

        // Provider configuration
        if (json.models?.providers && parsedProvider && json.models.providers[parsedProvider]) {
          const provCfg = json.models.providers[parsedProvider];
          parsedBaseUrl = provCfg.baseUrl;
          parsedApiKey = typeof provCfg.apiKey === 'string' ? provCfg.apiKey : provCfg.apiKey?.id;
          if (provCfg.maxTokens) parsedMaxTokens = Number(provCfg.maxTokens);
        }

        // Channels in OpenClaw v2
        if (json.channels) {
          parsedChannels = {};
          if (json.channels.telegram) {
            const tel = json.channels.telegram;
            parsedChannels.telegram = {
              enabled: tel.enabled !== undefined ? Boolean(tel.enabled) : true,
              botToken: typeof tel.botToken === 'string' ? tel.botToken : 'env:OPENCLAW_TELEGRAM_TOKEN',
              allowedUsers: Array.isArray(tel.allowFrom) ? tel.allowFrom.join(', ') : '*',
              mode: 'polling'
            };
          }
          if (json.channels.discord) {
            const disc = json.channels.discord;
            parsedChannels.discord = {
              enabled: disc.enabled !== undefined ? Boolean(disc.enabled) : true,
              botToken: typeof disc.token === 'string' ? disc.token : typeof disc.botToken === 'string' ? disc.botToken : 'env:OPENCLAW_DISCORD_TOKEN',
              clientId: disc.applicationId || '1234567890',
              guildIds: '9876543210'
            };
          }
        }

        // MCP servers in OpenClaw v2
        if (json.mcpServers) {
          parsedMoaEnabled = true;
        }
      } else {
        // --- OpenClaw v1 JSON Schema Parsing ---
        const modelRef = json.model || agentDefaults.model;
        let modelString = typeof modelRef === 'string' ? modelRef : modelRef?.primary || '';
        
        if (modelString.includes('/')) {
          const parts = modelString.split('/');
          const prov = parts[0] as LLMProvider;
          const mod = parts.slice(1).join('/');
          parsedProvider = prov;
          parsedModelName = mod;
        } else if (modelString) {
          parsedModelName = modelString;
        }

        // Provider configuration
        if (json.models?.providers && parsedProvider && json.models.providers[parsedProvider]) {
          const provCfg = json.models.providers[parsedProvider];
          parsedBaseUrl = provCfg.baseUrl;
          parsedApiKey = typeof provCfg.apiKey === 'string' ? provCfg.apiKey : provCfg.apiKey?.id;
          if (provCfg.maxTokens) parsedMaxTokens = Number(provCfg.maxTokens);
        }

        // MCP servers in OpenClaw v1
        if (json.mcpServers) {
          parsedMoaEnabled = true;
        }
      }
    } catch (e) {
      console.error(`[configParser] Failed to parse JSON config: ${e.message}`);
      return {};
    }
  }

  // 2. YAML Parsing
  else if (detectedFormat === 'yaml') {
    try {
      const parsed = YAML.load(trimmed);
      
      if (parsed.agentId) {
        result.agentId = parsed.agentId;
      }

      // Model parsing
      const modelRef = parsed.model || parsed.defaults?.model;
      let modelString = typeof modelRef === 'string' ? modelRef : modelRef?.primary || '';
      
      if (modelString.includes('/')) {
        const parts = modelString.split('/');
        const prov = parts[0] as LLMProvider;
        const mod = parts.slice(1).join('/');
        parsedProvider = prov;
        parsedModelName = mod;
      } else if (modelString) {
        parsedModelName = modelString;
      }

      // Provider configuration
      if (parsed.models?.providers && parsedProvider && parsed.models.providers[parsedProvider]) {
        const provCfg = parsed.models.providers[parsedProvider];
        parsedBaseUrl = provCfg.baseUrl;
        parsedApiKey = typeof provCfg.apiKey === 'string' ? provCfg.apiKey : provCfg.apiKey?.id;
        if (provCfg.maxTokens) parsedMaxTokens = Number(provCfg.maxTokens);
      }

      // MCP servers in YAML
      if (parsed.mcpServers) {
        parsedMoaEnabled = true;
      }
    } catch (e) {
      console.error(`[configParser] Failed to parse YAML config: ${e.message}`);
      return {};
    }
  }

  // 3. TOML Parsing
  else if (detectedFormat === 'toml') {
    try {
      const parsed = TOML.parse(trimmed);
      
      if (parsed.agentId) {
        result.agentId = parsed.agentId;
      }

      // Model parsing
      const modelRef = parsed.model || parsed.defaults?.model;
      let modelString = typeof modelRef === 'string' ? modelRef : modelRef?.primary || '';
      
      if (modelString.includes('/')) {
        const parts = modelString.split('/');
        const prov = parts[0] as LLMProvider;
        const mod = parts.slice(1).join('/');
        parsedProvider = prov;
        parsedModelName = mod;
      } else if (modelString) {
        parsedModelName = modelString;
      }

      // Provider configuration
      if (parsed.models?.providers && parsedProvider && parsed.models.providers[parsedProvider]) {
        const provCfg = parsed.models.providers[parsedProvider];
        parsedBaseUrl = provCfg.baseUrl;
        parsedApiKey = typeof provCfg.apiKey === 'string' ? provCfg.apiKey : provCfg.apiKey?.id;
        if (provCfg.maxTokens) parsedMaxTokens = Number(provCfg.maxTokens);
      }

      // MCP servers in TOML
      if (parsed.mcpServers) {
        parsedMoaEnabled = true;
      }
    } catch (e) {
      console.error(`[configParser] Failed to parse TOML config: ${e.message}`);
      return {};
    }
  }

  // Merge with defaults
  result = mergeWithDefaultConfig(result, DEFAULT_NATIVE_FILES);

  return result;
}

/**
 * Validates a native configuration string against schema rules.
 */
export function validateNativeConfig(
  agentId: AgentId,
  content: string,
  format: 'yaml' | 'toml' | 'json' = 'yaml'
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for empty content
  if (!content || !content.trim()) {
    errors.push('Configuration file is empty');
    return { isValid: false, errors, warnings };
  }

  try {
    let parsed: any;
    
    if (format === 'json') {
      parsed = JSON.parse(content);
    } else if (format === 'yaml') {
      parsed = YAML.load(content);
    } else if (format === 'toml') {
      parsed = TOML.parse(content);
    }

    // Validate required fields
    if (!parsed.agentId) {
      errors.push('Missing agentId field');
    }

    // Validate model if present
    if (parsed.model || parsed.defaults?.model) {
      const modelRef = parsed.model || parsed.defaults?.model;
      if (typeof modelRef === 'string' && modelRef.trim() === '') {
        errors.push('Model reference is empty');
      }
    }

    // Validate MCP servers if present
    if (parsed.mcpServers) {
      if (!Array.isArray(parsed.mcpServers)) {
        errors.push('MCP servers must be an array');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    errors.push(`Parsing error: ${errorMsg}`);
    return { isValid: false, errors, warnings };
  }
}

/**
 * Merges two config objects with defaults.
 */
export function mergeWithDefaultConfig(config: Partial<AgentFullConfig>, defaults: Record<string, any>): Partial<AgentFullConfig> {
  const result: Partial<AgentFullConfig> = { ...defaults };
  
  // Deep merge for nested objects
  if (config.agentId && defaults.agentId) {
    result.agentId = config.agentId;
  }

  if (config.model && typeof config.model === 'object') {
    const modelDefaults = defaults.model || {};
    result.model = { ...modelDefaults, ...config.model };
  }

  if (config.agents && typeof config.agents === 'object') {
    const agentDefaults = defaults.agents || {};
    result.agents = { ...agentDefaults, ...config.agents };
  }

  return result;
}
