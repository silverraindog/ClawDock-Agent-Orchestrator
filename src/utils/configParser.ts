import * as YAML from 'js-yaml';
import * as TOML from 'smol-toml';
import { AgentFullConfig, AgentId, ChannelConfig, FallbackConfig, LLMProvider, ModelConfig, MoAConfig } from '../types';

export type { AgentFullConfig, AgentId, ChannelConfig, FallbackConfig, LLMProvider, ModelConfig, MoAConfig };

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
      lowerUrl.includes(':5000')
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
      lowerModel.includes('llama3') ||
      lowerModel.includes('coder') ||
      lowerModel.includes('sonnet')
    ) {
      return true;
    }
  }
  return false;
}

export function detectOpenClawConfigFormat(contentOrObj: string | any, agentVersion?: string): 'v1' | 'v2' {
  if (agentVersion) {
    const cleanVer = agentVersion.replace(/^v/, '').trim();
    if (cleanVer.startsWith('2.') || cleanVer.startsWith('3.')) return 'v2';
  }

  let obj: any = contentOrObj;
  if (typeof contentOrObj === 'string') {
    try {
      obj = JSON.parse(contentOrObj);
    } catch {
      try {
        obj = YAML.load(contentOrObj);
      } catch {}
    }
  }

  if (obj && typeof obj === 'object') {
    if (
      obj.gateway ||
      obj.agents?.ownership ||
      obj.models?.providers ||
      String(obj.version || '').startsWith('2.') ||
      String(obj.version || '').startsWith('3.')
    ) {
      return 'v2';
    }
  }

  return 'v1';
}

function sanitizeStringPrimitive(inputStr: string): string {
  if (!inputStr) return inputStr;

  // Handle "11434host:11434" -> "11434", "http://localhost:11434host:11434" -> "http://localhost:11434"
  let cleaned = inputStr.replace(/11434host:11434/g, '11434');
  // Handle remaining ":11434host:<digits>" or standalone "host:11434" (not "localhost:11434")
  cleaned = cleaned.replace(/:11434host:\d+/g, ':11434');
  cleaned = cleaned.replace(/(^|[^a-zA-Z0-9])host:11434/g, '$111434');

  return cleaned;
}

function sanitizeValueRecursive(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return sanitizeStringPrimitive(value);
  }
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValueRecursive(item));
  }
  if (typeof value === 'object') {
    const cloned: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      cloned[k] = sanitizeValueRecursive(v);
    }
    return cloned;
  }
  return value;
}

export function sanitizeConfigString(input: string): string;
export function sanitizeConfigString<T>(input: T): T;
export function sanitizeConfigString(input: any): any {
  if (input === null || input === undefined) return input;

  if (typeof input !== 'string') {
    return sanitizeValueRecursive(input);
  }

  const trimmed = input.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      const obj = JSON.parse(input);
      const sanitizedObj = sanitizeValueRecursive(obj);
      return JSON.stringify(sanitizedObj);
    } catch {
      // Fall back to string sanitization
    }
  }

  return sanitizeStringPrimitive(input);
}

export function parseSimpleJSON(content: string): any {
  try {
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

export function parseSimpleTOML(content: string): any {
  try {
    return TOML.parse(content);
  } catch {
    const lines = content.split('\n');
    const result: any = {};
    let currentTable: string | undefined;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;
      if (/^\[([^\]]+)\]$/.test(line)) {
        currentTable = line.replace(/^\[([^\]]+)\]$/, '$1').trim();
        result[currentTable] = result[currentTable] || {};
      } else {
        const idx = line.indexOf('=');
        if (idx >= 0) {
          const key = line.substring(0, idx).trim();
          let rawValue: any = line.substring(idx + 1).trim();
          if (
            (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
            (rawValue.startsWith("'") && rawValue.endsWith("'"))
          ) {
            rawValue = rawValue.slice(1, -1);
          } else if (rawValue === 'true') {
            rawValue = true;
          } else if (rawValue === 'false') {
            rawValue = false;
          } else if (!isNaN(Number(rawValue)) && rawValue !== '') {
            rawValue = Number(rawValue);
          }
          if (currentTable) {
            result[currentTable][key] = rawValue;
          } else {
            result[key] = rawValue;
          }
        }
      }
    }
    return result;
  }
}

