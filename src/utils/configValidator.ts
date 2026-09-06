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

    // Additional TOML line heuristics
    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;
      const trimmed = lineText.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      if (trimmed.startsWith('[') && !trimmed.endsWith(']')) {
        const alreadyAdded = issues.some(i => i.line === lineNum);
        if (!alreadyAdded) {
          issues.push({
            id: `toml-unclosed-header-${lineNum}`,
            type: 'syntax_error',
            severity: 'error',
            path: `line_${lineNum}`,
            message: 'Unclosed TOML section header. Must terminate with "]"',
            line: lineNum,
            column: lineText.length,
            suggestedFix: 'Add closing bracket "]" to header',
            fixType: 'replace_line',
            replacementText: `${lineText}]`
          });
        }
      }
    });

    return {
      isValid: !tomlParseFailed && issues.filter(i => i.severity === 'error').length === 0,
      format,
      parserName: 'TOML Parser (smol-toml)',
      issues,
      primaryError: issues[0]?.message,
      primaryLine: issues[0]?.line,
      primaryColumn: issues[0]?.column
    };
  }

  // 3. YAML Parser Validation using yaml AST Document Parser
  const seenTopLevelKeys = new Set<string>();
  const seenSubKeys = new Map<string, Set<string>>();
  let currentParentKey = '';

  // 3a. Check for tab characters (banned in YAML)
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    if (lineText.includes('\t')) {
      const col = lineText.indexOf('\t') + 1;
      const fixedLine = lineText.replace(/\t/g, '  ');
      issues.push({
        id: `tab-indent-${lineNum}`,
        type: 'syntax_error',
        severity: 'error',
        path: `line_${lineNum}`,
        message: 'YAML prohibits Tab indentation. Use 2 or 4 spaces instead.',
        line: lineNum,
        column: col,
        suggestedFix: 'Replace tab characters with 2 spaces',
        fixType: 'remove_tab',
        replacementText: fixedLine
      });
    }

    const trimmed = lineText.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    // List item formatting: "-item" -> "- item"
    if (trimmed.startsWith('-') && trimmed.length > 1 && trimmed[1] !== ' ' && trimmed[1] !== '-') {
      issues.push({
        id: `yaml-list-space-${lineNum}`,
        type: 'syntax_error',
        severity: 'error',
        path: `line_${lineNum}`,
        message: 'YAML list items require a space after the dash (e.g. "- item" instead of "-item").',
        line: lineNum,
        column: lineText.indexOf('-') + 1,
        suggestedFix: 'Add space after "-"',
        fixType: 'replace_line',
        replacementText: lineText.replace(/^(\s*)-(\S)/, '$1- $2')
      });
    }

    // Unclosed quotes on single line
    const singleQuotes = (lineText.match(/(?<!\\)'/g) || []).length;
    const doubleQuotes = (lineText.match(/(?<!\\)"/g) || []).length;

    if (singleQuotes % 2 !== 0 && !lineText.includes("'''") && !lineText.includes('|') && !lineText.includes('>')) {
      issues.push({
        id: `unclosed-sq-${lineNum}`,
        type: 'syntax_error',
        severity: 'warning',
        path: `line_${lineNum}`,
        message: 'Potentially unclosed single quote string literal.',
        line: lineNum,
        column: lineText.indexOf("'") + 1,
        suggestedFix: "Close the single quote at the end of the line: '",
        fixType: 'fix_quote'
      });
    }

    if (doubleQuotes % 2 !== 0 && !lineText.includes('"""') && !lineText.includes('|') && !lineText.includes('>')) {
      issues.push({
        id: `unclosed-dq-${lineNum}`,
        type: 'syntax_error',
        severity: 'warning',
        path: `line_${lineNum}`,
        message: 'Potentially unclosed double quote string literal.',
        line: lineNum,
        column: lineText.indexOf('"') + 1,
        suggestedFix: 'Close the double quote at the end of the line: "',
        fixType: 'fix_quote'
      });
    }

    // Duplicate key detection
    const keyMatch = trimmed.match(/^([a-zA-Z0-9_\-]+)\s*:/);
    if (keyMatch) {
      const keyName = keyMatch[1];
      const indent = lineText.search(/\S/);

      if (indent === 0) {
        currentParentKey = keyName;
        if (seenTopLevelKeys.has(keyName)) {
          issues.push({
            id: `dup-key-${keyName}-${lineNum}`,
            type: 'syntax_error',
            severity: 'warning',
            path: keyName,
            message: `Duplicate top-level key "${keyName}" detected. Later definitions may override earlier ones.`,
            line: lineNum,
            column: 1,
            suggestedFix: `Merge duplicate "${keyName}" block`
          });
        }
        seenTopLevelKeys.add(keyName);
      } else if (currentParentKey) {
        if (!seenSubKeys.has(currentParentKey)) {
          seenSubKeys.set(currentParentKey, new Set());
        }
        const subSet = seenSubKeys.get(currentParentKey)!;
        if (subSet.has(keyName)) {
          issues.push({
            id: `dup-subkey-${currentParentKey}.${keyName}-${lineNum}`,
            type: 'syntax_error',
            severity: 'warning',
            path: `${currentParentKey}.${keyName}`,
            message: `Duplicate key "${keyName}" inside "${currentParentKey}" block.`,
            line: lineNum,
            column: indent + 1,
            suggestedFix: `Remove duplicate "${keyName}" entry`
          });
        }
        subSet.add(keyName);
      }
    }
  });

  // 3b. Run YAML Parser Document Validator
  try {
    const doc = YAML.parseDocument(content, { prettyErrors: true });
    if (doc.errors && doc.errors.length > 0) {
      doc.errors.forEach((yamlErr, idx) => {
        let line = 1;
        let col = 1;
        if (yamlErr.linePos && yamlErr.linePos[0]) {
          line = yamlErr.linePos[0].line;
          col = yamlErr.linePos[0].col;
        } else if (yamlErr.pos && typeof yamlErr.pos[0] === 'number') {
          const sub = content.slice(0, yamlErr.pos[0]);
          line = sub.split('\n').length;
          col = sub.length - sub.lastIndexOf('\n');
        }

        // Clean message to be human-readable and avoid raw multi-line compiler dumps
        let cleanMsg = yamlErr.message ? yamlErr.message.split('\n')[0] : 'YAML syntax error';
        cleanMsg = cleanMsg.replace(/\s+at\s+line\s+\d+.*$/i, '').trim();

        // Avoid duplicate issues on same line if tab issue is already logged
        const existingTabIssue = issues.find(i => i.line === line && i.id.startsWith('tab-indent'));
        if (!existingTabIssue) {
          issues.push({
            id: `yaml-parser-err-${line}-${col}-${idx}`,
            type: 'syntax_error',
            severity: 'error',
            path: `line_${line}`,
            message: `YAML Parser Error: ${cleanMsg}`,
            line,
            column: col,
            suggestedFix: 'Correct YAML indentation or mapping structure'
          });
        }
      });
    }

    if (doc.warnings && doc.warnings.length > 0) {
      doc.warnings.forEach((warn, idx) => {
        let line = 1;
        let col = 1;
        if (warn.linePos && warn.linePos[0]) {
          line = warn.linePos[0].line;
          col = warn.linePos[0].col;
        }
        const cleanMsg = warn.message ? warn.message.split('\n')[0].replace(/\s+at\s+line\s+\d+.*$/i, '').trim() : 'YAML warning';
        issues.push({
          id: `yaml-parser-warn-${line}-${col}-${idx}`,
          type: 'syntax_error',
          severity: 'warning',
          path: `line_${line}`,
          message: `YAML Warning: ${cleanMsg}`,
          line,
          column: col
        });
      });
    }
  } catch (err: any) {
    issues.push({
      id: 'yaml-fatal-parse-err',
      type: 'syntax_error',
      severity: 'error',
      path: 'root',
      message: `YAML Parse Failure: ${err.message}`,
      line: 1,
      column: 1
    });
  }

  const errorIssues = issues.filter(i => i.severity === 'error');

  return {
    isValid: errorIssues.length === 0,
    format,
    parserName: 'YAML Parser (v2.x)',
    issues,
    primaryError: errorIssues[0]?.message,
    primaryLine: errorIssues[0]?.line,
    primaryColumn: errorIssues[0]?.column
  };
}

/**
 * Validates native syntax (YAML, TOML, JSON) line-by-line and returns precise line-level syntax issues.
 */
export function validateNativeSyntax(
  content: string, 
  format: 'yaml' | 'toml' | 'json' = 'yaml'
): DeepSchemaIssue[] {
  const detail = validateRawNativeSyntax(content, format);
  return detail.issues;
}

/**
 * Line finding utility for specific paths or keys in native content
 */
export function findLineInNative(
  content: string,
  sectionPattern: RegExp,
  keyPattern?: RegExp
): { line: number; column: number; rawLine: string } | null {
  const lines = content.split('\n');
  let insideTargetSection = !keyPattern;
  let sectionIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (!insideTargetSection) {
      const match = rawLine.match(sectionPattern);
      if (match) {
        insideTargetSection = true;
        sectionIndent = rawLine.search(/\S/);
        if (!keyPattern) {
          return { line: i + 1, column: (match.index || 0) + 1, rawLine };
        }
        continue;
      }
    } else if (keyPattern) {
      const curIndent = rawLine.search(/\S/);
      // If we dropped back to root or parent level and it's another section
      if (curIndent <= sectionIndent && (trimmed.endsWith(':') || trimmed.startsWith('['))) {
        // Exited section without finding key, but check if this line itself matches
        if (!rawLine.match(sectionPattern)) {
          insideTargetSection = false;
        }
      }

      const keyMatch = rawLine.match(keyPattern);
      if (keyMatch) {
        return { line: i + 1, column: (keyMatch.index || 0) + 1, rawLine };
      }
    }
  }

  // Fallback: Global search if section-scoped search didn't catch it
  if (keyPattern) {
    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const match = rawLine.match(keyPattern);
      if (match) {
        return { line: i + 1, column: (match.index || 0) + 1, rawLine };
      }
    }
  }

  return null;
}

