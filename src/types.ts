export type AgentId = 'hermes-agent' | 'zeroclaw' | 'openclaw' | 'picoclaw';

export type AgentStatus = 'running' | 'stopped' | 'not_installed' | 'detected_local' | 'error';

export interface AgentInfo {
  id: AgentId;
  name: string;
  tagline: string;
  framework: string;
  language: string;
  defaultPort: number;
  dockerImage: string;
  status: AgentStatus;
  containerId?: string;
  containerName?: string;
  version: string;
  memoryUsageMb: number;
  cpuUsagePct: number;
  uptimeSeconds: number;
  description: string;
  capabilities: string[];
  docsUrl: string;
  repoUrl: string;
}

export type LLMProvider = 
  | 'openai' 
  | 'anthropic' 
  | 'gemini' 
  | 'deepseek' 
  | 'groq' 
  | 'mistral' 
  | 'ollama' 
  | 'openrouter'
  | 'custom';

export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high' | 'extended';

export type SandboxMode = 'docker_isolated' | 'host_restricted' | 'read_only';

export type MemoryBackend = 'sqlite' | 'chroma' | 'redis' | 'markdown';

export interface ModelConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature: number;
  reasoningEffort: ReasoningEffort;
  maxTokens: number;
  contextWindow: number;
  topP: number;
}

export interface ChannelConfig {
  telegram: {
    enabled: boolean;
    botToken: string;
    allowedUsers: string;
    mode: 'polling' | 'webhook';
    webhookUrl?: string;
  };
  discord: {
    enabled: boolean;
    botToken: string;
    clientId: string;
    guildIds: string;
  };
  slack: {
    enabled: boolean;
    botToken: string;
    appToken: string;
    signingSecret: string;
    socketMode: boolean;
  };
  whatsapp: {
    enabled: boolean;
    sessionId: string;
    webhookUrl: string;
  };
  matrix: {
    enabled: boolean;
    homeserver: string;
    accessToken: string;
    roomIds: string;
  };
  webhook: {
    enabled: boolean;
    port: number;
    authToken: string;
    corsOrigin: string;
  };
}

export interface SystemPromptConfig {
  preset: 'engineer' | 'researcher' | 'devops' | 'edge_assistant' | 'custom';
  systemPrompt: string;
  agentName: string;
  personaName: string;
  language: string;
  autoFormatCode: boolean;
}

export interface SecurityConfig {
  sandboxMode: SandboxMode;
  allowedDirectories: string[];
  blockNetworkAccess: boolean;
  maxExecutionTimeSec: number;
  requireApprovalForCommands: boolean;
  securityProfileFile: string;
}

export interface StorageConfig {
  memoryBackend: MemoryBackend;
  dbPath: string;
  autoSummarizeInterval: number;
  maxHistoryTurns: number;
  vectorDbUrl?: string;
}

export interface AgentFullConfig {
  agentId: AgentId;
  version: string;
  model: ModelConfig;
  channels: ChannelConfig;
  system: SystemPromptConfig;
  security: SecurityConfig;
  storage: StorageConfig;
  customEnv: Record<string, string>;
}

export interface SkillItem {
  id: string;
  name: string;
  category: 'web' | 'coding' | 'system' | 'git' | 'database' | 'memory' | 'media' | 'iot';
  description: string;
  version: string;
  author: string;
  installed: boolean;
  builtIn: boolean;
  requiresDocker: boolean;
  parameters: {
    name: string;
    type: string;
    description: string;
    required: boolean;
  }[];
  skillMdContent: string;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  description: string;
  transport: 'stdio' | 'sse' | 'http';
  command: string;
  args: string[];
  env: Record<string, string>;
  url?: string;
  enabled: boolean;
  category: string;
  status: 'connected' | 'disconnected' | 'testing';
  toolsProvided: string[];
}

export interface DiscoveredContainer {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'exited' | 'stopped' | 'created' | 'paused';
  state: string;
  created: string;
  ports: string;
  suggestedAgentId?: AgentId;
  matchReason?: string;
  confidence: 'high' | 'medium' | 'low';
  isBoundTo?: AgentId;
}

export interface DockerContainerStatus {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'exited' | 'created' | 'paused';
  state: string;
  created: string;
  ports: { hostPort: number; containerPort: number }[];
  agentType?: AgentId;
  cpuPercent: number;
  memoryMb: number;
}

export interface DockerSystemInfo {
  dockerAvailable: boolean;
  daemonVersion: string;
  operatingSystem: string;
  totalContainers: number;
  runningContainers: number;
  socketPath: string;
  environment: 'docker_desktop' | 'linux_native' | 'cloud_container' | 'mock_simulation';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  agentId: AgentId;
  content: string;
  timestamp: string;
  reasoningSteps?: string[];
  toolCalls?: {
    tool: string;
    args: Record<string, any>;
    result?: string;
  }[];
}

export type UpdateCategory = 'agent' | 'mcp' | 'skill';

export type UpdateStatus = 'up_to_date' | 'update_available' | 'checking' | 'updating' | 'error';

export interface VersionInfo {
  version: string;
  releaseDate: string;
  releaseNotes?: string;
  isLatest?: boolean;
  isCurrent?: boolean;
  channel?: 'stable' | 'beta' | 'nightly';
}

export interface SystemUpdateItem {
  id: string;
  name: string;
  category: UpdateCategory;
  targetId: string;
  currentVersion: string;
  latestVersion: string;
  availableVersions: VersionInfo[];
  status: UpdateStatus;
  lastChecked: string;
  description: string;
  packageOrImage: string;
  changelogSummary: string[];
  breakingChanges?: boolean;
  installCommand?: string;
  autoUpdateSupported?: boolean;
}