export function parseSimpleYAML(content: string): any {
  try {
    const loaded = YAML.load(content);
    if (loaded && typeof loaded === 'object') {
      return loaded;
    }
  } catch {
    // Fallback to simple line-by-line parser
  }
  const lines = content.split('\n');
  const result: any = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#') || line.startsWith('---')) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) continue;
    const key = line.substring(0, colonIdx).trim();
    let rawValue: any = line.substring(colonIdx + 1).trim();
    if (
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
    ) {
      rawValue = rawValue.slice(1, -1);
    } else if (rawValue === 'true') {
      rawValue = true;
    } else if (rawValue === 'false') {
      rawValue = false;
    } else if (!isNaN(Number(rawValue)) && rawValue !== '') {
      rawValue = Number(rawValue);
    }
    result[key] = rawValue;
  }
  return result;
}

function normalizeParsedSchema(raw: any, agentId: string): Partial<AgentFullConfig> & Record<string, any> {
  if (!raw || typeof raw !== 'object') {
    return { agentId: agentId as AgentId };
  }

  const normalized: Record<string, any> = { ...raw };

  // System normalization
  if (raw.system && typeof raw.system === 'object') {
    normalized.system = {
      ...raw.system,
      agentName: raw.system.agentName || raw.system.agent_name || raw.agent_name || raw.name,
      systemPrompt: raw.system.systemPrompt || raw.system.system_prompt || raw.system_prompt,
    };
  } else if (raw.agent_name || raw.agentName || raw.agent?.name) {
    normalized.system = {
      agentName: raw.agent_name || raw.agentName || raw.agent?.name,
      systemPrompt: raw.system_prompt || '',
    };
  }

  // Model normalization
  const rawModel = raw.model;
  if (rawModel && typeof rawModel === 'object') {
    normalized.model = {
      ...rawModel,
      model: rawModel.model || rawModel.default || rawModel.name || '',
      provider: rawModel.provider || raw.provider || '',
      baseUrl: rawModel.baseUrl || rawModel.base_url || undefined,
      apiKey: rawModel.apiKey ?? rawModel.api_key ?? undefined,
      temperature: rawModel.temperature !== undefined ? Number(rawModel.temperature) : undefined,
      maxTokens: rawModel.maxTokens ?? rawModel.max_tokens,
      contextWindow: rawModel.contextWindow ?? rawModel.context_window ?? rawModel.context_length,
      topP: rawModel.topP ?? rawModel.top_p,
      reasoningEffort: rawModel.reasoningEffort ?? rawModel.reasoning_effort,
    };
  } else if (typeof rawModel === 'string' || raw.provider) {
    normalized.model = {
      model: typeof rawModel === 'string' ? rawModel : '',
      provider: raw.provider || '',
      baseUrl: raw.baseUrl || raw.base_url || undefined,
      temperature: raw.temperature !== undefined ? Number(raw.temperature) : undefined,
      maxTokens: raw.maxTokens ?? raw.max_tokens,
      contextWindow: raw.contextWindow ?? raw.context_window ?? raw.context_length,
    };
  }

  // OpenClaw v2 schema support (agents.defaults.model)
  if (raw.agents?.defaults?.model && !normalized.model?.model) {
    const primary = raw.agents.defaults.model.primary || '';
    const slashIdx = primary.indexOf('/');
    const prov = slashIdx > 0 ? primary.slice(0, slashIdx) : 'custom';
    const mod = slashIdx > 0 ? primary.slice(slashIdx + 1) : primary;
    normalized.model = {
      ...(normalized.model || {}),
      provider: prov,
      model: mod,
    };
  }

  return normalized;
}

export function parseNativeConfigToSchema(
  agentId: string,
  content: string,
  format: 'json' | 'yaml' | 'toml'
): Partial<AgentFullConfig> & Record<string, any> {
  let result: any;

  if (format === 'json') {
    result = parseSimpleJSON(content);
  } else if (format === 'yaml') {
    result = parseSimpleYAML(content);
  } else if (format === 'toml') {
    result = parseSimpleTOML(content);
  }

  return normalizeParsedSchema(result, agentId);
}

