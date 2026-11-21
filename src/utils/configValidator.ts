import { AgentFullConfig, AgentId, LLMProvider, SandboxMode, MemoryBackend } from '../types';
import { parseNativeConfigToSchema } from './configParser';
import YAML from 'yaml';
import * as TOML from 'smol-toml';

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
  endLine?: number;
  endColumn?: number;
  nativeValue?: any;
  schemaValue?: any;
  suggestedFix?: string;
  fixType?: 'replace_line' | 'sync_value' | 'remove_tab' | 'insert_key' | 'fix_quote' | 'sync_all';
  replacementText?: string;
}

export interface SyntaxValidationDetail {
  isValid: boolean;
  format: 'yaml' | 'toml' | 'json';
  parserName: string;
  issues: DeepSchemaIssue[];
  primaryError?: string;
  primaryLine?: number;
  primaryColumn?: number;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  issues: DeepSchemaIssue[];
  normalizedConfig?: AgentFullConfig;
  syncStatus: 'in_sync' | 'mismatched' | 'syntax_invalid';
  lineIssuesMap: Record<number, DeepSchemaIssue[]>;
  syntaxDetail?: SyntaxValidationDetail;
}

export const VALID_PROVIDERS: LLMProvider[] = [
  'openai', 'anthropic', 'gemini', 'deepseek',
  'groq', 'mistral', 'ollama', 'openrouter', 'custom'
];

export const VALID_SANDBOX_MODES: SandboxMode[] = ['docker_isolated', 'host_restricted', 'read_only'];
export const VALID_MEMORY_BACKENDS: MemoryBackend[] = ['everos', 'sqlite', 'chroma', 'redis', 'markdown'];
export const VALID_AGENT_IDS: AgentId[] = ['hermes-agent', 'zeroclaw', 'openclaw', 'picoclaw'];

/**
 * Real-time syntax validator for raw native configuration strings.
 * Uses official YAML/TOML parsing engines (YAML v2 & smol-toml) to check
 * syntax before triggering downstream schema cross-validation.
 */
