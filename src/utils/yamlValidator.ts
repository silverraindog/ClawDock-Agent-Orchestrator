import YAML from 'js-yaml';
import { validateAgentConfig, ConfigValidationResult } from './configValidator';
import { AgentId } from '../types';

export interface YamlValidationResult extends ConfigValidationResult {
  parsedConfig?: any;
}

export function validateYamlConfig(yamlString: string, agentId?: AgentId): YamlValidationResult {
  try {
    const parsed = YAML.load(yamlString);
    const validation = validateAgentConfig(parsed, agentId);
    return {
      ...validation,
      parsedConfig: validation.isValid ? parsed : undefined
    };
  } catch (err: any) {
    return {
      isValid: false,
      errors: [`Invalid YAML syntax: ${err.message}`],
      warnings: [],
      issues: [],
      syncStatus: 'syntax_invalid',
      lineIssuesMap: {}
    };
  }
}