export function enhanceConfigWithNative(
  baseConfig: Partial<AgentFullConfig>,
  nativeContent: string,
  format: 'yaml' | 'toml' | 'json' = 'yaml',
  agentId: string = 'hermes-agent',
  _openclawFormatVersion?: 'v1' | 'v2'
): any {
  const enhanced: any = JSON.parse(JSON.stringify(baseConfig || {}));
  const parsedNative = parseNativeConfigToSchema(agentId, nativeContent, format);

  const newModel: Record<string, any> = {};
  if (parsedNative?.model) {
    for (const [k, v] of Object.entries(parsedNative.model)) {
      if (v !== undefined && v !== '') {
        newModel[k] = v;
      }
    }
  }

  // Handle combined "provider:model" shorthand if provider wasn't explicitly set
  if (
    typeof newModel.model === 'string' &&
    !newModel.provider &&
    newModel.model.includes(':') &&
    !newModel.model.endsWith(':latest') &&
    !newModel.model.endsWith(':16b') &&
    !newModel.model.endsWith(':7b') &&
    !newModel.model.endsWith(':8b')
  ) {
    const idx = newModel.model.indexOf(':');
    const prefix = newModel.model.slice(0, idx);
    if (['openai', 'anthropic', 'gemini', 'deepseek', 'groq', 'mistral', 'ollama', 'openrouter', 'custom'].includes(prefix)) {
      newModel.provider = prefix;
      newModel.model = newModel.model.slice(idx + 1);
    }
  }

  enhanced.model = {
    ...(baseConfig.model || {}),
    ...newModel,
  };

  if (parsedNative?.system) {
    enhanced.system = {
      ...(baseConfig.system || {}),
      ...Object.fromEntries(Object.entries(parsedNative.system).filter(([, v]) => v !== undefined && v !== '')),
    };
  }

  return enhanced;
}

export function generateHermesYaml(cfg: Partial<AgentFullConfig> | any): string {
  const m = cfg?.model || {};
  const sys = cfg?.system || {};
  const moa = cfg?.moa || {};
  const sec = cfg?.security || {};
  const sto = cfg?.storage || {};
  const env = cfg?.customEnv || {};
  const fb = cfg?.fallback || {};

  const rawModel = m.default || m.model || 'gemma4-soul:latest';
  const model = rawModel === 'default' || rawModel === 'latest' ? 'gemma4-soul:latest' : rawModel;
  const rawProvider = m.provider || 'custom';
  const isOllamaLocal =
    rawProvider === 'ollama' ||
    (rawProvider === 'custom' && (m.baseUrl?.includes('192.168.1.49') || m.baseUrl === 'http://192.168.1.49:11434'));
  const finalProvider = isOllamaLocal ? 'custom' : rawProvider;
  const finalApiKey = isOllamaLocal ? (m.apiKey || 'ollama') : (m.apiKey || '');
  const finalBaseUrl = m.baseUrl || (isOllamaLocal ? 'http://192.168.1.49:11434' : '');
  const finalBaseUrlV1 = finalBaseUrl
    ? (finalBaseUrl.endsWith('/v1') ? finalBaseUrl : `${finalBaseUrl}/v1`)
    : '';

  const proposers: string[] = Array.isArray(moa.proposerModels) && moa.proposerModels.length > 0
    ? moa.proposerModels
    : ['gemma4-soul:latest', 'deepseek-coder-v2:16b', 'qwen2-5-coder-7b-32k:latest'];

  const refModelsYaml = proposers
    .map(p => `      - provider: ${finalProvider}\n        model: ${p}\n        enabled: true`)
    .join('\n');

  const aggModel = moa.aggregatorModel || model;
  const fbProvider = fb.provider || fb.fallbackProvider || 'openrouter';
  const fbModel = fb.model || fb.fallbackModel || 'anthropic/claude-3.7-sonnet';
  const fbBaseUrl = fb.baseUrl || 'https://openrouter.ai/api/v1';

  const envLines = Object.entries(env)
    .map(([k, v]) => `  ${k}: "${String(v).replace(/"/g, '\\"')}"`)
    .join('\n');

  return `version: "${cfg?.version || '1.0.0'}"
agent_id: "${cfg?.agentId || 'hermes-agent'}"
agent_name: "${sys.agentName || 'Hermes Code Assistant'}"
persona: "${sys.personaName || 'Hermes Prime'}"
system_preset: "${sys.preset || 'engineer'}"
system_prompt: "${String(sys.systemPrompt || '').replace(/"/g, '\\"')}"

model:
  provider: ${finalProvider}
  model: "${model}"
  default: "${model}"
  apiKey: "${String(finalApiKey).replace(/"/g, '\\"')}"
  temperature: ${m.temperature ?? 0.3}
  reasoningEffort: "${m.reasoningEffort || 'high'}"
  maxTokens: ${m.maxTokens ?? 8192}
  contextWindow: ${m.contextWindow ?? 200000}
  baseUrl: "${finalBaseUrl}"
  base_url: "${finalBaseUrlV1}"
  topP: ${m.topP ?? 0.95}

fallback:
  enabled: ${fb.enabled ?? true}
  strategy: "${fb.strategy || 'on_offline'}"
  target_agent_id: "${fb.targetAgentId || 'zeroclaw'}"
  latency_threshold_ms: ${fb.latencyThresholdMs ?? 3000}
  provider: "${fbProvider}"
  model: "${fbModel}"
  base_url: "${fbBaseUrl}"
  use_proxy: ${fb.useProxy !== false}

security:
  sandbox_mode: "${sec.sandboxMode || 'docker_isolated'}"
  max_execution_time_sec: ${sec.maxExecutionTimeSec ?? 120}
  block_network_access: ${sec.blockNetworkAccess ?? false}
  require_approval_for_commands: ${sec.requireApprovalForCommands ?? false}

storage:
  memory_backend: "${sto.memoryBackend || 'everos'}"
  db_path: "${sto.dbPath || '/data/everos/memories'}"
  auto_summarize_interval: ${sto.autoSummarizeInterval ?? 25}
  max_history_turns: ${sto.maxHistoryTurns ?? 100}
  vector_db_url: "${sto.vectorDbUrl || 'http://everos:8080'}"

moa:
  enabled: ${moa.enabled ?? true}
  rounds: ${moa.rounds ?? 2}
  temperature_spread: ${moa.temperatureSpread ?? 0.3}
  consensus_threshold: ${moa.consensusThreshold ?? 0.85}
  aggregator:
    provider: ${finalProvider}
    model: "${aggModel}"
  reference_models:
${refModelsYaml}

env:
${envLines || '  HERMES_LOG_LEVEL: "INFO"'}
`;
}