export function validateRawNativeSyntax(
  content: string,
  format: 'yaml' | 'toml' | 'json' = 'yaml'
): SyntaxValidationDetail {
  const issues: DeepSchemaIssue[] = [];
  const lines = content.split('\n');

  if (!content || !content.trim()) {
    issues.push({
      id: 'empty-file',
      type: 'syntax_error',
      severity: 'error',
      path: 'root',
      message: 'Native configuration file is empty. Provide configuration directives or comments.',
      line: 1,
      column: 1
    });
    return {
      isValid: false,
      format,
      parserName: format.toUpperCase(),
      issues,
      primaryError: 'Native configuration file is empty.',
      primaryLine: 1,
      primaryColumn: 1
    };
  }

  // 1. JSON Parser Validation
  if (format === 'json') {
    try {
      JSON.parse(content);
    } catch (err: any) {
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
        path: `line_${line}`,
        message: `JSON Syntax Error: ${err.message}`,
        line,
        column: col,
        suggestedFix: 'Fix syntax error or trailing comma in JSON'
      });
    }
    return {
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      format,
      parserName: 'JSON Engine',
      issues,
      primaryError: issues[0]?.message,
      primaryLine: issues[0]?.line,
      primaryColumn: issues[0]?.column
    };
  }

  // 2. TOML Parser Validation using smol-toml
  if (format === 'toml') {
    let tomlParseFailed = false;
    try {
      TOML.parse(content);
    } catch (err: any) {
      tomlParseFailed = true;
      let lineNum = typeof err.line === 'number' ? err.line : 1;
      let colNum = typeof err.column === 'number' ? err.column : 1;

      if (lineNum === 1 && colNum === 1) {
        const lineMatch = err.message.match(/line\s+(\d+)/i);
        const colMatch = err.message.match(/col(?:umn)?\s+(\d+)/i);
        if (lineMatch) lineNum = parseInt(lineMatch[1], 10);
        if (colMatch) colNum = parseInt(colMatch[1], 10);
      }

      const cleanMessage = err.message
        ? err.message.replace(/\s+at\s+line\s+\d+.*$/i, '').trim()
        : 'TOML syntax error';

      const lineText = lines[lineNum - 1] || '';
      let suggestedFix: string | undefined;
      let fixType: DeepSchemaIssue['fixType'];
      let replacementText: string | undefined;

      if (lineText.trim().startsWith('[') && !lineText.trim().endsWith(']')) {
        suggestedFix = 'Add closing bracket "]" to table header';
        fixType = 'replace_line';
        replacementText = `${lineText}]`;
      } else if (!lineText.includes('=') && lineText.trim() && !lineText.trim().startsWith('#') && !lineText.trim().startsWith('[')) {
        suggestedFix = 'Use key = value syntax for TOML attributes';
      }

      issues.push({
        id: `toml-parser-err-${lineNum}-${colNum}`,
        type: 'syntax_error',
        severity: 'error',
        path: `line_${lineNum}`,
        message: `TOML Parser Error: ${cleanMessage}`,
        line: lineNum,
        column: colNum,
        suggestedFix,
        fixType,
        replacementText
      });
    }
    return {
      isValid: !tomlParseFailed,
      format,
      parserName: 'smol-toml',
      issues,
      primaryError: issues[0]?.message,
      primaryLine: issues[0]?.line,
      primaryColumn: issues[0]?.column
    };
  }

  // 3. YAML Parser Validation using yaml v2
  if (format === 'yaml') {
    for (let idx = 0; idx < lines.length; idx++) {
      if (lines[idx].includes('\t')) {
        issues.push({
          id: `yaml-tab-${idx + 1}`,
          type: 'syntax_error',
          severity: 'error',
          path: `line_${idx + 1}`,
          message: 'YAML files cannot contain tab characters for indentation; use spaces instead.',
          line: idx + 1,
          column: lines[idx].indexOf('\t') + 1,
          suggestedFix: 'Replace tabs with 2 spaces',
          fixType: 'remove_tab',
          replacementText: lines[idx].replace(/\t/g, '  ')
        });
      }
    }

    try {
      const parsed = YAML.parse(content);
      if (!parsed || typeof parsed !== 'object') {
        issues.push({
          id: 'invalid-yaml',
          type: 'schema_mismatch',
          severity: 'error',
          path: 'root',
          message: 'Invalid YAML format or empty object root',
          line: 1,
          column: 1
        });
      }
    } catch (err: any) {
      let line = 1;
      let col = 1;
      if (Array.isArray(err.linePos) && err.linePos[0]) {
        line = err.linePos[0].line || 1;
        col = err.linePos[0].col || 1;
      }
      issues.push({
        id: `yaml-parse-${line}-${col}`,
        type: 'syntax_error',
        severity: 'error',
        path: `line_${line}`,
        message: `YAML Parse Error: ${err.message}`,
        line,
        column: col
      });
    }
    return {
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      format,
      parserName: 'yaml',
      issues,
      primaryError: issues[0]?.message,
      primaryLine: issues[0]?.line,
      primaryColumn: issues[0]?.column
    };
  }

  return {
    isValid: true,
    format,
    parserName: 'unknown',
    issues: [],
    primaryError: undefined,
    primaryLine: undefined,
    primaryColumn: undefined
  };
}

/**
 * Validates a parsed configuration object against schema rules.
 */
