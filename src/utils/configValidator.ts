import { AgentFullConfig, AgentId, LLMProvider, SandboxMode, MemoryBackend } from '../types';
import { parseNativeConfigToSchema } from './configParser';

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

export type IssueSeverity = 'error' | 'warning' | 'info';
export type IssueType = 'syntax_error' | 'schema_mismatch' | 'missing_required' | 'type_error' | 'deprecated' | 'discrepancy';

export interface DeepSchemaIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  path: string;
  message: string;
  line?: number;
  column?: number;
  nativeValue?: any;
  schemaValue?: any;
  suggestedFix?: string;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  issues: DeepSchemaIssue[];
  normalizedConfig?: AgentFullConfig;
  syncStatus: 'in_sync' | 'mismatched' | 'syntax_invalid';
}

const VALID_PROVIDERS: LLMProvider[] = [
  'openai', 'anthropic', 'gemini', 'deepseek', 
  'groq', 'mistral', 'ollama', 'openrouter', 'custom'
];

const VALID_SANDBOX_MODES: SandboxMode[] = ['docker_isolated', 'host_restricted', 'read_only'];
const VALID_MEMORY_BACKENDS: MemoryBackend[] = ['everos', 'sqlite', 'chroma', 'redis', 'markdown'];
const VALID_AGENT_IDS: AgentId[] = ['hermes-agent', 'zeroclaw', 'openclaw', 'picoclaw'];

/**
 * Validates native syntax (YAML, TOML, JSON) line-by-line and returns precise line-level syntax issues.
 */
