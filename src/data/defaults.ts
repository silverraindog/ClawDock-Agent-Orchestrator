import { AgentFullConfig, AgentId, AgentInfo, MCPServerConfig, SkillItem } from '../types';

export const INITIAL_AGENTS: AgentInfo[] = [
  {
    id: 'hermes-agent',
    name: 'Hermes Agent',
    tagline: 'Modular autonomous coding and reasoning agent with persistent memory',
    framework: 'Nous Research / Python',
    language: 'Python 3.11',
    defaultPort: 8080,
    dockerImage: 'ghcr.io/nousresearch/hermes-agent:latest',
    status: 'running',
    containerId: 'c108a94fd32b',
    containerName: 'hermes-agent-core',
    version: 'v0.9.4',
    memoryUsageMb: 142.6,
    cpuUsagePct: 1.4,
    uptimeSeconds: 14230,
    description: 'Specialized for multi-step software engineering, code refactoring, test execution, and autonomous problem solving with persistent cross-session memory.',
    capabilities: ['Autonomous Coding', 'Bash Shell', 'SKILL.md Spec', 'Memory Graph', 'Multi-file Edits', 'Multi-channel Gateway'],
    docsUrl: 'https://github.com/nousresearch/hermes-agent',
    repoUrl: 'https://github.com/nousresearch/hermes-agent',
  },
  {
    id: 'zeroclaw',
    name: 'ZeroClaw',
    tagline: 'Ultra-minimal Rust-based assistant for edge devices & low-RAM servers',
    framework: 'ZeroClaw Engine',
    language: 'Rust',
    defaultPort: 8081,
    dockerImage: 'zeroclaw/zeroclaw:latest',
    status: 'stopped',
    containerId: 'b94101e4aa22',
    containerName: 'zeroclaw-daemon',
    version: 'v0.4.1',
    memoryUsageMb: 14.8,
    cpuUsagePct: 0.2,
    uptimeSeconds: 0,
    description: 'Engineered for sub-15MB memory footprint. Runs effortlessly on edge devices, low-cost VPS instances, or embedded boards with zero overhead and instantaneous response.',
    capabilities: ['Sub-15MB RAM', 'Rust Safety', 'Async Runtime', 'REST & WS Daemon', 'Low-power Edge', 'Docker Ready'],
    docsUrl: 'https://github.com/zeroclaw/zeroclaw',
    repoUrl: 'https://github.com/zeroclaw/zeroclaw',
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    tagline: 'Extensible multi-channel agent gateway with broad integration ecosystem',
    framework: 'OpenClaw Foundation',
    language: 'TypeScript / Node.js',
    defaultPort: 8082,
    dockerImage: 'openclaw/openclaw:latest',
    status: 'detected_local',
    containerId: undefined,
    containerName: 'openclaw-hub',
    version: 'v1.2.0',
    memoryUsageMb: 88.2,
    cpuUsagePct: 0.9,
    uptimeSeconds: 3600,
    description: 'Central hub-and-spoke gateway daemon connecting 16+ chat platforms (Telegram, Discord, Slack, Matrix) to tool-using autonomous agent loops.',
    capabilities: ['16+ Chat Channels', 'Gateway Daemon', 'Agent Workspace', 'Tool Plugins', 'Multi-bot Routing'],
    docsUrl: 'https://github.com/openclaw/openclaw',
    repoUrl: 'https://github.com/openclaw/openclaw',
  },
  {
    id: 'picoclaw',
    name: 'PicoClaw',
    tagline: 'Sipeed ultra-lightweight Go assistant for RISC-V & embedded hardware',
    framework: 'Sipeed Edge Go',
    language: 'Go 1.22',
    defaultPort: 8083,
    dockerImage: 'sipeed/picoclaw:latest',
    status: 'running',
    containerId: 'e4991ac89b10',
    containerName: 'picoclaw-edge',
    version: 'v0.8.2',
    memoryUsageMb: 9.4,
    cpuUsagePct: 0.3,
    uptimeSeconds: 28400,
    description: 'Sipeed official edge AI assistant running in <10MB RAM with sub-second boot time. Perfect for RISC-V LicheeRV, Raspberry Pi, and compact micro-containers.',
    capabilities: ['<10MB RAM footprint', 'Sub-second Boot', 'PicoLM Inference', 'Go Binary', 'WebUI Gateway'],
    docsUrl: 'https://github.com/sipeed/picoclaw',
    repoUrl: 'https://github.com/sipeed/picoclaw',
  }
];