export function validateParsedConfig(
  config: Partial<AgentFullConfig> | any,
  agentId?: AgentId
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config || typeof config !== 'object') {
    return { isValid: false, errors: ['Configuration must be a valid object'], warnings };
  }

  const effectiveAgentId = config.agentId || agentId;
  if (!effectiveAgentId) {
    errors.push('Missing agentId field');
  } else if (!VALID_AGENT_IDS.includes(effectiveAgentId as AgentId)) {
    errors.push(`Invalid agentId: ${effectiveAgentId}. Valid values: ${VALID_AGENT_IDS.join(', ')}`);
  }

  const modelObj = config.model;
  if (modelObj) {
    if (typeof modelObj === 'string' && modelObj.trim() === '') {
      errors.push('Model reference is empty');
    } else if (typeof modelObj === 'object') {
      if (!modelObj.model || String(modelObj.model).trim() === '') {
        warnings.push('Model identifier is not specified; default will be used.');
      }
      if (modelObj.provider && !VALID_PROVIDERS.includes(modelObj.provider)) {
        warnings.push(`Non-standard provider '${modelObj.provider}' specified.`);
      }
    }
  } else if (config.agents?.defaults?.model) {
    // OpenClaw v2 format
    if (!config.agents.defaults.model.primary) {
      warnings.push('OpenClaw v2 primary model is empty.');
    }
  } else {
    errors.push('Missing model configuration block');
  }

  if (config.mcpServers !== undefined && !Array.isArray(config.mcpServers)) {
    errors.push('MCP servers must be an array');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validates a complete configuration object.
 */
export function validateConfig(
  config: Partial<AgentFullConfig> | any,
  agentId: AgentId = 'hermes-agent'
): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const issues: DeepSchemaIssue[] = [];

  if (!config || typeof config !== 'object') {
    return {
      isValid: false,
      errors: ['Configuration object is null or invalid'],
      warnings,
      issues: [],
      normalizedConfig: undefined,
      syncStatus: 'syntax_invalid',
      lineIssuesMap: {}
    };
  }

  const syntaxDetail = validateRawNativeSyntax(JSON.stringify(config), 'json');
  if (!syntaxDetail.isValid) {
    errors.push(syntaxDetail.primaryError || 'Invalid configuration');
    return {
      isValid: false,
      errors,
      warnings,
      issues: syntaxDetail.issues,
      normalizedConfig: undefined,
      syncStatus: 'syntax_invalid',
      lineIssuesMap: {},
      syntaxDetail
    };
  }

  const parsedValidation = validateParsedConfig(config, agentId);
  warnings.push(...parsedValidation.warnings);

  if (!parsedValidation.isValid) {
    errors.push(...parsedValidation.errors);
    return {
      isValid: false,
      errors,
      warnings,
      issues: [],
      normalizedConfig: undefined,
      syncStatus: 'syntax_invalid',
      lineIssuesMap: {},
      syntaxDetail: undefined
    };
  }

  const sandboxMode = config.security?.sandboxMode;
  if (sandboxMode && !VALID_SANDBOX_MODES.includes(sandboxMode)) {
    errors.push(`Invalid sandboxMode: ${sandboxMode}`);
  }

  const memoryBackend = config.storage?.memoryBackend;
  if (memoryBackend && !VALID_MEMORY_BACKENDS.includes(memoryBackend)) {
    errors.push(`Invalid memoryBackend: ${memoryBackend}`);
  }

  const normalizedConfig: AgentFullConfig = {
    ...(config as AgentFullConfig),
    agentId: (config.agentId || agentId) as AgentId,
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    issues,
    normalizedConfig,
    syncStatus: 'in_sync',
    lineIssuesMap: {},
    syntaxDetail: undefined
  };
}

export function validateAgentConfig(
  config: Partial<AgentFullConfig> | any,
  agentId: AgentId = 'hermes-agent'
): ConfigValidationResult {
  return validateConfig(config, agentId);
}

/**
 * Validates native YAML/TOML/JSON content against the visual AgentFullConfig schema
 * and produces line-by-line diagnostic annotations for InlineDiagnosticsEditor.
 */