/**
 * Performs Deep-Link schema validation between native file content (YAML/TOML)
 * and the structured JSON AgentFullConfig schema.
 * 
 * Flow:
 * 1. Executes real-time YAML / TOML parser syntax validation.
 * 2. If syntax is invalid, immediately halts full schema parsing to present
 *    clear, high-priority syntax diagnostics in the editor UI.
 * 3. If syntax is valid, parses native content and performs cross-checking
 *    against the target AgentFullConfig schema.
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

  // 1. Real-time Syntax Validation via YAML / TOML Parsing Library
  const syntaxDetail = validateRawNativeSyntax(nativeContent, format);
  issues.push(...syntaxDetail.issues);

  const hasSyntaxErrors = syntaxDetail.issues.some(i => i.severity === 'error');

  // If there are syntax errors, avoid noisy schema mismatch cross-validation
  // and focus directly on the syntax issues with precise line diagnostics
  if (hasSyntaxErrors) {
    const lineIssuesMap: Record<number, DeepSchemaIssue[]> = {};
    issues.forEach(issue => {
      if (issue.line) {
        if (!lineIssuesMap[issue.line]) {
          lineIssuesMap[issue.line] = [];
        }
        lineIssuesMap[issue.line].push(issue);
      }
      if (issue.severity === 'error') {
        errors.push(issue.line ? `[Line ${issue.line}] ${issue.message}` : issue.message);
      } else if (issue.severity === 'warning') {
        warnings.push(issue.line ? `[Line ${issue.line}] ${issue.message}` : issue.message);
      }
    });

    return {
      isValid: false,
      errors,
      warnings,
      issues,
      syncStatus: 'syntax_invalid',
      lineIssuesMap,
      syntaxDetail
    };
  }

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

  // Helper to replace or generate fixed line in native content
  const createReplacementLine = (origLine: string, keyName: string, newValue: any): string => {
    if (format === 'toml') {
      const formattedVal = typeof newValue === 'string' ? `"${newValue}"` : String(newValue);
      return origLine.replace(new RegExp(`(${keyName}\\s*=\\s*).*`), `$1${formattedVal}`);
    }
    const formattedVal = typeof newValue === 'string' ? `'${newValue}'` : String(newValue);
    return origLine.replace(new RegExp(`(${keyName}\\s*:\\s*).*`), `$1${formattedVal}`);
  };

  // 3. Deep Link Cross-Checking: Model Spec
  if (schemaConfig.model) {
    // Model Provider Check
    const providerLoc = findLineInNative(nativeContent, /(?:model|llm|engine)\s*[:\]]/i, /provider\s*[:=]/i);
    if (!VALID_PROVIDERS.includes(schemaConfig.model.provider)) {
      issues.push({
        id: 'invalid-provider',
        type: 'type_error',
        severity: 'error',
        path: 'model.provider',
        message: `Invalid provider "${schemaConfig.model.provider}". Must be one of: ${VALID_PROVIDERS.join(', ')}`,
        line: providerLoc?.line,
        column: providerLoc?.column,
        schemaValue: schemaConfig.model.provider,
        suggestedFix: 'Set provider to "ollama", "anthropic", "openai", "gemini", or "custom"'
      });
    }

    // Model Name Check
    const modelNameLoc = findLineInNative(nativeContent, /(?:model|llm|engine)\s*[:\]]/i, /(?:model|model_name|checkpoint|default)\s*[:=]/i);
    if (!schemaConfig.model.model || schemaConfig.model.model.trim() === '') {
      issues.push({
        id: 'missing-model-name',
        type: 'missing_required',
        severity: 'error',
        path: 'model.model',
        message: "Model identifier string is required (e.g. 'claude-3-7-sonnet' or 'gemma4-soul:latest')",
        line: modelNameLoc?.line,
        column: modelNameLoc?.column,
        schemaValue: '',
        suggestedFix: "Specify active model name: model: 'gemma4-soul:latest'"
      });
    }

    // Cross Discrepancy: Model in Native vs Schema
    if (parsedFromNative.model?.model && parsedFromNative.model.model !== schemaConfig.model.model) {
      const fixedLine = modelNameLoc ? createReplacementLine(modelNameLoc.rawLine, '(?:model|model_name|checkpoint|default)', schemaConfig.model.model) : undefined;
      issues.push({
        id: 'mismatch-model-name',
        type: 'schema_mismatch',
        severity: 'warning',
        path: 'model.model',
        message: `Native config specifies model "${parsedFromNative.model.model}", but JSON schema has "${schemaConfig.model.model}".`,
        line: modelNameLoc?.line,
        column: modelNameLoc?.column,
        nativeValue: parsedFromNative.model.model,
        schemaValue: schemaConfig.model.model,
        suggestedFix: `Update native file to match schema model: "${schemaConfig.model.model}"`,
        fixType: 'sync_value',
        replacementText: fixedLine
      });
    }

    // Cross Discrepancy: Provider in Native vs Schema
    if (parsedFromNative.model?.provider && parsedFromNative.model.provider !== schemaConfig.model.provider) {
      const fixedLine = providerLoc ? createReplacementLine(providerLoc.rawLine, 'provider', schemaConfig.model.provider) : undefined;
      issues.push({
        id: 'mismatch-provider',
        type: 'schema_mismatch',
        severity: 'warning',
        path: 'model.provider',
        message: `Native config specifies provider "${parsedFromNative.model.provider}", but JSON schema has "${schemaConfig.model.provider}".`,
        line: providerLoc?.line,
        column: providerLoc?.column,
        nativeValue: parsedFromNative.model.provider,
        schemaValue: schemaConfig.model.provider,
        suggestedFix: `Synchronize provider in native file to "${schemaConfig.model.provider}"`,
        fixType: 'sync_value',
        replacementText: fixedLine
      });
    }

    // Temperature Bounds & Discrepancy
    const tempLoc = findLineInNative(nativeContent, /(?:model|llm|engine)\s*[:\]]/i, /temperature\s*[:=]/i);
    if (schemaConfig.model.temperature !== undefined) {
      if (typeof schemaConfig.model.temperature !== 'number' || schemaConfig.model.temperature < 0 || schemaConfig.model.temperature > 2.0) {
        issues.push({
          id: 'invalid-temperature',
          type: 'type_error',
          severity: 'warning',
          path: 'model.temperature',
          message: `Temperature ${schemaConfig.model.temperature} is outside recommended bounds [0.0 - 2.0].`,
          line: tempLoc?.line,
          column: tempLoc?.column,
          schemaValue: schemaConfig.model.temperature,
          suggestedFix: 'Set temperature to 0.7 or 0.3'
        });
      }
    }
    if (parsedFromNative.model?.temperature !== undefined && schemaConfig.model.temperature !== undefined) {
      if (Math.abs(parsedFromNative.model.temperature - schemaConfig.model.temperature) > 0.01) {
        const fixedLine = tempLoc ? createReplacementLine(tempLoc.rawLine, 'temperature', schemaConfig.model.temperature) : undefined;
        issues.push({
          id: 'mismatch-temperature',
          type: 'schema_mismatch',
          severity: 'info',
          path: 'model.temperature',
          message: `Native temperature is ${parsedFromNative.model.temperature}, schema is ${schemaConfig.model.temperature}.`,
          line: tempLoc?.line,
          column: tempLoc?.column,
          nativeValue: parsedFromNative.model.temperature,
          schemaValue: schemaConfig.model.temperature,
          suggestedFix: `Set native temperature to ${schemaConfig.model.temperature}`,
          fixType: 'sync_value',
          replacementText: fixedLine
        });
      }
    }
  }

  // 4. Deep Link Cross-Checking: Channels & Communication
  if (schemaConfig.channels) {
    // Telegram
    const telLoc = findLineInNative(nativeContent, /(?:channels|channel|telegram)\s*[:\]]/i, /(?:bot_token|botToken|telegram)\s*[:=]/i);
    if (schemaConfig.channels.telegram?.enabled && !schemaConfig.channels.telegram.botToken) {
      issues.push({
        id: 'missing-telegram-token',
        type: 'missing_required',
        severity: 'warning',
        path: 'channels.telegram.botToken',
        message: 'Telegram is enabled in schema, but bot token is empty. Bot will fail to connect.',
        line: telLoc?.line,
        column: telLoc?.column,
        suggestedFix: 'Add Telegram bot_token or environment secret'
      });
    }

    // Discord
    const discLoc = findLineInNative(nativeContent, /(?:channels|channel|discord)\s*[:\]]/i, /(?:bot_token|botToken|discord)\s*[:=]/i);
    if (schemaConfig.channels.discord?.enabled && !schemaConfig.channels.discord.botToken) {
      issues.push({
        id: 'missing-discord-token',
        type: 'missing_required',
        severity: 'warning',
        path: 'channels.discord.botToken',
        message: 'Discord is enabled in schema, but bot token is empty. Bot will fail to connect.',
        line: discLoc?.line,
        column: discLoc?.column,
        suggestedFix: 'Add Discord bot_token or environment secret'
      });
    }
  }

  // 5. Deep Link Cross-Checking: Security & Sandboxing
  if (schemaConfig.security) {
    const secLoc = findLineInNative(nativeContent, /(?:security|sandbox)\s*[:\]]/i, /(?:sandbox_mode|sandboxMode|mode)\s*[:=]/i);
    if (schemaConfig.security.sandboxMode && !VALID_SANDBOX_MODES.includes(schemaConfig.security.sandboxMode)) {
      issues.push({
        id: 'invalid-sandbox-mode',
        type: 'type_error',
        severity: 'warning',
        path: 'security.sandboxMode',
        message: `Unrecognized sandbox mode "${schemaConfig.security.sandboxMode}". Valid: ${VALID_SANDBOX_MODES.join(', ')}`,
        line: secLoc?.line,
        column: secLoc?.column,
        schemaValue: schemaConfig.security.sandboxMode,
        suggestedFix: 'Set sandboxMode to "docker_isolated"'
      });
    }

    if (parsedFromNative.security?.sandboxMode && parsedFromNative.security.sandboxMode !== schemaConfig.security.sandboxMode) {
      const fixedLine = secLoc ? createReplacementLine(secLoc.rawLine, '(?:sandbox_mode|sandboxMode|mode)', schemaConfig.security.sandboxMode) : undefined;
      issues.push({
        id: 'mismatch-sandbox-mode',
        type: 'schema_mismatch',
        severity: 'warning',
        path: 'security.sandboxMode',
        message: `Native config specifies sandbox "${parsedFromNative.security.sandboxMode}", but JSON schema has "${schemaConfig.security.sandboxMode}".`,
        line: secLoc?.line,
        column: secLoc?.column,
        nativeValue: parsedFromNative.security.sandboxMode,
        schemaValue: schemaConfig.security.sandboxMode,
        suggestedFix: `Update native sandbox mode to "${schemaConfig.security.sandboxMode}"`,
        fixType: 'sync_value',
        replacementText: fixedLine
      });
    }
  }

  // 6. Deep Link Cross-Checking: Memory & Storage
  if (schemaConfig.storage) {
    const memLoc = findLineInNative(nativeContent, /(?:storage|memory)\s*[:\]]/i, /(?:memory_backend|memoryBackend|backend)\s*[:=]/i);
    if (schemaConfig.storage.memoryBackend && !VALID_MEMORY_BACKENDS.includes(schemaConfig.storage.memoryBackend)) {
      issues.push({
        id: 'invalid-memory-backend',
        type: 'type_error',
        severity: 'warning',
        path: 'storage.memoryBackend',
        message: `Unrecognized memory backend "${schemaConfig.storage.memoryBackend}". Valid: ${VALID_MEMORY_BACKENDS.join(', ')}`,
        line: memLoc?.line,
        column: memLoc?.column,
        schemaValue: schemaConfig.storage.memoryBackend,
        suggestedFix: 'Set memoryBackend to "everos", "sqlite", or "chroma"'
      });
    }

    if (parsedFromNative.storage?.memoryBackend && parsedFromNative.storage.memoryBackend !== schemaConfig.storage.memoryBackend) {
      const fixedLine = memLoc ? createReplacementLine(memLoc.rawLine, '(?:memory_backend|memoryBackend|backend)', schemaConfig.storage.memoryBackend) : undefined;
      issues.push({
        id: 'mismatch-memory-backend',
        type: 'schema_mismatch',
        severity: 'warning',
        path: 'storage.memoryBackend',
        message: `Native config specifies memory backend "${parsedFromNative.storage.memoryBackend}", but JSON schema has "${schemaConfig.storage.memoryBackend}".`,
        line: memLoc?.line,
        column: memLoc?.column,
        nativeValue: parsedFromNative.storage.memoryBackend,
        schemaValue: schemaConfig.storage.memoryBackend,
        suggestedFix: `Update native memory backend to "${schemaConfig.storage.memoryBackend}"`,
        fixType: 'sync_value',
        replacementText: fixedLine
      });
    }
  }

  // 7. Deep Link Cross-Checking: MoA (Mixture-of-Agents)
  if (schemaConfig.moa?.enabled) {
    const moaLoc = findLineInNative(nativeContent, /(?:moa|mixture_of_agents)\s*[:\]]/i, /(?:aggregator_model|aggregatorModel)\s*[:=]/i);
    if (schemaConfig.moa.aggregatorModel && parsedFromNative.moa?.aggregatorModel) {
      if (schemaConfig.moa.aggregatorModel !== parsedFromNative.moa.aggregatorModel) {
        const fixedLine = moaLoc ? createReplacementLine(moaLoc.rawLine, '(?:aggregator_model|aggregatorModel)', schemaConfig.moa.aggregatorModel) : undefined;
        issues.push({
          id: 'mismatch-moa-aggregator',
          type: 'schema_mismatch',
          severity: 'info',
          path: 'moa.aggregatorModel',
          message: `Native MoA aggregator is "${parsedFromNative.moa.aggregatorModel}", schema is "${schemaConfig.moa.aggregatorModel}".`,
          line: moaLoc?.line,
          column: moaLoc?.column,
          nativeValue: parsedFromNative.moa.aggregatorModel,
          schemaValue: schemaConfig.moa.aggregatorModel,
          suggestedFix: `Synchronize native aggregator to "${schemaConfig.moa.aggregatorModel}"`,
          fixType: 'sync_value',
          replacementText: fixedLine
        });
      }
    }
  }

  // Build line-to-issues lookup map for ultra-fast gutter & inline rendering
  const lineIssuesMap: Record<number, DeepSchemaIssue[]> = {};
  issues.forEach(issue => {
    if (issue.line) {
      if (!lineIssuesMap[issue.line]) {
        lineIssuesMap[issue.line] = [];
      }
      lineIssuesMap[issue.line].push(issue);
    }
    if (issue.severity === 'error') {
      errors.push(issue.line ? `[Line ${issue.line}] ${issue.message}` : issue.message);
    } else if (issue.severity === 'warning') {
      warnings.push(issue.line ? `[Line ${issue.line}] ${issue.message}` : issue.message);
    }
  });

  const hasMismatches = issues.some(i => i.type === 'schema_mismatch');

  let syncStatus: 'in_sync' | 'mismatched' | 'syntax_invalid' = 'in_sync';
  if (errors.length > 0) syncStatus = 'syntax_invalid';
  else if (hasMismatches) syncStatus = 'mismatched';

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    issues,
    normalizedConfig: errors.length === 0 ? schemaConfig : undefined,
    syncStatus,
    lineIssuesMap,
    syntaxDetail
  };
}

/**
 * Applies an individual fix to native file content
 */
export function applySingleFix(nativeContent: string, issue: DeepSchemaIssue): string {
  if (!issue.line || !issue.replacementText) {
    if (issue.fixType === 'remove_tab') {
      return nativeContent.replace(/\t/g, '  ');
    }
    return nativeContent;
  }

  const lines = nativeContent.split('\n');
  const targetIdx = issue.line - 1;
  if (targetIdx >= 0 && targetIdx < lines.length) {
    lines[targetIdx] = issue.replacementText;
    return lines.join('\n');
  }
  return nativeContent;
}

/**
 * Standard schema validation for AgentFullConfig object
 */
export function validateAgentConfig(data: any, expectedAgentId?: AgentId): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const issues: DeepSchemaIssue[] = [];
  const lineIssuesMap: Record<number, DeepSchemaIssue[]> = {};

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
      syncStatus: 'syntax_invalid',
      lineIssuesMap
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
    syncStatus: errors.length === 0 ? 'in_sync' : 'syntax_invalid',
    lineIssuesMap
  };
}