export const DEFAULT_CONFIGS: Record<AgentId, AgentFullConfig> = {
  'hermes-agent': {
    agentId: 'hermes-agent',
    version: '1.0.0',
    model: {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet',
      apiKey: '',
      temperature: 0.3,
      reasoningEffort: 'high',
      maxTokens: 8192,
      contextWindow: 200000,
      topP: 0.95,
    },
    channels: {
      telegram: {
        enabled: true,
        botToken: '',
        allowedUsers: '@developer, @admin',
        mode: 'polling',
      },
      discord: {
        enabled: false,
        botToken: '',
        clientId: '',
        guildIds: '',
      },
      slack: {
        enabled: false,
        botToken: '',
        appToken: '',
        signingSecret: '',
        socketMode: true,
      },
      whatsapp: {
        enabled: false,
        sessionId: 'hermes_wa_session',
        webhookUrl: 'http://localhost:8080/webhook/whatsapp',
      },
      matrix: {
        enabled: false,
        homeserver: 'https://matrix.org',
        accessToken: '',
        roomIds: '#hermes-agent:matrix.org',
      },
      webhook: {
        enabled: true,
        port: 8080,
        authToken: 'hermes_secret_token_99',
        corsOrigin: '*',
      },
    },
    system: {
      preset: 'engineer',
      systemPrompt: 'You are Hermes Agent, a premier autonomous software engineering and problem-solving AI agent. You have direct access to workspace tools, shell execution, and persistent memory. Always structure complex tasks into clear execution steps, verify your code with tests or linters, and document non-trivial architecture decisions.',
      agentName: 'Hermes Code Assistant',
      personaName: 'Hermes Prime',
      language: 'en-US',
      autoFormatCode: true,
    },
    security: {
      sandboxMode: 'docker_isolated',
      allowedDirectories: ['/workspace', '/tmp/agent-scratch', '/var/log/hermes'],
      blockNetworkAccess: false,
      maxExecutionTimeSec: 120,
      requireApprovalForCommands: false,
      securityProfileFile: '.security.yml',
    },
    storage: {
      memoryBackend: 'everos',
      dbPath: '/data/everos/memories',
      autoSummarizeInterval: 25,
      maxHistoryTurns: 100,
      vectorDbUrl: 'http://everos:8080',
    },
    customEnv: {
      HERMES_LOG_LEVEL: 'INFO',
      PYTHONUNBUFFERED: '1',
      WORKSPACE_ROOT: '/workspace',
    },
  },
  'zeroclaw': {
    agentId: 'zeroclaw',
    version: '1.0.0',
    model: {
      provider: 'deepseek',
      model: 'deepseek-r1',
      apiKey: '',
      temperature: 0.2,
      reasoningEffort: 'medium',
      maxTokens: 4096,
      contextWindow: 64000,
      topP: 0.9,
    },
    channels: {
      telegram: {
        enabled: true,
        botToken: '',
        allowedUsers: '@edge_admin',
        mode: 'polling',
      },
      discord: {
        enabled: false,
        botToken: '',
        clientId: '',
        guildIds: '',
      },
      slack: {
        enabled: false,
        botToken: '',
        appToken: '',
        signingSecret: '',
        socketMode: false,
      },
      whatsapp: {
        enabled: false,
        sessionId: '',
        webhookUrl: '',
      },
      matrix: {
        enabled: false,
        homeserver: 'https://matrix.org',
        accessToken: '',
        roomIds: '',
      },
      webhook: {
        enabled: true,
        port: 8081,
        authToken: 'zeroclaw_auth_key',
        corsOrigin: '*',
      },
    },
    system: {
      preset: 'edge_assistant',
      systemPrompt: 'You are ZeroClaw, an ultra-fast, minimal AI assistant running natively in Rust. Keep responses concise, direct, and actionable. Conserve tokens and prioritize efficiency.',
      agentName: 'ZeroClaw Edge',
      personaName: 'Zero',
      language: 'en-US',
      autoFormatCode: true,
    },
    security: {
      sandboxMode: 'docker_isolated',
      allowedDirectories: ['/var/zeroclaw/workspace'],
      blockNetworkAccess: false,
      maxExecutionTimeSec: 60,
      requireApprovalForCommands: true,
      securityProfileFile: '.security.yml',
    },
    storage: {
      memoryBackend: 'everos',
      dbPath: '/data/everos/memories/zeroclaw',
      autoSummarizeInterval: 50,
      maxHistoryTurns: 40,
      vectorDbUrl: 'http://everos:8080',
    },
    customEnv: {
      RUST_LOG: 'info',
      ZEROCLAW_MAX_RAM_MB: '16',
    },
  },
  'openclaw': {
    agentId: 'openclaw',
    version: '1.0.0',
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: '',
      temperature: 0.5,
      reasoningEffort: 'medium',
      maxTokens: 4096,
      contextWindow: 128000,
      topP: 1.0,
    },
    channels: {
      telegram: {
        enabled: true,
        botToken: '',
        allowedUsers: '*',
        mode: 'polling',
      },
      discord: {
        enabled: true,
        botToken: '',
        clientId: '1234567890',
        guildIds: '9876543210',
      },
      slack: {
        enabled: false,
        botToken: '',
        appToken: '',
        signingSecret: '',
        socketMode: true,
      },
      whatsapp: {
        enabled: false,
        sessionId: '',
        webhookUrl: '',
      },
      matrix: {
        enabled: false,
        homeserver: '',
        accessToken: '',
        roomIds: '',
      },
      webhook: {
        enabled: true,
        port: 8082,
        authToken: 'openclaw_hub_token',
        corsOrigin: '*',
      },
    },
    system: {
      preset: 'researcher',
      systemPrompt: 'You are OpenClaw, a multi-channel cooperative assistant gateway. You bridge communication between humans across multiple platforms and coordinate autonomous tools and agents.',
      agentName: 'OpenClaw Gateway',
      personaName: 'Claw Hub',
      language: 'en-US',
      autoFormatCode: true,
    },
    security: {
      sandboxMode: 'docker_isolated',
      allowedDirectories: ['/workspace'],
      blockNetworkAccess: false,
      maxExecutionTimeSec: 90,
      requireApprovalForCommands: false,
      securityProfileFile: '.security.yml',
    },
    storage: {
      memoryBackend: 'everos',
      dbPath: '/data/everos/memories/openclaw',
      autoSummarizeInterval: 30,
      maxHistoryTurns: 80,
      vectorDbUrl: 'http://everos:8080',
    },
    customEnv: {
      NODE_ENV: 'production',
      OPENCLAW_ENABLE_PLUGINS: 'true',
      OPENCLAW_PLUGIN_EVEROS: 'true',
      EVEROS_ENDPOINT: 'http://everos:8080',
    },
  },
  'picoclaw': {
    agentId: 'picoclaw',
    version: '1.0.0',
    model: {
      provider: 'ollama',
      model: 'qwen2.5-coder:7b',
      apiKey: '',
      baseUrl: 'http://localhost:11434',
      temperature: 0.4,
      reasoningEffort: 'none',
      maxTokens: 2048,
      contextWindow: 32000,
      topP: 0.9,
    },
    channels: {
      telegram: {
        enabled: true,
        botToken: '',
        allowedUsers: '@sipeed_user',
        mode: 'polling',
      },
      discord: {
        enabled: false,
        botToken: '',
        clientId: '',
        guildIds: '',
      },
      slack: {
        enabled: false,
        botToken: '',
        appToken: '',
        signingSecret: '',
        socketMode: false,
      },
      whatsapp: {
        enabled: false,
        sessionId: '',
        webhookUrl: '',
      },
      matrix: {
        enabled: false,
        homeserver: '',
        accessToken: '',
        roomIds: '',
      },
      webhook: {
        enabled: true,
        port: 8083,
        authToken: 'picoclaw_token',
        corsOrigin: '*',
      },
    },
    system: {
      preset: 'edge_assistant',
      systemPrompt: 'You are PicoClaw by Sipeed. You run on lightweight edge hardware like RISC-V and ARM boards. Be smart, snappy, and hardware-friendly.',
      agentName: 'PicoClaw Go',
      personaName: 'Pico',
      language: 'en-US',
      autoFormatCode: true,
    },
    security: {
      sandboxMode: 'host_restricted',
      allowedDirectories: ['/home/sipeed/.picoclaw'],
      blockNetworkAccess: false,
      maxExecutionTimeSec: 45,
      requireApprovalForCommands: true,
      securityProfileFile: '.security.yml',
    },
    storage: {
      memoryBackend: 'everos',
      dbPath: '/data/everos/memories/picoclaw',
      autoSummarizeInterval: 20,
      maxHistoryTurns: 30,
      vectorDbUrl: 'http://everos:8080',
    },
    customEnv: {
      PICOCLAW_MODE: 'gateway',
      PICOCLAW_LOG: 'info',
    },
  }
};

