/**
 * OpenClaw Config v2 & Official Draft-07 JSON Schema
 * Specification for OpenClaw Enterprise Gateway & Multi-Channel Daemons
 */
import { DeepSchemaIssue } from '../utils/configValidator';

export const OPENCLAW_V2_CONFIG_DEFAULT = {
  "wizard": {
    "securityAcknowledgedAt": "2026-09-12T14:20:14.950Z",
    "accessMode": "guarded",
    "localModelLeanAutoModel": "ollama/hermes3-8b-332k:latest",
    "lastRunAt": "2026-09-13T03:30:09.411Z",
    "lastRunVersion": "2026.8.1",
    "lastRunCommand": "doctor",
    "lastRunMode": "local"
  },
  "telemetry": {
    "enabled": true,
    "consentedAt": "2026-09-12T14:20:37.269Z"
  },
  "meta": {
    "migrations": {
      "modelPolicyAllowlist": true
    },
    "lastTouchedVersion": "2026.8.1"
  },
  "agents": {
    "defaults": {
      "experimental": {
        "localModelLean": true
      },
      "model": "ollama/hermes3-8b-332k:latest"
    },
    "entries": {
      "main": {
        "models": {
          "ollama/hermes3-8b-332k:latest": {
            "agentRuntime": {
              "id": "openclaw"
            }
          }
        }
      }
    }
  },
  "plugins": {
    "entries": {
      "ollama": {
        "enabled": true
      },
      "discord": {
        "enabled": true
      }
    }
  },
  "models": {
    "providers": {
      "ollama": {
        "baseUrl": "http://192.168.1.49:11434",
        "api": "ollama",
        "apiKey": "ollama-local",
        "models": [
          {
            "id": "gemma4:12b",
            "name": "gemma4:12b",
            "reasoning": true,
            "input": [
              "text",
              "image"
            ],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 262144,
            "maxTokens": 8192,
            "compat": {
              "supportsTools": true,
              "supportsUsageInStreaming": true,
              "supportsJsonSchemaResponseFormat": true
            },
            "contextTokens": 32768,
            "params": {
              "num_ctx": 262144
            }
          },
          {
            "id": "gemma4:12b-65k",
            "name": "gemma4:12b-65k",
            "reasoning": true,
            "input": [
              "text",
              "image"
            ],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 262144,
            "maxTokens": 8192,
            "compat": {
              "supportsTools": true,
              "supportsUsageInStreaming": true,
              "supportsJsonSchemaResponseFormat": true
            },
            "contextTokens": 32768,
            "params": {
              "num_ctx": 262144
            }
          },
          {
            "id": "deepseek-coder-v2:16b",
            "name": "deepseek-coder-v2:16b",
            "reasoning": false,
            "input": [
              "text"
            ],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 163840,
            "maxTokens": 8192,
            "compat": {
              "supportsTools": false,
              "supportsUsageInStreaming": true,
              "supportsJsonSchemaResponseFormat": true
            },
            "contextTokens": 32768,
            "params": {
              "num_ctx": 163840
            }
          },
          {
            "id": "gemma4:e2b-65k",
            "name": "gemma4:e2b-65k",
            "reasoning": true,
            "input": [
              "text",
              "image"
            ],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 131072,
            "maxTokens": 8192,
            "compat": {
              "supportsTools": true,
              "supportsUsageInStreaming": true,
              "supportsJsonSchemaResponseFormat": true
            },
            "contextTokens": 32768,
            "params": {
              "num_ctx": 131072
            }
          },
          {
            "id": "gemma4:e2b",
            "name": "gemma4:e2b",
            "reasoning": true,
            "input": [
              "text",
              "image"
            ],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 131072,
            "maxTokens": 8192,
            "compat": {
              "supportsTools": true,
              "supportsUsageInStreaming": true,
              "supportsJsonSchemaResponseFormat": true
            },
            "contextTokens": 32768,
            "params": {
              "num_ctx": 131072
            }
          },
          {
            "id": "qwen3:8b",
            "name": "qwen3:8b",
            "reasoning": true,
            "input": [
              "text"
            ],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 40960,
            "maxTokens": 8192,
            "compat": {
              "supportsTools": true,
              "supportsUsageInStreaming": true,
              "supportsJsonSchemaResponseFormat": true
            },
            "contextTokens": 32768,
            "params": {
              "num_ctx": 40960
            }
          },
          {
            "id": "qwen2.5-coder:14b",
            "name": "qwen2.5-coder:14b",
            "reasoning": false,
            "input": [
              "text"
            ],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 32768,
            "maxTokens": 8192,
            "compat": {
              "supportsTools": true,
              "supportsUsageInStreaming": true,
              "supportsJsonSchemaResponseFormat": true
            },
            "contextTokens": 32768,
            "params": {
              "num_ctx": 32768
            }
          },
          {
            "id": "llama3.1:8b-instruct-q8_0",
            "name": "llama3.1:8b-instruct-q8_0",
            "reasoning": false,
            "input": [
              "text"
            ],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 131072,
            "maxTokens": 8192,
            "compat": {
              "supportsTools": true,
              "supportsUsageInStreaming": true,
              "supportsJsonSchemaResponseFormat": true
            },
            "contextTokens": 32768,
            "params": {
              "num_ctx": 131072
            }
          },
          {
            "id": "huihui_ai/gemma-4-abliterated:12b",
            "name": "huihui_ai/gemma-4-abliterated:12b",
            "reasoning": true,
            "input": [
              "text",
              "image"
            ],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 131072,
            "maxTokens": 8192,
            "compat": {
              "supportsTools": true,
              "supportsUsageInStreaming": true,
              "supportsJsonSchemaResponseFormat": true
            },
            "contextTokens": 32768,
            "params": {
              "num_ctx": 131072
            }
          },
          {
            "id": "qllama/bge-reranker-v2-m3:latest",
            "name": "qllama/bge-reranker-v2-m3:latest",
            "reasoning": false,
            "input": [
              "text"
            ],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 8192,
            "maxTokens": 8192,
            "compat": {
              "supportsTools": false,
              "supportsUsageInStreaming": true,
              "supportsJsonSchemaResponseFormat": true
            },
            "contextTokens": 8192,
            "params": {
              "num_ctx": 8192
            }
          },
          {
            "id": "phi3:3.8b-mini-128k-instruct-q4_K_M",
            "name": "phi3:3.8b-mini-128k-instruct-q4_K_M",
            "reasoning": false,
            "input": [
              "text"
            ],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 131072,
            "maxTokens": 8192,
            "compat": {
              "supportsTools": false,
              "supportsUsageInStreaming": true,
              "supportsJsonSchemaResponseFormat": true
            },
            "contextTokens": 32768,
            "params": {
              "num_ctx": 131072
            }
          },
          {
            "id": "phi3-3-8b-mini-64k-instruct-q4_K_M:latest",
            "name": "phi3-3-8b-mini-64k-instruct-q4_K_M:latest",
            "reasoning": false,
            "input": [
              "text"
            ],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 131072,
            "maxTokens": 8192,
            "compat": {
              "supportsTools": false,
              "supportsUsageInStreaming": true,
              "supportsJsonSchemaResponseFormat": true
            },
            "contextTokens": 32768,
            "params": {
              "num_ctx": 131072
            }
          },
          {
            "id": "gemma4:12b-it-qat-16k",
            "name": "gemma4:12b-it-qat-16k",
            "reasoning": true,
            "input": [
              "text",
              "image"
            ],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 262144,
            "maxTokens": 8192,
            "compat": {
              "supportsTools": true,
              "supportsUsageInStreaming": true,
              "supportsJsonSchemaResponseFormat": true
            },
            "contextTokens": 32768,
            "params": {
              "num_ctx": 262144
            }
          },
          {
            "id": "gemma2-9b-8k:latest",
            "name": "gemma2-9b-8k:latest",
            "reasoning": false,
            "input": [
              "text"
            ],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 8192,
            "maxTokens": 8192,
            "compat": {
              "supportsTools": false,
              "supportsUsageInStreaming": true,
              "supportsJsonSchemaResponseFormat": true
            },
            "contextTokens": 8192,
            "params": {
              "num_ctx": 8192
            }
          },
          {
            "id": "hermes3-8b-332k:latest",
            "name": "hermes3-8b-332k:latest",
            "reasoning": false,
            "input": [
              "text"
            ],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 131072,
            "maxTokens": 8192,
            "compat": {
              "supportsTools": true,
              "supportsUsageInStreaming": true,
              "supportsJsonSchemaResponseFormat": true
            },
            "contextTokens": 32768,
            "params": {
              "num_ctx": 131072
            }
          },
          {
            "id": "qwen2-5-coder-7b-32k:latest",
            "name": "qwen2-5-coder-7b-32k:latest",
            "reasoning": false,
            "input": [
              "text"
            ],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 32768,
            "maxTokens": 8192,
            "compat": {
              "supportsTools": true,
              "supportsUsageInStreaming": true,
              "supportsJsonSchemaResponseFormat": true
            },
            "contextTokens": 32768,
            "params": {
              "num_ctx": 32768
            }
          },
          {
            "id": "ornith-9b-64k:latest",
            "name": "ornith-9b-64k:latest",
            "reasoning": true,
            "input": [
              "text"
            ],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 262144,
            "maxTokens": 8192,
            "compat": {
              "supportsTools": true,
              "supportsUsageInStreaming": true,
              "supportsJsonSchemaResponseFormat": true
            },
            "contextTokens": 32768,
            "params": {
              "num_ctx": 262144
            }
          },
          {
            "id": "gemma4-soul:latest",
            "name": "gemma4-soul:latest",
            "reasoning": true,
            "input": [
              "text",
              "image"
            ],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 131072,
            "maxTokens": 8192,
            "compat": {
              "supportsTools": true,
              "supportsUsageInStreaming": true,
              "supportsJsonSchemaResponseFormat": true
            },
            "contextTokens": 32768,
            "params": {
              "num_ctx": 131072
            }
          }
        ]
      }
    }
  },
  "gateway": {
    "mode": "local",
    "auth": {
      "mode": "token",
      "token": ""
    },
    "port": 18789,
    "bind": "loopback",
    "tailscale": {
      "mode": "off"
    }
  },
  "tools": {
    "profile": "coding"
  },
  "hooks": {
    "internal": {
      "entries": {
        "session-memory": {
          "enabled": true
        }
      }
    }
  },
  "channels": {
    "discord": {
      "enabled": true
    }
  },
  "skills": {
    "entries": {
      "1password": {
        "enabled": false
      },
      "blogwatcher": {
        "enabled": false
      },
      "blucli": {
        "enabled": false
      },
      "camsnap": {
        "enabled": false
      },
      "coding-agent": {
        "enabled": false
      },
      "eightctl": {
        "enabled": false
      },
      "gemini": {
        "enabled": false
      },
      "gh-issues": {
        "enabled": false
      },
      "gifgrep": {
        "enabled": false
      },
      "github": {
        "enabled": false
      },
      "gog": {
        "enabled": false
      },
      "goplaces": {
        "enabled": false
      },
      "himalaya": {
        "enabled": false
      },
      "mcporter": {
        "enabled": false
      },
      "model-usage": {
        "enabled": false
      },
      "nano-pdf": {
        "enabled": false
      },
      "obsidian": {
        "enabled": false
      },
      "openai-whisper": {
        "enabled": false
      },
      "openai-whisper-api": {
        "enabled": false
      },
      "openhue": {
        "enabled": false
      },
      "oracle": {
        "enabled": false
      },
      "ordercli": {
        "enabled": false
      },
      "sag": {
        "enabled": false
      },
      "session-logs": {
        "enabled": false
      },
      "sherpa-onnx-tts": {
        "enabled": false
      },
      "songsee": {
        "enabled": false
      },
      "sonoscli": {
        "enabled": false
      },
      "spotify-player": {
        "enabled": false
      },
      "summarize": {
        "enabled": false
      },
      "tmux": {
        "enabled": false
      },
      "trello": {
        "enabled": false
      },
      "video-frames": {
        "enabled": false
      },
      "xurl": {
        "enabled": false
      }
    }
  }
};

