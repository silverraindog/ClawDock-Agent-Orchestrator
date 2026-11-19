import { AgentFullConfig, AgentId, ChannelConfig, FallbackConfig, LLMProvider, ModelConfig, MoAConfig } from '../types';

export function isLocalDeployment(provider?: string, baseUrl?: string, model?: string): boolean {
  if (provider === 'ollama' || provider === 'custom') return true;
  if (baseUrl) {
    const lowerUrl = baseUrl.toLowerCase();
    if (lowerUrl.includes('11434') || lowerUrl.includes('localhost') || lowerUrl.includes('127.0.0.1') || lowerUrl.includes('192.168.') || lowerUrl.includes('10.') || lowerUrl.includes('172.16.') || lowerUrl.includes(':8000') || lowerUrl.includes(':5000')) {
      return true;
    }
  }
  if (model) {
    const lowerModel = model.toLowerCase();
    if (lowerModel.includes('ollama') || lowerModel.includes('qwen2.5') || lowerModel.includes(':latest') || lowerModel.includes('gemma') || lowerModel.includes('llama3') || lowerModel.includes('coder') || lowerModel.includes('sonnet')) {
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
    try { obj = JSON.parse(contentOrObj); } catch {}
  }
  
  if (obj && typeof obj === 'object') {
    if (obj.gateway || obj.agents?.ownership || obj.models?.providers || String(obj.version).startsWith('2.')) return 'v2';
  }
  
  if (typeof contentOrObj === 'string') {
    try { obj = JSON.parse(contentOrObj); } catch {}
  }
  
  if (obj && typeof obj === 'object') {
    if (obj.gateway || obj.agents?.ownership || obj.models?.providers || String(obj.version).startsWith('2.')) return 'v2';
  }

  return 'v1';
}

export function sanitizeConfigString(input: string): string {
  try {
    const obj = JSON.parse(input);
    function sanitizeObject(o: any): void {
      if (o === null || typeof o !== 'object') return;
      for (const k in o) {
        if (o.hasOwnProperty(k)) {
          const v = o[k];
          if (typeof v === 'string' && v.includes('host:11434')) o[k] = sanitizeConfigString(v);
          else if (Array.isArray(v)) for (let i = 0; i < v.length; i++) if (typeof v[i] === 'string' && v[i].includes('host:11434')) v[i] = sanitizeConfigString(v[i]);
          else if (typeof v === 'object') sanitizeObject(v);
        }
      }
    }
    return JSON.stringify(obj);
  } catch {
    // Handle corrupted strings
    
    const inputStr = String(input);
    
    // Case 1: URL corruption like "http://localhost:11434host:11434" -> "http://localhost:11434"
    if (inputStr.startsWith('http://')) {
      const lastColon = inputStr.lastIndexOf(':');
      if (lastColon > 0 && inputStr.substring(lastColon) === 'host:11434') {
        return inputStr.substring(0, lastColon + 7);
      }
    } else if (inputStr.startsWith('https://')) {
      const lastColon = inputStr.lastIndexOf(':');
      if (lastColon > 0 && inputStr.substring(lastColon) === 'host:11434') {
        return inputStr.substring(0, lastColon + 7);
      }
    } else if (/^[^\/\s]+:[0-9]+[^\/\s]*host:11434$/.test(inputStr)) {
      const lastColon = inputStr.lastIndexOf(':');
      if (lastColon > 0) return inputStr.substring(0, lastColon + 7);
    }
    
    // Case 2: Just "host:11434" or "11434host:11434" -> "11434"
    if (inputStr === 'host:11434' || inputStr === '11434host:11434') {
      return '11434';
    }
    
    // Case 3: Any remaining "host:11434" pattern anywhere in string (only at the end)
    if (inputStr.endsWith('host:11434')) {
      const lastColon = inputStr.lastIndexOf(':');
      if (lastColon > 0 && lastColon < inputStr.length - 8) {
        return inputStr.substring(0, lastColon + 7);
      }
    }
    
    // Case 4: Standalone "host:11434"
    if (inputStr === 'host:11434') {
      return '11434';
    }

    return inputStr;
  }
}

export function parseNativeConfigToSchema(agentId: string, content: string, format: 'json' | 'yaml' | 'toml'): any {
  let result: any;
  
  if (format === 'json') {
    try { result = JSON.parse(content); } catch {}
  } else if (format === 'yaml') {
    result = parseSimpleYAML(content);
  } else if (format === 'toml') {
    result = parseSimpleTOML(content);
  }

  // Create flat object with top-level keys
  const flat: any = {};
  
  // Handle JSON and YAML: create flat object with keys like "model.model", "model.provider", etc.
  if (format === 'json' || format === 'yaml') {
    if (result && typeof result === 'object') {
      // Extract model info
      let modelValue: string | number | undefined = undefined;
      
      if ('model' in result) {
        const m = result.model;
        if (typeof m === 'string') {
          modelValue = m;
        } else if (typeof m === 'object' && 'provider' in m) {
          modelValue = m.provider as string;
        }
      }
      
      // Add flat properties
      flat.model = modelValue || '';
      flat.provider = (result?.provider as string) || '';
      flat.temperature = (result?.temperature as number) || 0;
      flat.baseUrl = result.baseUrl || undefined;
    }
  }

  // For TOML: create flat object with keys like "system.agentName", "model.provider", "model.model"
  if (format === 'toml' && result && typeof result === 'object') {
    const normalized: any = {
      system: {
        agentName: result.agent_name || result.agentName || '',
      },
      model: {
        provider: result.provider || '',
        model: result.model || '',
      },
      temperature: result.temperature,
    };
    result = normalized;
  }

  return result;
}

export function enhanceConfigWithNative(baseConfig: Partial<AgentFullConfig>, nativeContent: string, format: 'yaml', agentId: string): any {
  const enhanced: any = JSON.parse(JSON.stringify(baseConfig));
  const lines = nativeContent.split('\n');
  let newModel: any = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.trim().startsWith('#')) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) continue;
    const key = line.substring(0, colonIdx).trim();
    if (key === 'model') {
      const rawValue = line.substring(colonIdx + 1).trim().replace(/^"|"$/g, '');
      // Split by the last colon to preserve model name properly
      const lastColon = rawValue.lastIndexOf(':');
      if (lastColon >= 0) {
        newModel.provider = rawValue.substring(0, lastColon);
        newModel.model = lastColon === 0 ? '' : rawValue.substring(lastColon + 1);
      } else {
        newModel.provider = '';
        newModel.model = rawValue;
      }
    } else if (key === 'provider') {
      const value = line.substring(colonIdx + 1).trim();
      newModel.provider = value;
    }
  }
  
  // Merge with base config - ensure model is an object with all properties preserved
  const updatedModel: any = { 
    ...baseConfig.model,
    ...newModel,
  };
  if (enhanced.model) {
    enhanced.model = updatedModel;
  } else {
    enhanced.model = updatedModel;
  }
  
  return enhanced;
}

