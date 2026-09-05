import { AgentFullConfig, AgentId, LLMProvider, SandboxMode, MemoryBackend } from '../types';

export class SchemaValidationError extends Error {
  public schemaErrors: string[];
  public agentId?: AgentId;

  constructor(message: string, schemaErrors: string[], agentId?: AgentId) {
    super(message);
    this.name = 'SchemaValidationError';
    this.schemaErrors = schemaErrors;
    this.agentId = agentId;
  }
}

export class NetworkTransportError extends Error {
  public statusCode?: number;
  public endpoint?: string;
  public agentId?: AgentId;

  constructor(message: string, statusCode?: number, endpoint?: string, agentId?: AgentId) {
    super(message);
    this.name = 'NetworkTransportError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.agentId = agentId;
  }
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedConfig?: AgentFullConfig;
}

const VALID_PROVIDERS: LLMProvider[] = [
  'openai', 'anthropic', 'gemini', 'deepseek', 
  'groq', 'mistral', 'ollama', 'openrouter', 'custom'
];

const VALID_SANDBOX_MODES: SandboxMode[] = ['docker_isolated', 'host_restricted', 'read_only'];
const VALID_MEMORY_BACKENDS: MemoryBackend[] = ['everos', 'sqlite', 'chroma', 'redis', 'markdown'];
const VALID_AGENT_IDS: AgentId[] = ['hermes-agent', 'zeroclaw', 'openclaw', 'picoclaw'];

/**
 * Validates a configuration object against the AgentFullConfig schema.
 * Differentiates structural schema errors from runtime transport errors.
 */
export function validateAgentConfig(data: any, expectedAgentId?: AgentId): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      isValid: false,
      errors: ['Configuration payload must be a non-null JSON object.'],
      warnings: []
    };
  }

  // 1. Validate agentId
  if (data.agentId && !VALID_AGENT_IDS.includes(data.agentId)) {
    warnings.push(`Unrecognized agent ID "${data.agentId}". Expected one of: ${VALID_AGENT_IDS.join(', ')}.`);
  }

  if (expectedAgentId && data.agentId && data.agentId !== expectedAgentId) {
    warnings.push(`Configuration payload agentId "${data.agentId}" differs from target agent "${expectedAgentId}".`);
  }

  // 2. Validate model section
  if (!data.model || typeof data.model !== 'object') {
    errors.push("Missing or invalid 'model' configuration object.");
  } else {
    if (!data.model.model || typeof data.model.model !== 'string') {
      errors.push("Model section missing required 'model' string identifier.");
    }
    if (!data.model.provider || !VALID_PROVIDERS.includes(data.model.provider)) {
      errors.push(
        `Invalid or missing 'model.provider' ("${data.model?.provider}"). Expected one of: ${VALID_PROVIDERS.join(', ')}.`
      );
    }
    if (data.model.temperature !== undefined && (typeof data.model.temperature !== 'number' || data.model.temperature < 0 || data.model.temperature > 2.0)) {
      warnings.push("'model.temperature' should be a numeric value between 0.0 and 2.0.");
    }
  }

  // 3. Validate channels section
  if (!data.channels || typeof data.channels !== 'object') {
    errors.push("Missing or invalid 'channels' configuration object.");
  } else {
    const channelKeys = ['telegram', 'discord', 'slack', 'whatsapp', 'matrix', 'webhook'];
    for (const key of channelKeys) {
      if (data.channels[key] && typeof data.channels[key] !== 'object') {
        warnings.push(`Channel '${key}' configuration should be an object.`);
      }
    }
  }

  // 4. Validate system section
  if (!data.system || typeof data.system !== 'object') {
    errors.push("Missing or invalid 'system' configuration object.");
  } else {
    if (typeof data.system.systemPrompt !== 'string') {
      errors.push("System section missing valid 'systemPrompt' string.");
    }
  }

  // 5. Validate security section
  if (!data.security || typeof data.security !== 'object') {
    errors.push("Missing or invalid 'security' configuration object.");
  } else {
    if (data.security.sandboxMode && !VALID_SANDBOX_MODES.includes(data.security.sandboxMode)) {
      warnings.push(
        `Unrecognized security sandboxMode "${data.security.sandboxMode}". Valid modes: ${VALID_SANDBOX_MODES.join(', ')}.`
      );
    }
  }

  // 6. Validate storage section
  if (!data.storage || typeof data.storage !== 'object') {
    errors.push("Missing or invalid 'storage' configuration object.");
  } else {
    if (data.storage.memoryBackend && !VALID_MEMORY_BACKENDS.includes(data.storage.memoryBackend)) {
      warnings.push(
        `Unrecognized memoryBackend "${data.storage.memoryBackend}". Valid backends: ${VALID_MEMORY_BACKENDS.join(', ')}.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    normalizedConfig: errors.length === 0 ? (data as AgentFullConfig) : undefined
  };
}