export const INITIAL_SKILLS: SkillItem[] = [
  {
    id: 'web-search-pro',
    name: 'Web Search & Intelligence',
    category: 'web',
    description: 'Perform real-time web searches, fetch webpage content, and synthesize cited research reports.',
    version: '1.4.0',
    author: 'NousResearch',
    installed: true,
    builtIn: true,
    requiresDocker: false,
    parameters: [
      { name: 'query', type: 'string', description: 'The search query to look up', required: true },
      { name: 'num_results', type: 'number', description: 'Maximum number of results to fetch (1-10)', required: false },
      { name: 'fetch_full_text', type: 'boolean', description: 'Whether to download and parse full webpage text', required: false },
    ],
    skillMdContent: `---
name: Web Search & Intelligence
description: Perform real-time web searches and scrape full webpage content with citations.
version: 1.4.0
---

# Instructions
Use this skill when you need fresh information, latest news, documentation, or technical updates.
Always cite your sources with direct URLs.
`
  },
  {
    id: 'bash-exec',
    name: 'Sandboxed Bash Executor',
    category: 'system',
    description: 'Execute shell commands inside the isolated Docker container environment with timeout safeguards.',
    version: '2.1.0',
    author: 'Sipeed / ClawDock',
    installed: true,
    builtIn: true,
    requiresDocker: true,
    parameters: [
      { name: 'command', type: 'string', description: 'The bash command to run', required: true },
      { name: 'timeout_seconds', type: 'number', description: 'Execution timeout in seconds (default: 60)', required: false },
      { name: 'cwd', type: 'string', description: 'Current working directory within the container', required: false }
    ],
    skillMdContent: `---
name: Sandboxed Bash Executor
description: Safe command execution in isolated Docker container.
version: 2.1.0
---

# Instructions
Run shell commands only when needed. Avoid dangerous destructive commands like 'rm -rf /'.
`
  },
  {
    id: 'fs-manipulator',
    name: 'File System & Code Surgery',
    category: 'coding',
    description: 'Read, write, edit, and diff files with syntax awareness and precise surgical replacements.',
    version: '1.8.2',
    author: 'ClawCore',
    installed: true,
    builtIn: true,
    requiresDocker: false,
    parameters: [
      { name: 'action', type: 'string', description: 'read, write, edit, or list', required: true },
      { name: 'file_path', type: 'string', description: 'Relative path to target file', required: true },
      { name: 'content', type: 'string', description: 'Content for write or replacement', required: false }
    ],
    skillMdContent: `---
name: File System & Code Surgery
description: High-precision file reading, writing, and surgical editing.
version: 1.8.2
---

# Instructions
Always inspect file content before applying edits to ensure target substring matches.
`
  },
  {
    id: 'git-toolkit',
    name: 'Git Workflow & PR Review',
    category: 'git',
    description: 'Inspect git status, create branches, stage files, generate meaningful commits, and review diffs.',
    version: '1.2.0',
    author: 'NousResearch',
    installed: true,
    builtIn: false,
    requiresDocker: true,
    parameters: [
      { name: 'action', type: 'string', description: 'status, commit, diff, branch, or log', required: true },
      { name: 'message', type: 'string', description: 'Commit message when committing', required: false }
    ],
    skillMdContent: `---
name: Git Workflow & PR Review
description: Complete git management tool for autonomous workflows.
version: 1.2.0
---

# Instructions
Write semantic commit messages following Conventional Commits (feat:, fix:, chore:, docs:).
`
  },
  {
    id: 'browser-headless',
    name: 'Headless Browser & Screen Scraper',
    category: 'web',
    description: 'Automate Puppeteer/Playwright browser sessions, click buttons, handle SPAs, and capture screenshots.',
    version: '1.0.4',
    author: 'OpenClaw Team',
    installed: false,
    builtIn: false,
    requiresDocker: true,
    parameters: [
      { name: 'url', type: 'string', description: 'Target URL to navigate to', required: true },
      { name: 'action', type: 'string', description: 'navigate, click, screenshot, or evaluate_js', required: true },
      { name: 'selector', type: 'string', description: 'CSS selector for click/input', required: false }
    ],
    skillMdContent: `---
name: Headless Browser & Screen Scraper
description: Navigate complex JavaScript websites, fill forms, and take screenshots.
version: 1.0.4
---

# Instructions
Wait for networkidle state before interacting with elements on heavy client-side SPAs.
`
  },
  {
    id: 'sql-explorer',
    name: 'Database & SQL Query Runner',
    category: 'database',
    description: 'Introspect database schemas, execute read-only queries, and generate analytical tabular reports.',
    version: '1.3.1',
    author: 'ClawCore',
    installed: false,
    builtIn: false,
    requiresDocker: false,
    parameters: [
      { name: 'query', type: 'string', description: 'SQL SELECT query to execute', required: true },
      { name: 'db_connection', type: 'string', description: 'Target database alias or connection string', required: false }
    ],
    skillMdContent: `---
name: Database & SQL Query Runner
description: Schema introspection and safe SQL query execution.
version: 1.3.1
---

# Instructions
Read-only queries are executed by default. Modification queries require confirmation.
`
  },
  {
    id: 'memory-graph-rag',
    name: 'Episodic Memory Graph & RAG',
    category: 'memory',
    description: 'Extract semantic facts from user interactions, store them in Chroma/SQLite, and recall relevant context.',
    version: '2.0.0',
    author: 'NousResearch',
    installed: true,
    builtIn: false,
    requiresDocker: false,
    parameters: [
      { name: 'operation', type: 'string', description: 'store_fact, query_facts, or summarize_session', required: true },
      { name: 'fact_content', type: 'string', description: 'Content to memorize', required: false }
    ],
    skillMdContent: `---
name: Episodic Memory Graph & RAG
description: Long-term memory storage and retrieval for continuous agent reasoning.
version: 2.0.0
---

# Instructions
Store project architecture rules, user preferences, and key variable names across sessions.
`
  },
  {
    id: 'docker-engine-ops',
    name: 'Docker Container Control Hub',
    category: 'system',
    description: 'Query Docker daemon socket, inspect running containers, view container logs, and prune stale images.',
    version: '1.1.0',
    author: 'Sipeed',
    installed: true,
    builtIn: false,
    requiresDocker: true,
    parameters: [
      { name: 'action', type: 'string', description: 'ps, logs, inspect, restart, or pull', required: true },
      { name: 'container_id', type: 'string', description: 'Target container ID or name', required: false }
    ],
    skillMdContent: `---
name: Docker Container Control Hub
description: Manage and observe Docker container workloads.
version: 1.1.0
---

# Instructions
Use to inspect agent container state and verify port health.
`
  },
  {
    id: 'mqtt-hardware-bridge',
    name: 'MQTT IoT & Sensor Telemetry',
    category: 'iot',
    description: 'Publish and subscribe to MQTT topics for Sipeed LicheeRV, ESP32, and Raspberry Pi edge devices.',
    version: '0.9.1',
    author: 'Sipeed',
    installed: false,
    builtIn: false,
    requiresDocker: false,
    parameters: [
      { name: 'broker_url', type: 'string', description: 'MQTT broker URL (e.g., mqtt://192.168.1.10)', required: true },
      { name: 'topic', type: 'string', description: 'MQTT topic to publish or listen', required: true },
      { name: 'payload', type: 'string', description: 'Message payload', required: false }
    ],
    skillMdContent: `---
name: MQTT IoT & Sensor Telemetry
description: Embedded hardware control for edge devices.
version: 0.9.1
---

# Instructions
Designed for Sipeed hardware boards and local home automation setups.
`
  }
];