/**
 * Top-level property definitions allowed by the OpenClaw v2 Draft-07 Schema.
 */
export const OPENCLAW_V2_ALLOWED_ROOT_SECTIONS = [
  '$schema',
  'meta',
  'env',
  'wizard',
  'diagnostics',
  'logging',
  'update',
  'telemetry',
  'browser',
  'ui',
  'secrets',
  'auth',
  'accessGroups',
  'acp',
  'models',
  'nodeHost',
  'agents',
  'tools',
  'security',
  'bindings',
  'broadcast',
  'attachments',
  'messages',
  'tts',
  'commands',
  'approvals',
  'session',
  'cron',
  'transcripts',
  'hooks',
  'channels',
  'discovery',
  'talk',
  'gateway',
  'cloudWorkers',
  'desktop',
  'memory',
  'mcp',
  'skills',
  'plugins',
  'surfaces',
  'proxy'
] as const;

export type OpenClawV2Section = typeof OPENCLAW_V2_ALLOWED_ROOT_SECTIONS[number];

/**
 * Metadata summaries for each OpenClaw v2 configuration section.
 */
export const OPENCLAW_V2_SECTION_DOCS: Record<string, { title: string; description: string }> = {
  meta: {
    title: 'Compatibility Metadata',
    description: 'Backward-readable compatibility metadata retained so older binaries can refuse unsafe config downgrades.'
  },
  env: {
    title: 'Environment',
    description: 'Environment import and override settings used to supply runtime variables to the gateway process.'
  },
  wizard: {
    title: 'Setup Preferences',
    description: 'User-owned setup preferences. Machine-owned wizard history and acknowledgement state.'
  },
  diagnostics: {
    title: 'Diagnostics',
    description: 'Diagnostics controls for targeted tracing, telemetry export, and cache inspection during debugging.'
  },
  logging: {
    title: 'Logging',
    description: 'Logging behavior controls for severity, output destinations, formatting, and sensitive-data redaction.'
  },
  update: {
    title: 'Updates',
    description: 'Update-channel and startup-check behavior for keeping OpenClaw runtime versions current.'
  },
  telemetry: {
    title: 'Telemetry',
    description: 'Explicit consent for anonymous feature statistics attached to the daily update check.'
  },
  browser: {
    title: 'Browser',
    description: 'Browser runtime controls for local or remote CDP attachment, profile routing, and screenshot/snapshot behavior.'
  },
  ui: {
    title: 'UI',
    description: 'UI presentation settings for accenting and operator display preferences.'
  },
  secrets: {
    title: 'Secrets',
    description: 'Secret reference providers, shared-store behavior, and optional subprocess egress protection.'
  },
  auth: {
    title: 'Auth',
    description: 'Authentication profile root used for multi-profile provider credentials and cooldown-based failover ordering.'
  },
  accessGroups: {
    title: 'Access Groups',
    description: 'Granular channel audience and sender membership group definitions.'
  },
  acp: {
    title: 'ACP',
    description: 'ACP runtime controls for enabling dispatch, selecting backends, and streaming turn projections.'
  },
  models: {
    title: 'Models',
    description: 'Model catalog root for provider definitions, merge/replace behavior, context windows, and pricing.'
  },
  nodeHost: {
    title: 'Node Host',
    description: 'Node host controls for features exposed from this gateway node to other nodes or clients.'
  },
  agents: {
    title: 'Agents',
    description: 'Agent runtime configuration root. Root siblings own infrastructure; entries override per agent.'
  },
  tools: {
    title: 'Tools',
    description: 'Tool infrastructure, code execution, web search/fetch, subagents, and cross-agent defaults.'
  },
  security: {
    title: 'Security',
    description: 'Audit suppressions, install policies, and sandbox security controls.'
  },
  bindings: {
    title: 'Bindings',
    description: 'Top-level routing rules and persistent ACP conversation ownership per channel / peer.'
  },
  broadcast: {
    title: 'Broadcast',
    description: 'Broadcast routing map for sending the same outbound message to multiple peer IDs.'
  },
  attachments: {
    title: 'Attachments',
    description: 'Top-level retention behavior shared across providers and tools that persist media.'
  },
  messages: {
    title: 'Messages',
    description: 'Message infrastructure and cross-agent defaults for group chats, queues, and reaction acks.'
  },
  tts: {
    title: 'Text-to-Speech',
    description: 'Text-to-speech policy for reading agent replies aloud on supported voice or audio surfaces.'
  },
  commands: {
    title: 'Commands',
    description: 'Controls chat command surfaces, owner gating, and elevated command access behavior.'
  },
  approvals: {
    title: 'Approvals',
    description: 'Approval routing controls for forwarding exec and plugin approval requests.'
  },
  session: {
    title: 'Session',
    description: 'Global session routing, reset, delivery policy, and maintenance controls for conversation history.'
  },
  cron: {
    title: 'Automations',
    description: 'Global scheduler settings for stored automations, run concurrency, and delivery fallbacks.'
  },
  transcripts: {
    title: 'Transcripts',
    description: 'Core transcript capture settings for meeting notes, recording tools, and live sources.'
  },
  hooks: {
    title: 'Hooks',
    description: 'Inbound webhook automation surface for mapping external events into wake or agent actions.'
  },
  channels: {
    title: 'Channels',
    description: 'Channel provider configurations (Discord, Telegram, Slack, Matrix, WhatsApp, etc.).'
  },
  discovery: {
    title: 'Discovery',
    description: 'Service discovery settings for local mDNS advertisement and wide-area presence.'
  },
  talk: {
    title: 'Talk',
    description: 'Talk-mode voice synthesis settings for voice identity, model selection, and interruption.'
  },
  gateway: {
    title: 'Gateway',
    description: 'Gateway runtime surface for bind mode, port, auth tokens, control UI, and remote transport.'
  },
  cloudWorkers: {
    title: 'Cloud Workers',
    description: 'Opt-in cloud worker profiles for disposable remote execution environments.'
  },
  desktop: {
    title: 'Desktop',
    description: 'Experimental gateway-host desktop observation backed by an existing or managed VNC server.'
  },
  memory: {
    title: 'Memory',
    description: 'Built-in memory configuration, vector search, multimodal embeddings, and EverOS integration.'
  },
  mcp: {
    title: 'MCP',
    description: 'Global Model Context Protocol server definitions managed by OpenClaw.'
  },
  skills: {
    title: 'Skills',
    description: 'Skill workshop, installation limits, load directories, and individual skill enable entries.'
  },
  plugins: {
    title: 'Plugins',
    description: 'Plugin system controls for enabling extensions, hook timeouts, and individual plugin entries.'
  },
  surfaces: {
    title: 'Surfaces',
    description: 'Per-surface message policy overrides keyed by the resolved delivery surface id.'
  },
  proxy: {
    title: 'Proxy',
    description: 'Operator-managed forward proxy routing for OpenClaw runtime HTTP/WebSocket egress.'
  }
};