export function parseSimpleJSON(content: string): any { try { return JSON.parse(content); } catch {} }

export function parseSimpleTOML(content: string): any {
  const lines = content.split('\n');
  let result: any = {};
  let currentTable: string | undefined;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.trim().startsWith('#')) continue;
    if (line.match(/^\[([^\]]+)\]$/)) {
      const tableKey = line.replace(/^\[([^\]]+)\]$/, '$1');
      currentTable = tableKey;
      result[currentTable] = {};
    } else if (currentTable && line.includes(':')) {
      const idx = line.indexOf(':');
      const key = line.substring(0, idx).trim();
      let rawValue = line.substring(idx + 1).trim().replace(/^"|"$/g, '');
      if (rawValue.includes('"')) {
        const parts = rawValue.split('"');
        if (parts.length > 1) rawValue = '"' + parts.join('') + '"';
      }
      result[currentTable][key] = rawValue;
    } else {
      const idx = line.indexOf('=');
      if (idx >= 0) {
        const key = line.substring(0, idx).trim();
        let rawValue = line.substring(idx + 1).trim().replace(/^"|"$/g, '');
        if (rawValue.includes('"')) {
          const parts = rawValue.split('"');
          if (parts.length > 1) rawValue = '"' + parts.join('') + '"';
        }
        result[key] = rawValue;
      }
    }
  }
  return result;
}

export function parseSimpleYAML(content: string): any {
  const lines = content.split('\n');
  let result: any = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#') || line.startsWith('---')) continue;
    if (line.length === 0) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) continue;
    const key = line.substring(0, colonIdx).trim();
    let rawValue = line.substring(colonIdx + 1).trim();
    if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
      rawValue = rawValue.substring(1, -1);
    }
    result[key] = rawValue;
  }
  return result;
}