export function validateNativeSyntax(
  content: string, 
  format: 'yaml' | 'toml' | 'json' = 'yaml'
): DeepSchemaIssue[] {
  const issues: DeepSchemaIssue[] = [];
  if (!content || !content.trim()) {
    issues.push({
      id: 'empty-file',
      type: 'syntax_error',
      severity: 'error',
      path: 'root',
      message: 'Native configuration file is empty.',
      line: 1,
      column: 1
    });
    return issues;
  }

  const lines = content.split('\n');

  if (format === 'json') {
    try {
      JSON.parse(content);
    } catch (err: any) {
      // Extract line and column from standard JSON parse error message if available
      let line = 1;
      let col = 1;
      const match = err.message.match(/position (\d+)/i) || err.message.match(/line (\d+) column (\d+)/i);
      if (match) {
        if (match[2]) {
          line = parseInt(match[1], 10);
          col = parseInt(match[2], 10);
        } else {
          const pos = parseInt(match[1], 10);
          const substr = content.slice(0, pos);
          line = substr.split('\n').length;
          col = substr.length - substr.lastIndexOf('\n');
        }
      }
      issues.push({
        id: `json-syntax-${line}-${col}`,
        type: 'syntax_error',
        severity: 'error',
        path: 'root',
        message: err.message,
        line,
        column: col
      });
    }
    return issues;
  }

  // YAML & TOML Syntax Linting
  let inMultilineString = false;
  let multilineQuoteChar = '';
  const indentStack: number[] = [0];

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const trimmed = lineText.trim();

    // Skip empty lines or full comments
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      return;
    }

    // Check for raw TAB character indentation in YAML
    if (format === 'yaml' && lineText.startsWith('\t')) {
      issues.push({
        id: `tab-indent-${lineNum}`,
        type: 'syntax_error',
        severity: 'error',
        path: `line_${lineNum}`,
        message: 'YAML prohibits Tab indentation. Use 2 or 4 spaces instead.',
        line: lineNum,
        column: 1,
        suggestedFix: 'Replace tab with 2 spaces'
      });
    }

    // Check for unclosed single or double quotes on single line
    if (!inMultilineString) {
      const singleQuotes = (lineText.match(/(?<!\\)'/g) || []).length;
      const doubleQuotes = (lineText.match(/(?<!\\)"/g) || []).length;

      if (singleQuotes % 2 !== 0 && !lineText.includes("'''")) {
        issues.push({
          id: `unclosed-sq-${lineNum}`,
          type: 'syntax_error',
          severity: 'warning',
          path: `line_${lineNum}`,
          message: 'Potentially unclosed single quote string literal.',
          line: lineNum,
          column: lineText.indexOf("'") + 1
        });
      }

      if (doubleQuotes % 2 !== 0 && !lineText.includes('"""')) {
        issues.push({
          id: `unclosed-dq-${lineNum}`,
          type: 'syntax_error',
          severity: 'warning',
          path: `line_${lineNum}`,
          message: 'Potentially unclosed double quote string literal.',
          line: lineNum,
          column: lineText.indexOf('"') + 1
        });
      }
    }

    // TOML Key-Value or Section Check
    if (format === 'toml') {
      if (trimmed.startsWith('[') && !trimmed.endsWith(']')) {
        issues.push({
          id: `toml-section-${lineNum}`,
          type: 'syntax_error',
          severity: 'error',
          path: `line_${lineNum}`,
          message: 'Unclosed TOML section header. Must terminate with "]"',
          line: lineNum,
          column: lineText.length
        });
      } else if (!trimmed.startsWith('[') && !trimmed.includes('=')) {
        issues.push({
          id: `toml-kv-${lineNum}`,
          type: 'syntax_error',
          severity: 'error',
          path: `line_${lineNum}`,
          message: 'TOML property requires key = value syntax.',
          line: lineNum,
          column: 1
        });
      }
    }

    // YAML Colon Check
    if (format === 'yaml') {
      const isListItem = trimmed.startsWith('-');
      const contentPart = isListItem ? trimmed.slice(1).trim() : trimmed;

      if (contentPart && !contentPart.startsWith('#')) {
        // If it looks like a key without colon
        if (!contentPart.includes(':') && !isListItem && !trimmed.startsWith('>') && !trimmed.startsWith('|')) {
          issues.push({
            id: `yaml-colon-${lineNum}`,
            type: 'syntax_error',
            severity: 'warning',
            path: `line_${lineNum}`,
            message: 'Expected key: value mapping in YAML.',
            line: lineNum,
            column: lineText.indexOf(trimmed) + 1
          });
        }
      }
    }
  });

  return issues;
}

/**
 * Performs Deep-Link schema validation between native file content (YAML/TOML)
 * and the structured JSON AgentFullConfig schema.
 */
export function validateDeepLinkSchema(
  agentId: AgentId,
  nativeContent: string,
  schemaConfig: AgentFullConfig,
  format: 'yaml' | 'toml' | 'json' = 'yaml'
): ConfigValidationResult {
  const issues: DeepSchemaIssue[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check Native Syntax
  const syntaxIssues = validateNativeSyntax(nativeContent, format);
  issues.push(...syntaxIssues);

  // 2. Parse Native Content into a Partial Schema
  let parsedFromNative: Partial<AgentFullConfig> = {};
  try {
    parsedFromNative = parseNativeConfigToSchema(agentId, nativeContent, format);
  } catch (err: any) {
    issues.push({
      id: 'parse-fail',
      type: 'syntax_error',
      severity: 'error',
      path: 'root',
      message: `Failed to parse ${format.toUpperCase()} structure: ${err.message}`
    });
  }

  // Helper to find line number of a key in native content
  const findLineForKey = (keyRegex: RegExp): { line?: number; column?: number } => {
    const lines = nativeContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(keyRegex);
      if (match) {
        return { line: i + 1, column: (match.index || 0) + 1 };
      }
    }
    return {};
  };

  // 3. Deep Link Cross-Checking: Model Spec
  if (schemaConfig.model) {
    // Model Provider Check
    if (!VALID_PROVIDERS.includes(schemaConfig.model.provider)) {
      const loc = findLineForKey(/provider\s*[:=]/i);
      issues.push({
        id: 'invalid-provider',
        type: 'type_error',
        severity: 'error',
        path: 'model.provider',
        message: `Invalid provider "${schemaConfig.model.provider}". Must be one of: ${VALID_PROVIDERS.join(', ')}`,
        line: loc.line,
        column: loc.column,
        schemaValue: schemaConfig.model.provider,
        suggestedFix: 'Set to "custom", "ollama", "anthropic", or "openai"'
      });
    }

    // Model Name Check
    if (!schemaConfig.model.model || schemaConfig.model.model.trim() === '') {
      const loc = findLineForKey(/(?:model|model_name|checkpoint|default)\s*[:=]/i);
      issues.push({
        id: 'missing-model-name',
        type: 'missing_required',
        severity: 'error',
        path: 'model.model',
        message: "Model identifier string is required (e.g. 'claude-3-7-sonnet' or 'gemma4-soul:latest')",
        line: loc.line,
        column: loc.column,
        schemaValue: '',
        suggestedFix: "Specify active model name: model: 'gemma4-soul:latest'"
      });
    }

    // Cross Discrepancy: Model in Native vs Schema
    if (parsedFromNative.model?.model && parsedFromNative.model.model !== schemaConfig.model.model) {
      const loc = findLineForKey(/(?:model|model_name|checkpoint|default)\s*[:=]/i);
      issues.push({
        id: 'mismatch-model-name',
        type: 'schema_mismatch',
        severity: 'warning',
        path: 'model.model',
        message: `Native config specifies model "${parsedFromNative.model.model}", but JSON schema has "${schemaConfig.model.model}".`,
        line: loc.line,
        column: loc.column,
        nativeValue: parsedFromNative.model.model,
        schemaValue: schemaConfig.model.model,
        suggestedFix: `Update native file to match schema model: "${schemaConfig.model.model}"`
      });
    }

    // Cross Discrepancy: Provider in Native vs Schema
    if (parsedFromNative.model?.provider && parsedFromNative.model.provider !== schemaConfig.model.provider) {
      const loc = findLineForKey(/provider\s*[:=]/i);
      issues.push({
        id: 'mismatch-provider',
        type: 'schema_mismatch',
        severity: 'warning',
        path: 'model.provider',
        message: `Native config specifies provider "${parsedFromNative.model.provider}", but JSON schema has "${schemaConfig.model.provider}".`,
        line: loc.line,
        column: loc.column,
        nativeValue: parsedFromNative.model.provider,
        schemaValue: schemaConfig.model.provider,
        suggestedFix: `Synchronize provider in native file to "${schemaConfig.model.provider}"`
      });
    }

    // Temperature Range Check
    if (schemaConfig.model.temperature !== undefined) {
      if (typeof schemaConfig.model.temperature !== 'number' || schemaConfig.model.temperature < 0 || schemaConfig.model.temperature > 2.0) {
        const loc = findLineForKey(/temperature\s*[:=]/i);
        issues.push({
          id: 'invalid-temperature',
          type: 'type_error',
          severity: 'warning',
          path: 'model.temperature',
          message: `Temperature ${schemaConfig.model.temperature} is outside recommended bounds [0.0 - 2.0].`,
          line: loc.line,
          column: loc.column,
          schemaValue: schemaConfig.model.temperature,
          suggestedFix: 'Set temperature to 0.7 or 0.3'
        });
      }
    }
  }

  // 4. Deep Link Cross-Checking: Channels & Communication
  if (schemaConfig.channels) {
    if (schemaConfig.channels.telegram?.enabled && !schemaConfig.channels.telegram.botToken) {
      const loc = findLineForKey(/telegram\s*[:=]/i);
      issues.push({
        id: 'missing-telegram-token',
        type: 'missing_required',
        severity: 'warning',
        path: 'channels.telegram.botToken',
        message: 'Telegram is enabled in schema, but bot token is empty. Bot will fail to connect.',
        line: loc.line,
        column: loc.column,
        suggestedFix: 'Add Telegram bot_token or environment secret'
      });
    }

    if (schemaConfig.channels.discord?.enabled && !schemaConfig.channels.discord.botToken) {
      const loc = findLineForKey(/discord\s*[:=]/i);
      issues.push({
        id: 'missing-discord-token',
        type: 'missing_required',
        severity: 'warning',
        path: 'channels.discord.botToken',
        message: 'Discord is enabled in schema, but bot token is empty. Bot will fail to connect.',
        line: loc.line,
        column: loc.column,
        suggestedFix: 'Add Discord bot_token or environment secret'
      });
    }
  }

  // 5. Deep Link Cross-Checking: Security & Sandboxing
  if (schemaConfig.security) {
    if (schemaConfig.security.sandboxMode && !VALID_SANDBOX_MODES.includes(schemaConfig.security.sandboxMode)) {
      const loc = findLineForKey(/sandbox_mode\s*[:=]/i);
      issues.push({
        id: 'invalid-sandbox-mode',
        type: 'type_error',
        severity: 'warning',
        path: 'security.sandboxMode',
        message: `Unrecognized sandbox mode "${schemaConfig.security.sandboxMode}". Valid: ${VALID_SANDBOX_MODES.join(', ')}`,
        line: loc.line,
        column: loc.column,
        suggestedFix: 'Set sandboxMode to "docker_isolated"'
      });
    }
  }

  // 6. Deep Link Cross-Checking: Memory & Storage
  if (schemaConfig.storage) {
    if (schemaConfig.storage.memoryBackend && !VALID_MEMORY_BACKENDS.includes(schemaConfig.storage.memoryBackend)) {
      const loc = findLineForKey(/memory_backend\s*[:=]/i);
      issues.push({
        id: 'invalid-memory-backend',
        type: 'type_error',
        severity: 'warning',
        path: 'storage.memoryBackend',
        message: `Unrecognized memory backend "${schemaConfig.storage.memoryBackend}". Valid: ${VALID_MEMORY_BACKENDS.join(', ')}`,
        line: loc.line,
        column: loc.column,
        suggestedFix: 'Set memoryBackend to "everos" or "sqlite"'
      });
    }
  }

  // Aggregate errors & warnings
  issues.forEach(issue => {
    if (issue.severity === 'error') {
      errors.push(issue.line ? `[Line ${issue.line}] ${issue.message}` : issue.message);
    } else if (issue.severity === 'warning') {
      warnings.push(issue.line ? `[Line ${issue.line}] ${issue.message}` : issue.message);
    }
  });

  const hasSyntaxErrors = issues.some(i => i.type === 'syntax_error');
  const hasMismatches = issues.some(i => i.type === 'schema_mismatch');

  let syncStatus: 'in_sync' | 'mismatched' | 'syntax_invalid' = 'in_sync';
  if (hasSyntaxErrors) syncStatus = 'syntax_invalid';
  else if (hasMismatches) syncStatus = 'mismatched';

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    issues,
    normalizedConfig: errors.length === 0 ? schemaConfig : undefined,
    syncStatus
  };
}

/**
 * Standard schema validation for AgentFullConfig object
 */
export function validateAgentConfig(data: any, expectedAgentId?: AgentId): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const issues: DeepSchemaIssue[] = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      isValid: false,
      errors: ['Configuration payload must be a non-null JSON object.'],
      warnings: [],
      issues: [{
        id: 'null-payload',
        type: 'type_error',
        severity: 'error',
        path: 'root',
        message: 'Configuration payload must be a non-null JSON object.'
      }],
      syncStatus: 'syntax_invalid'
    };
  }

  if (data.agentId && !VALID_AGENT_IDS.includes(data.agentId)) {
    warnings.push(`Unrecognized agent ID "${data.agentId}". Expected one of: ${VALID_AGENT_IDS.join(', ')}.`);
  }

  if (expectedAgentId && data.agentId && data.agentId !== expectedAgentId) {
    warnings.push(`Configuration payload agentId "${data.agentId}" differs from target agent "${expectedAgentId}".`);
  }

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
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    issues,
    normalizedConfig: errors.length === 0 ? (data as AgentFullConfig) : undefined,
    syncStatus: errors.length === 0 ? 'in_sync' : 'syntax_invalid'
  };
}