export function validateDeepLinkSchema(
  nativeContent: string,
  schemaConfig: AgentFullConfig,
  format: 'yaml' | 'toml' | 'json' = 'yaml',
  agentId: AgentId = schemaConfig.agentId || 'hermes-agent'
): {
  issues: DeepSchemaIssue[];
  lineIssuesMap: Record<number, DeepSchemaIssue[]>;
  syntaxDetail: SyntaxValidationDetail;
} {
  const syntaxDetail = validateRawNativeSyntax(nativeContent, format);
  const issues: DeepSchemaIssue[] = [...syntaxDetail.issues];
  const lineIssuesMap: Record<number, DeepSchemaIssue[]> = {};

  const attachIssue = (issue: DeepSchemaIssue) => {
    issues.push(issue);
    if (issue.line) {
      if (!lineIssuesMap[issue.line]) lineIssuesMap[issue.line] = [];
      lineIssuesMap[issue.line].push(issue);
    }
  };

  for (const sIssue of syntaxDetail.issues) {
    if (sIssue.line) {
      if (!lineIssuesMap[sIssue.line]) lineIssuesMap[sIssue.line] = [];
      lineIssuesMap[sIssue.line].push(sIssue);
    }
  }

  if (!syntaxDetail.isValid) {
    return { issues, lineIssuesMap, syntaxDetail };
  }

  const parsed = parseNativeConfigToSchema(agentId, nativeContent, format);
  const lines = nativeContent.split('\n');

  const findLineForKey = (keyPattern: RegExp): number => {
    const idx = lines.findIndex(l => keyPattern.test(l));
    return idx >= 0 ? idx + 1 : 1;
  };

  if (parsed.model?.provider && schemaConfig.model?.provider && parsed.model.provider !== schemaConfig.model.provider) {
    const lineNum = findLineForKey(/^\s*provider\s*[:=]/);
    const originalLine = lines[lineNum - 1] || '';
    const replacementText = format === 'toml'
      ? originalLine.replace(/=\s*["']?[^"'\s]+["']?/, `= "${schemaConfig.model.provider}"`)
      : format === 'yaml'
      ? originalLine.replace(/:\s*["']?[^"'\s]+["']?/, `: ${schemaConfig.model.provider}`)
      : undefined;

    attachIssue({
      id: `mismatch-provider-${lineNum}`,
      type: 'schema_mismatch',
      severity: 'warning',
      path: 'model.provider',
      message: `Native file provider '${parsed.model.provider}' differs from UI schema '${schemaConfig.model.provider}'.`,
      line: lineNum,
      column: 1,
      nativeValue: parsed.model.provider,
      schemaValue: schemaConfig.model.provider,
      suggestedFix: `Sync provider to '${schemaConfig.model.provider}'`,
      fixType: 'sync_value',
      replacementText
    });
  }

  if (parsed.model?.model && schemaConfig.model?.model && parsed.model.model !== schemaConfig.model.model) {
    const lineNum = findLineForKey(/^\s*(model|default|primary)\s*[:=]/);
    const originalLine = lines[lineNum - 1] || '';
    const replacementText = format === 'toml'
      ? originalLine.replace(/=\s*["']?[^"'\n]+["']?/, `= "${schemaConfig.model.model}"`)
      : format === 'yaml'
      ? originalLine.replace(/:\s*["']?[^"'\n]+["']?/, `: "${schemaConfig.model.model}"`)
      : undefined;

    attachIssue({
      id: `mismatch-model-${lineNum}`,
      type: 'schema_mismatch',
      severity: 'warning',
      path: 'model.model',
      message: `Native file model '${parsed.model.model}' differs from UI schema '${schemaConfig.model.model}'.`,
      line: lineNum,
      column: 1,
      nativeValue: parsed.model.model,
      schemaValue: schemaConfig.model.model,
      suggestedFix: `Sync model to '${schemaConfig.model.model}'`,
      fixType: 'sync_value',
      replacementText
    });
  }

  if (nativeContent.includes('11434host:11434') || nativeContent.includes('moa://local')) {
    const lineNum = findLineForKey(/11434host:11434|moa:\/\/local/);
    const originalLine = lines[lineNum - 1] || '';
    attachIssue({
      id: `corrupted-endpoint-${lineNum}`,
      type: 'discrepancy',
      severity: 'error',
      path: 'model.baseUrl',
      message: 'Corrupted or legacy endpoint URI detected (11434host:11434 or moa://local).',
      line: lineNum,
      column: 1,
      suggestedFix: 'Normalize endpoint URL to http://192.168.1.49:11434',
      fixType: 'replace_line',
      replacementText: originalLine
        .replace(/11434host:11434/g, '11434')
        .replace(/moa:\/\/local\/?/g, 'http://192.168.1.49:11434')
    });
  }

  return { issues, lineIssuesMap, syntaxDetail };
}

export function applySingleFix(
  content: string,
  issue: DeepSchemaIssue,
  _schemaConfig?: AgentFullConfig,
  _format?: 'yaml' | 'toml' | 'json'
): string {
  const lines = content.split('\n');
  if (issue.line && issue.line >= 1 && issue.line <= lines.length && issue.replacementText !== undefined) {
    lines[issue.line - 1] = issue.replacementText;
    return lines.join('\n');
  }
  if (issue.fixType === 'remove_tab') {
    return content.replace(/\t/g, '  ');
  }
  return content;
}

export function validateFallbackConfiguration(config: AgentFullConfig): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fb = config.fallback;

  if (!fb || !fb.enabled) {
    return { isValid: true, warnings, errors };
  }

  const fbProv = fb.provider || fb.fallbackProvider;
  const fbModel = fb.model || fb.fallbackModel;

  if (!fbProv) {
    errors.push('Failover is enabled but no fallback provider is selected.');
  }
  if (!fbModel) {
    errors.push('Failover is enabled but no fallback model is specified.');
  }
  if (
    fbProv &&
    !['ollama', 'custom'].includes(String(fbProv)) &&
    !fb.apiKey &&
    !fb.useProxy
  ) {
    warnings.push(`Cloud fallback provider '${fbProv}' has no inline API key configured (relying on server proxy/env).`);
  }

  return { isValid: errors.length === 0, warnings, errors };
}
