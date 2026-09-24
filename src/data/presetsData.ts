import { ModelPresetSnapshot } from '../types';

export const INITIAL_PRESETS: ModelPresetSnapshot[] = [
  {
    id: 'preset-fast-coding',
    name: 'Fast Coding',
    description: 'High-speed code synthesis, refactoring, and linting optimized for ultra-low latency.',
    category: 'coding',
    isBuiltIn: true,
    createdAt: '2026-09-24T00:00:00.000Z',
    targetAgentId: 'all',
    tags: ['coding', 'low-latency', 'refactor', 'typescript'],
    model: {
      provider: 'ollama',
      model: 'qwen2.5-coder:7b',
      apiKey: '',
      baseUrl: 'http://localhost:11434',
      temperature: 0.15,
      reasoningEffort: 'low',
      maxTokens: 4096,
      contextWindow: 32000,
      topP: 0.9,
      useProxy: true
    },
    moa: {
      enabled: false,
      proposerModels: ['qwen2.5-coder:7b', 'deepseek-r1:8b'],
      aggregatorModel: 'qwen2.5-coder:7b',
      rounds: 1,
      temperatureSpread: 0.2,
      consensusThreshold: 0.80
    },
    fallback: {
      enabled: true,
      strategy: 'on_error',
      fallbackProvider: 'anthropic',
      fallbackModel: 'claude-3-5-haiku',
      provider: 'anthropic',
      model: 'claude-3-5-haiku',
      apiKey: '',
      useProxy: true
    },
    system: {
      preset: 'engineer',
      systemPrompt: 'You are an ultra-fast, precision software engineer. Prioritize writing clean, type-safe code with zero unnecessary filler. Immediately output working code blocks and concise explanations.',
      autoFormatCode: true
    }
  },
  {
    id: 'preset-deep-reasoning',
    name: 'Deep Reasoning',
    description: 'Maximal reasoning compute for hard algorithmic challenges, system architecture, and formal logic verification.',
    category: 'reasoning',
    isBuiltIn: true,
    createdAt: '2026-09-24T00:00:00.000Z',
    targetAgentId: 'all',
    tags: ['reasoning', 'architecture', 'formal-verification', 'deepseek-r1'],
    model: {
      provider: 'deepseek',
      model: 'deepseek-r1',
      apiKey: '',
      baseUrl: 'https://api.deepseek.com',
      temperature: 0.2,
      reasoningEffort: 'extended',
      maxTokens: 8192,
      contextWindow: 64000,
      topP: 0.95,
      useProxy: true
    },
    moa: {
      enabled: false,
      proposerModels: ['deepseek-r1', 'claude-3-7-sonnet'],
      aggregatorModel: 'deepseek-r1',
      rounds: 2,
      temperatureSpread: 0.3,
      consensusThreshold: 0.85
    },
    fallback: {
      enabled: true,
      strategy: 'on_offline',
      fallbackProvider: 'anthropic',
      fallbackModel: 'claude-3-7-sonnet',
      provider: 'anthropic',
      model: 'claude-3-7-sonnet',
      apiKey: '',
      useProxy: true
    },
    system: {
      preset: 'researcher',
      systemPrompt: 'You are an advanced systems architect and reasoning engine. Break down difficult engineering problems into mathematical principles, consider edge cases thoroughly, and provide formal proofs and step-by-step verification.',
      autoFormatCode: true
    }
  },
  {
    id: 'preset-moa-consensus-swarm',
    name: 'MoA Consensus Swarm',
    description: 'Multi-model Mixture of Agents (MoA) synthesis aggregating proposals across frontier & local models to reach high agreement.',
    category: 'moa',
    isBuiltIn: true,
    createdAt: '2026-09-24T00:00:00.000Z',
    targetAgentId: 'all',
    tags: ['moa', 'multi-agent', 'consensus', 'ensemble'],
    model: {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet',
      apiKey: '',
      baseUrl: 'https://api.anthropic.com/v1',
      temperature: 0.3,
      reasoningEffort: 'high',
      maxTokens: 8192,
      contextWindow: 200000,
      topP: 0.95,
      useProxy: true
    },
    moa: {
      enabled: true,
      proposerModels: [
        'claude-3-7-sonnet',
        'deepseek-r1',
        'gpt-4o',
        'gemma4-soul:latest'
      ],
      aggregatorModel: 'gemma4-soul:latest',
      rounds: 3,
      temperatureSpread: 0.35,
      consensusThreshold: 0.88,
      providerMapping: {
        'claude-3-7-sonnet': 'anthropic',
        'deepseek-r1': 'deepseek',
        'gpt-4o': 'openai',
        'gemma4-soul:latest': 'custom:ollama'
      }
    },
    fallback: {
      enabled: true,
      strategy: 'on_error',
      fallbackProvider: 'ollama',
      fallbackModel: 'gemma4-soul:latest',
      provider: 'ollama',
      model: 'gemma4-soul:latest',
      apiKey: '',
      useProxy: true
    },
    system: {
      preset: 'engineer',
      systemPrompt: 'You are an ensemble coordinator utilizing Mixture-of-Agents. Synthesize diverse model outputs into an optimal, error-free consensus output with validated reliability.',
      autoFormatCode: true
    }
  },
  {
    id: 'preset-edge-slm-offline',
    name: 'Local Edge SLM (Offline)',
    description: 'Zero external network egress with quantized local models optimized for Sipeed, Raspberry Pi, and edge hardware.',
    category: 'speed',
    isBuiltIn: true,
    createdAt: '2026-09-24T00:00:00.000Z',
    targetAgentId: 'picoclaw',
    tags: ['edge', 'offline', 'ollama', 'privacy'],
    model: {
      provider: 'ollama',
      model: 'gemma4-soul:latest',
      apiKey: '',
      baseUrl: 'http://localhost:11434',
      temperature: 0.25,
      reasoningEffort: 'none',
      maxTokens: 2048,
      contextWindow: 16000,
      topP: 0.85,
      useProxy: true
    },
    moa: {
      enabled: false,
      proposerModels: ['gemma4-soul:latest'],
      aggregatorModel: 'gemma4-soul:latest',
      rounds: 1,
      temperatureSpread: 0.1,
      consensusThreshold: 0.75
    },
    fallback: {
      enabled: false,
      strategy: 'on_offline',
      fallbackProvider: 'ollama',
      fallbackModel: 'llama3.2:3b',
      provider: 'ollama',
      model: 'llama3.2:3b',
      apiKey: '',
      useProxy: true
    },
    system: {
      preset: 'edge_assistant',
      systemPrompt: 'You are an embedded edge AI assistant operating on restricted hardware. Keep memory usage low, avoid unnecessary iterations, and reply concisely.',
      autoFormatCode: true
    }
  },
  {
    id: 'preset-autonomous-devops',
    name: 'Autonomous DevOps & Infra',
    description: 'Specialized for Docker orchestration, CI/CD pipelines, container monitoring, and shell tool execution.',
    category: 'general',
    isBuiltIn: true,
    createdAt: '2026-09-24T00:00:00.000Z',
    targetAgentId: 'all',
    tags: ['devops', 'docker', 'infrastructure', 'automation'],
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      temperature: 0.2,
      reasoningEffort: 'medium',
      maxTokens: 4096,
      contextWindow: 128000,
      topP: 0.9,
      useProxy: true
    },
    moa: {
      enabled: false,
      proposerModels: ['gpt-4o', 'claude-3-5-sonnet'],
      aggregatorModel: 'gpt-4o',
      rounds: 2,
      temperatureSpread: 0.2,
      consensusThreshold: 0.85
    },
    fallback: {
      enabled: true,
      strategy: 'on_error',
      fallbackProvider: 'ollama',
      fallbackModel: 'llama3.3:70b',
      provider: 'ollama',
      model: 'llama3.3:70b',
      apiKey: '',
      useProxy: true
    },
    system: {
      preset: 'devops',
      systemPrompt: 'You are an expert DevOps engineer and Site Reliability Engineer (SRE). Provide robust container manifests, shell commands with sanity checks, and root-cause analysis for infrastructure errors.',
      autoFormatCode: true
    }
  }
];