export const INITIAL_MCP_SERVERS: MCPServerConfig[] = [
  {
    id: 'mcp-everos',
    name: 'EverOS Memory Runtime MCP Server',
    description: 'EverMind AI persistent memory operating system: Markdown-native storage, SQLite + LanceDB hybrid mRAG, and self-evolving case-to-skill consolidation for all agents.',
    transport: 'sse',
    command: 'everos',
    args: ['mcp', '--port', '8080', '--storage', '/data/everos'],
    env: {
      EVEROS_URL: 'http://everos:8080',
      EVEROS_STORAGE_PATH: '/data/everos',
      EVEROS_STORAGE_ENGINE: 'markdown_sqlite_lancedb',
      EVEROS_HYBRID_MRAG_ALPHA: '0.6'
    },
    url: 'http://everos:8080/sse',
    enabled: true,
    category: 'Memory',
    status: 'connected',
    toolsProvided: [
      'everos_store_memory',
      'everos_retrieve_mrag',
      'everos_record_trajectory_case',
      'everos_consolidate_skills',
      'everos_sync_cross_bot_context',
      'everos_inspect_memory_bank'
    ]
  },
  {
    id: 'mcp-filesystem',
    name: 'Filesystem MCP Server',
    description: 'Official Model Context Protocol server providing secure, directory-scoped file operations.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/workspace', '/data'],
    env: {
      NODE_ENV: 'production'
    },
    enabled: true,
    category: 'System',
    status: 'connected',
    toolsProvided: ['read_file', 'write_file', 'edit_file', 'list_directory', 'directory_tree', 'move_file', 'search_files']
  },
  {
    id: 'mcp-github',
    name: 'GitHub MCP Server',
    description: 'Interact with GitHub repositories, pull requests, issues, commits, and branch management.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: {
      GITHUB_PERSONAL_ACCESS_TOKEN: 'ghp_example_token_hidden'
    },
    enabled: true,
    category: 'DevOps',
    status: 'connected',
    toolsProvided: ['get_issue', 'create_issue', 'create_pull_request', 'list_commits', 'search_repositories', 'create_or_update_file']
  },
  {
    id: 'mcp-brave-search',
    name: 'Brave Search MCP Server',
    description: 'High-speed web search and local POI search API powered by the privacy-preserving Brave index.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    env: {
      BRAVE_API_KEY: 'BSA_example_key'
    },
    enabled: false,
    category: 'Search',
    status: 'disconnected',
    toolsProvided: ['brave_web_search', 'brave_local_search']
  },
  {
    id: 'mcp-postgres',
    name: 'PostgreSQL MCP Server',
    description: 'Read-only and read-write SQL access to relational databases with schema introspection.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://user:password@localhost:5432/agentdb'],
    env: {},
    enabled: false,
    category: 'Database',
    status: 'disconnected',
    toolsProvided: ['query', 'describe_table', 'list_tables']
  },
  {
    id: 'mcp-sqlite',
    name: 'SQLite Database MCP Server',
    description: 'Lightweight zero-configuration relational database server for local agent memory and state.',
    transport: 'stdio',
    command: 'uvx',
    args: ['mcp-server-sqlite', '--db-path', '/data/agent_state.db'],
    env: {},
    enabled: true,
    category: 'Database',
    status: 'connected',
    toolsProvided: ['read_query', 'write_query', 'create_table', 'list_tables', 'describe_table']
  },
  {
    id: 'mcp-docker',
    name: 'Docker Daemon MCP Server',
    description: 'Orchestrate Docker containers, inspect container health, pull images, and monitor container stats via MCP protocol.',
    transport: 'stdio',
    command: 'docker-mcp-server',
    args: ['--socket', '/var/run/docker.sock'],
    env: {
      DOCKER_HOST: 'unix:///var/run/docker.sock'
    },
    enabled: true,
    category: 'Containers',
    status: 'connected',
    toolsProvided: ['list_containers', 'start_container', 'stop_container', 'inspect_container', 'get_container_logs', 'pull_image']
  },
  {
    id: 'mcp-puppeteer',
    name: 'Puppeteer Browser MCP Server',
    description: 'Headless Chromium browser automation tool to render JavaScript pages, click buttons, and extract clean markdown.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    env: {},
    enabled: false,
    category: 'Web',
    status: 'disconnected',
    toolsProvided: ['navigate', 'screenshot', 'click', 'fill', 'evaluate']
  },
  {
    id: 'mcp-fetch',
    name: 'Fetch MCP Server',
    description: 'Converts web pages and API endpoints into clean markdown format for LLM reasoning.',
    transport: 'stdio',
    command: 'uvx',
    args: ['mcp-server-fetch'],
    env: {},
    enabled: true,
    category: 'Web',
    status: 'connected',
    toolsProvided: ['fetch']
  }
];