export function generateZeroClawToml(cfg: Partial<AgentFullConfig> | any): string {
  const m = cfg?.model || {};
  const sys = cfg?.system || {};
  const sec = cfg?.security || {};
  const sto = cfg?.storage || {};
  const env = cfg?.customEnv || {};
  const ch = cfg?.channels || {};

  const model = m.model || 'deepseek-r1';
  const provider = m.provider || 'deepseek';
  const apiKey = m.apiKey || '';
  const baseUrl = m.baseUrl || '';
  const temperature = m.temperature ?? 0.2;
  const maxTokens = m.maxTokens ?? 4096;
  const contextWindow = m.contextWindow ?? 64000;

  let tomlStr = `[agent]
id = "${cfg?.agentId || 'zeroclaw'}"
version = "${cfg?.version || '1.0.0'}"
name = "${sys.agentName || 'ZeroClaw Edge'}"
persona = "${sys.personaName || 'Zero'}"

[daemon]
port = ${cfg?.port || 8081}
rust_log = "${env.RUST_LOG || 'info'}"
max_ram_mb = ${env.ZEROCLAW_MAX_RAM_MB || 16}
unix_socket = "/var/run/zeroclaw.sock"

[model]
provider = "${provider}"
model = "${model}"
temperature = ${temperature}
max_tokens = ${maxTokens}
context_window = ${contextWindow}
`;

  if (apiKey) {
    tomlStr += `api_key = "${apiKey}"\n`;
  }
  if (baseUrl) {
    tomlStr += `base_url = "${baseUrl}"\n`;
  }

  tomlStr += `
[system]
preset = "${sys.preset || 'edge_assistant'}"
system_prompt = ${JSON.stringify(sys.systemPrompt || 'You are ZeroClaw, an ultra-fast, minimal AI assistant running natively in Rust.')}

[channels.telegram]
enabled = ${ch.telegram?.enabled ?? true}
bot_token = "${ch.telegram?.botToken || 'env:ZEROCLAW_TELEGRAM_TOKEN'}"
allowed_users = ${JSON.stringify(ch.telegram?.allowedUsers || ['@edge_admin'])}
mode = "${ch.telegram?.mode || 'polling'}"

[channels.webhook]
enabled = ${ch.webhook?.enabled ?? true}
port = ${ch.webhook?.port ?? 8081}
auth_token = "${ch.webhook?.authToken || 'zeroclaw_auth_key'}"

[security]
sandbox_mode = "${sec.sandboxMode || 'docker_isolated'}"
allowed_directories = ${JSON.stringify(sec.allowedDirectories || ['/var/zeroclaw/workspace'])}
max_execution_time_sec = ${sec.maxExecutionTimeSec ?? 60}
require_approval_for_commands = ${sec.requireApprovalForCommands ?? true}

[storage]
memory_backend = "${sto.memoryBackend || 'everos'}"
db_path = "${sto.dbPath || '/data/everos/memories/zeroclaw'}"
auto_summarize_interval = ${sto.autoSummarizeInterval ?? 50}
max_history_turns = ${sto.maxHistoryTurns ?? 40}
vector_db_url = "${sto.vectorDbUrl || 'http://everos:8080'}"
`;

  return tomlStr;
}