/**
 * Validates a parsed OpenClaw v2 configuration object against the official OpenClaw Schema v2.
 */
export function validateOpenClawV2Object(jsonObj: any, rawLines?: string[]): DeepSchemaIssue[] {
  const issues: DeepSchemaIssue[] = [];

  if (!jsonObj || typeof jsonObj !== 'object' || Array.isArray(jsonObj)) {
    issues.push({
      id: 'openclaw-v2-root-type',
      type: 'type_error',
      severity: 'error',
      path: 'root',
      message: 'OpenClaw v2 configuration must be a JSON object conforming to Draft-07 OpenClawConfig schema.',
      line: 1,
      column: 1
    });
    return issues;
  }

  // 1. Check for unpermitted root keys (additionalProperties: false)
  const rootKeys = Object.keys(jsonObj);
  const allowedSet = new Set<string>(OPENCLAW_V2_ALLOWED_ROOT_SECTIONS);

  rootKeys.forEach(key => {
    if (!allowedSet.has(key)) {
      // Find line number in rawLines if possible
      let lineNum = 1;
      if (rawLines) {
        const foundIdx = rawLines.findIndex(l => l.includes(`"${key}"`));
        if (foundIdx !== -1) lineNum = foundIdx + 1;
      }
      issues.push({
        id: `openclaw-v2-unknown-root-${key}`,
        type: 'schema_mismatch',
        severity: 'error',
        path: key,
        message: `Property "${key}" is not allowed in OpenClaw v2 schema. OpenClaw v2 enforces strict additionalProperties: false.`,
        line: lineNum,
        suggestedFix: `Remove or relocate "${key}" into standard sections (e.g. agents, models, gateway, channels, plugins, skills).`
      });
    }
  });

  // 2. Validate Gateway section
  if (jsonObj.gateway) {
    const gw = jsonObj.gateway;
    if (gw.port !== undefined) {
      const portNum = Number(gw.port);
      if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
        issues.push({
          id: 'openclaw-v2-gateway-port',
          type: 'type_error',
          severity: 'error',
          path: 'gateway.port',
          message: `gateway.port must be an integer between 1 and 65535. Received: ${gw.port}`,
          suggestedFix: 'Set gateway.port to a valid port like 18789 or 8082'
        });
      }
    }
    if (gw.mode && !['local', 'remote'].includes(gw.mode)) {
      issues.push({
        id: 'openclaw-v2-gateway-mode',
        type: 'schema_mismatch',
        severity: 'error',
        path: 'gateway.mode',
        message: `gateway.mode must be "local" or "remote". Received: "${gw.mode}"`,
        suggestedFix: 'Set gateway.mode to "local"'
      });
    }
    if (gw.bind && !['auto', 'lan', 'loopback', 'custom', 'tailnet'].includes(gw.bind)) {
      issues.push({
        id: 'openclaw-v2-gateway-bind',
        type: 'schema_mismatch',
        severity: 'error',
        path: 'gateway.bind',
        message: `gateway.bind must be one of ["auto", "lan", "loopback", "custom", "tailnet"]. Received: "${gw.bind}"`,
        suggestedFix: 'Set gateway.bind to "loopback" or "lan"'
      });
    }
  }

  // 3. Validate Models section
  if (jsonObj.models) {
    const models = jsonObj.models;
    if (models.mode && !['merge', 'replace'].includes(models.mode)) {
      issues.push({
        id: 'openclaw-v2-models-mode',
        type: 'schema_mismatch',
        severity: 'error',
        path: 'models.mode',
        message: `models.mode must be "merge" or "replace". Received: "${models.mode}"`,
        suggestedFix: 'Set models.mode to "merge"'
      });
    }
    if (models.providers && typeof models.providers === 'object') {
      const validAdapters = [
        'openai-completions',
        'openai-responses',
        'openai-chatgpt-responses',
        'anthropic-messages',
        'google-generative-ai',
        'google-vertex',
        'github-copilot',
        'bedrock-converse-stream',
        'ollama',
        'azure-openai-responses'
      ];

      Object.entries(models.providers).forEach(([pName, pVal]: [string, any]) => {
        if (pVal && typeof pVal === 'object') {
          if (pVal.api && !validAdapters.includes(pVal.api)) {
            issues.push({
              id: `openclaw-v2-provider-${pName}-api`,
              type: 'schema_mismatch',
              severity: 'warning',
              path: `models.providers.${pName}.api`,
              message: `Unknown API adapter "${pVal.api}" for provider "${pName}". Supported adapters: ${validAdapters.join(', ')}`,
              suggestedFix: `Use "ollama" or "openai-completions"`
            });
          }
          if (Array.isArray(pVal.models)) {
            pVal.models.forEach((mItem: any, idx: number) => {
              if (!mItem.id || !mItem.name) {
                issues.push({
                  id: `openclaw-v2-provider-${pName}-model-${idx}-required`,
                  type: 'missing_required',
                  severity: 'error',
                  path: `models.providers.${pName}.models[${idx}]`,
                  message: `Each declared model entry under models.providers.${pName} must have "id" and "name" properties.`,
                  suggestedFix: `Add "id" and "name" to model entry at index ${idx}`
                });
              }
            });
          }
        }
      });
    }
  }

  // 4. Validate Tools section
  if (jsonObj.tools) {
    if (jsonObj.tools.profile && !['minimal', 'coding', 'messaging', 'full'].includes(jsonObj.tools.profile)) {
      issues.push({
        id: 'openclaw-v2-tools-profile',
        type: 'schema_mismatch',
        severity: 'error',
        path: 'tools.profile',
        message: `tools.profile must be one of ["minimal", "coding", "messaging", "full"]. Received: "${jsonObj.tools.profile}"`,
        suggestedFix: 'Set tools.profile to "coding" or "full"'
      });
    }
  }

  // 5. Validate Agents section
  if (jsonObj.agents) {
    if (jsonObj.agents.ownership && jsonObj.agents.ownership !== 'explicit') {
      issues.push({
        id: 'openclaw-v2-agents-ownership',
        type: 'schema_mismatch',
        severity: 'warning',
        path: 'agents.ownership',
        message: `agents.ownership should be "explicit" in multi-agent fleet deployments. Received: "${jsonObj.agents.ownership}"`,
        suggestedFix: 'Set agents.ownership to "explicit"'
      });
    }
  }

  return issues;
}