export const MODEL_OPTIONS = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o (Omni flagship)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & economical)' },
    { value: 'o1', label: 'OpenAI o1 (Deep reasoning)' },
    { value: 'o3-mini', label: 'OpenAI o3-mini (High-speed reasoning)' },
    { value: 'gpt-4.5-preview', label: 'GPT-4.5 Preview' },
  ],
  anthropic: [
    { value: 'claude-3-7-sonnet', label: 'Claude 3.7 Sonnet (Hybrid reasoning)' },
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet (Standard code benchmark)' },
    { value: 'claude-3-5-haiku', label: 'Claude 3.5 Haiku (Ultra-fast edge)' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus (Complex research)' },
  ],
  gemini: [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (State-of-the-art coding)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (State-of-the-art speed)' },
    { value: 'gemini-2.0-flash-thinking-exp', label: 'Gemini 2.0 Flash Thinking' },
  ],
  deepseek: [
    { value: 'deepseek-r1', label: 'DeepSeek-R1 (Open reasoning frontier)' },
    { value: 'deepseek-v3', label: 'DeepSeek-V3 (General multi-token)' },
    { value: 'deepseek-coder-v2', label: 'DeepSeek Coder V2 (236B MoE)' },
  ],
  groq: [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (300+ tok/sec)' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (Ultra-low latency)' },
    { value: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill 70B' },
  ],
  mistral: [
    { value: 'mistral-large-latest', label: 'Mistral Large 2 (Flagship)' },
    { value: 'codestral-latest', label: 'Codestral (Specialized for code)' },
    { value: 'ministral-8b-latest', label: 'Ministral 8B (Compact edge)' },
  ],
  ollama: [
    { value: 'llama3.3:70b', label: 'Llama 3.3 70B (Local)' },
    { value: 'qwen2.5-coder:7b', label: 'Qwen 2.5 Coder 7B (Sipeed Edge)' },
    { value: 'deepseek-r1:8b', label: 'DeepSeek R1 8B (Local reasoning)' },
    { value: 'mistral-nemo:12b', label: 'Mistral Nemo 12B (Local)' },
  ],
  openrouter: [
    { value: 'anthropic/claude-3.7-sonnet', label: 'OpenRouter: Claude 3.7 Sonnet' },
    { value: 'deepseek/deepseek-r1', label: 'OpenRouter: DeepSeek-R1' },
    { value: 'meta-llama/llama-3.3-70b-instruct', label: 'OpenRouter: Llama 3.3 70B' },
  ],
  custom: [
    { value: 'custom-model', label: 'Custom Model Name' }
  ]
};
