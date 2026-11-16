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
 * Uses official YAML/TOML parsing engines (YAML v2 AST & smol-toml) to check
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

      // Extract coordinates if not present directly on error object
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

  // 3. YAML Parser Validation using yaml.js
  if (format === 'yaml') {
    try {
      const parsed = YAML.load(content);
      
      // Basic validation - check for required fields
      if (!parsed || typeof parsed !== 'object') {
        issues.push({
          id: 'invalid-yaml',
          type: 'schema_mismatch',
          severity: 'error',
          path: 'root',
          message: 'Invalid YAML format or empty content'
        });
      }
    } catch (err: any) {
      issues.push({
        id: `yaml-parse-${err.message}`,
        type: 'syntax_error',
        severity: 'error',
        path: 'root',
        message: `YAML Parse Error: ${err.message}`
      });
    }
    return {
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      format,
      parserName: 'yaml.js',
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
  config: Partial<AgentFullConfig>,
  agentId: AgentId
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate agentId
  if (!config.agentId) {
    errors.push('Missing agentId field');
  } else if (!VALID_AGENT_IDS.includes(config.agentId)) {
    errors.push(`Invalid agentId: ${config.agentId}. Valid values: ${VALID_AGENT_IDS.join(', ')}`);
  }

  // Validate model if present
  if (config.model || config.defaults?.model) {
    const modelRef = config.model || config.defaults?.model;
    if (typeof modelRef === 'string' && modelRef.trim() === '') {
      errors.push('Model reference is empty');
    }
  }

  // Validate MCP servers if present
  if (config.mcpServers) {
    if (!Array.isArray(config.mcpServers)) {
      errors.push('MCP servers must be an array');
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validates a complete configuration object.
 */
export function validateConfig(
  config: Partial<AgentFullConfig>,
  agentId: AgentId
): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const issues: DeepSchemaIssue[] = [];

  // Validate syntax first
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

  // Validate parsed config
  const parsedValidation = validateParsedConfig(config, agentId);
  
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
      syntaxDetail: null
    };
  }

  // Validate against known values
  if (config.sandboxMode && !VALID_SANDBOX_MODES.includes(config.sandboxMode)) {
    errors.push(`Invalid sandboxMode: ${config.sandboxMode}`);
  }

  if (config.memoryBackend && !VALID_MEMORY_BACKENDS.includes(config.memoryBackend)) {
    errors.push(`Invalid memoryBackend: ${config.memoryBackend}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    issues,
    normalizedConfig: config,
    syncStatus: 'in_sync',
    lineIssuesMap: {},
    syntaxDetail: null
  };
}
