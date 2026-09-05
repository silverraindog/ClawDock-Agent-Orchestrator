import { 
  EverOSConfig, 
  EverOSMemoryItem, 
  EverOSSkillItem, 
  EverOSStats,
  AgentTaskItem,
  MemoryTaskRelationship
} from '../types';

export const DEFAULT_EVEROS_CONFIG: EverOSConfig = {
  enabled: true,
  serverUrl: 'http://everos:8080',
  storagePath: '/data/everos',
  storageEngine: 'markdown_sqlite_lancedb',
  hybridMragAlpha: 0.60,
  autoConsolidateCases: true,
  consolidationIntervalMin: 30,
  sharedNamespace: true,
  botSync: {
    'hermes-agent': {
      enabled: true,
      namespace: 'global',
      autoRecordCases: true,
      mragInjection: true,
      maxContextTokens: 2048
    },
    'zeroclaw': {
      enabled: true,
      namespace: 'global',
      autoRecordCases: true,
      mragInjection: true,
      maxContextTokens: 1024
    },
    'openclaw': {
      enabled: true,
      namespace: 'global',
      autoRecordCases: true,
      mragInjection: true,
      maxContextTokens: 2048
    },
    'picoclaw': {
      enabled: true,
      namespace: 'global',
      autoRecordCases: true,
      mragInjection: true,
      maxContextTokens: 512
    }
  }
};

export const INITIAL_EVEROS_STATS: EverOSStats = {
  status: 'healthy',
  totalMemories: 28,
  totalCases: 47,
  consolidatedSkills: 8,
  vectorEmbeddings: 184,
  markdownFiles: 36,
  hybridSearchLatencyMs: 312,
  diskUsageMb: 42.8,
  activeBots: 4,
  lastSyncTime: 'Just now'
};

export const INITIAL_EVEROS_MEMORIES: EverOSMemoryItem[] = [
  {
    id: 'mem-001',
    title: 'ClawStack Network Topology & Docker Socket Permissions',
    content: `# ClawStack Network Topology & Docker Socket Permissions

All agent containers reside inside the bridge network \`claw-network\`.
- Hermes core listens on \`http://hermes-agent:8080\`
- ZeroClaw Rust daemon runs on port 8081
- OpenClaw gateway routes on port 8082
- PicoClaw runs on port 8083
- EverOS memory runtime daemon listens on \`http://everos:8080\`

**Docker Socket Rule:**
Always verify \`/var/run/docker.sock\` volume mount has \`rw\` permissions. When running non-root users inside containers, add user to host \`docker\` group GID 999.`,
    type: 'fact',
    sourceBot: 'hermes-agent',
    targetBots: ['all'],
    tags: ['docker', 'networking', 'security', 'topology'],
    relevanceScore: 0.96,
    bm25Score: 0.94,
    vectorScore: 0.98,
    filePath: 'memories/infrastructure/docker-topology.md',
    createdAt: '2026-09-02 14:20',
    lastAccessed: 'Just now',
    accessCount: 42
  },
  {
    id: 'mem-002',
    title: 'User Coding Preference: Modular TypeScript & Pydantic v2',
    content: `# User Coding Conventions

- **Frontend:** Strict TypeScript, Tailwind CSS utility styling, Lucide icons, no bloated external UI kits.
- **Backend:** FastAPI with Pydantic v2 \`BaseModel\` validation and type annotations.
- **Memory:** Use EverOS hybrid mRAG across all 4 bots rather than isolated ephemeral session state.`,
    type: 'preference',
    sourceBot: 'user',
    targetBots: ['all'],
    tags: ['preferences', 'typescript', 'fastapi', 'styleguide'],
    relevanceScore: 0.93,
    bm25Score: 0.91,
    vectorScore: 0.95,
    filePath: 'memories/preferences/user-styleguide.md',
    createdAt: '2026-09-01 09:15',
    lastAccessed: '12 mins ago',
    accessCount: 89
  },
  {
    id: 'mem-003',
    title: 'Case 038: ZeroClaw Edge Memory Optimization Under 15MB',
    content: `# Trajectory Case 038: ZeroClaw Memory Pruning

**Problem:** ZeroClaw RSS usage bumped to 18MB after high-frequency MQTT payload streaming.
**Action:** Replaced dynamic JSON deserialization allocations with pooled \`serde_json\` zero-copy byte buffers. Mounted EverOS client via local UNIX domain socket rather than heavy HTTP keep-alive pools.
**Outcome:** Memory reduced to 12.4MB RSS, steady-state verified for 72 hours.`,
    type: 'case',
    sourceBot: 'zeroclaw',
    targetBots: ['zeroclaw', 'picoclaw'],
    tags: ['rust', 'memory-tuning', 'edge', 'trajectory'],
    relevanceScore: 0.88,
    bm25Score: 0.85,
    vectorScore: 0.91,
    filePath: 'memories/zeroclaw/cases/case_038_memory_tuning.md',
    createdAt: '2026-09-03 16:40',
    lastAccessed: '1 hour ago',
    accessCount: 15
  },
  {
    id: 'mem-004',
    title: 'Case 041: OpenClaw Multi-Channel Webhook Rate-Limit Recovery',
    content: `# Trajectory Case 041: Telegram & Discord Webhook Recovery

**Context:** High bursts of messages triggered 429 Too Many Requests from Telegram Bot API.
**Resolution:**
1. Implemented token-bucket rate limiter (30 req/sec max).
2. Diverted background conversational memory synthesis into EverOS offline batch consolidation queue.
3. Added exponential backoff jitter in \`node-telegram-bot-api\` wrapper.`,
    type: 'case',
    sourceBot: 'openclaw',
    targetBots: ['openclaw', 'hermes-agent'],
    tags: ['telegram', 'webhooks', 'rate-limit', 'trajectory'],
    relevanceScore: 0.89,
    bm25Score: 0.87,
    vectorScore: 0.92,
    filePath: 'memories/openclaw/cases/case_041_ratelimits.md',
    createdAt: '2026-09-03 19:10',
    lastAccessed: '35 mins ago',
    accessCount: 23
  },
  {
    id: 'mem-005',
    title: 'PicoClaw Sipeed RISC-V Cross-Compilation Flags',
    content: `# PicoClaw RISC-V Build Instructions

For compiling PicoClaw Go engine targeting Sipeed LicheeRV / MaixCube:
\`\`\`bash
CGO_ENABLED=0 GOOS=linux GOARCH=riscv64 go build -ldflags="-s -w" -o picoclaw-edge main.go
\`\`\`
Persists telemetry and state to EverOS server over lightweight HTTP REST endpoint on port 8080.`,
    type: 'code_snippet',
    sourceBot: 'picoclaw',
    targetBots: ['picoclaw', 'zeroclaw'],
    tags: ['go', 'riscv', 'sipeed', 'embedded', 'cross-compile'],
    relevanceScore: 0.84,
    bm25Score: 0.81,
    vectorScore: 0.87,
    filePath: 'memories/picoclaw/snippets/riscv-build.md',
    createdAt: '2026-09-02 22:05',
    lastAccessed: '3 hours ago',
    accessCount: 9
  },
  {
    id: 'mem-006',
    title: 'Consolidated Skill: Autonomous Docker Stack Rollback',
    content: `# Autonomous Docker Stack Health Verification & Safe Rollback

Distilled from 6 recurring troubleshooting cases across Hermes and OpenClaw.

**Procedure:**
1. Execute \`docker compose ps --filter "health=unhealthy"\`
2. If healthcheck fails for >3 consecutive polls:
   - Extract last 50 lines of container stderr.
   - Revert image tag in \`docker-compose.yml\` to previous verified tag.
   - Execute \`docker compose up -d <service>\`.
3. Record rollback reason in EverOS \`memories/incidents/\`.`,
    type: 'skill',
    sourceBot: 'hermes-agent',
    targetBots: ['all'],
    tags: ['skill', 'docker', 'devops', 'self-healing'],
    relevanceScore: 0.95,
    bm25Score: 0.93,
    vectorScore: 0.97,
    filePath: 'skills/distilled/autonomous-docker-rollback.md',
    createdAt: '2026-09-04 11:30',
    lastAccessed: '18 mins ago',
    accessCount: 31
  }
];

export const INITIAL_EVEROS_SKILLS: EverOSSkillItem[] = [
  {
    id: 'skill-01',
    name: 'Autonomous Docker Stack Rollback',
    description: 'Diagnoses unhealthy containers, captures logs, and orchestrates zero-downtime rollback to last stable tag.',
    pattern: 'Unhealthy healthcheck polling -> capture stderr -> rollback tag -> emit EverOS incident log',
    distilledFromCases: ['case-012', 'case-019', 'case-027', 'case-033'],
    confidence: 0.96,
    timesApplied: 14,
    sourceBot: 'hermes-agent',
    createdAt: '2026-09-04',
    executablePrompt: 'When container healthcheck status transitions to unhealthy for 3 intervals, trigger safe rollback protocol.'
  },
  {
    id: 'skill-02',
    name: 'Multi-Channel Telegram/Discord Rate Limiter Jitter',
    description: 'Intercepts burst traffic across Telegram and Discord gateways and schedules exponential jitter.',
    pattern: '429 detection -> token bucket throttling -> decouple EverOS offline consolidation -> retry with jitter',
    distilledFromCases: ['case-039', 'case-041'],
    confidence: 0.92,
    timesApplied: 28,
    sourceBot: 'openclaw',
    createdAt: '2026-09-03',
    executablePrompt: 'Apply token-bucket smoothing when webhook requests exceed 25 events per second.'
  },
  {
    id: 'skill-03',
    name: 'Rust Edge Memory Buffer Recycling',
    description: 'Reclaims dynamic allocations on ZeroClaw to guarantee steady sub-15MB RAM operation on edge boards.',
    pattern: 'Buffer reuse -> zero-copy serde deserialization -> UNIX socket EverOS transmission',
    distilledFromCases: ['case-024', 'case-038'],
    confidence: 0.94,
    timesApplied: 9,
    sourceBot: 'zeroclaw',
    createdAt: '2026-09-03',
    executablePrompt: 'Enforce zero-copy deserialization for high-throughput sensor telemetry pipelines.'
  },
  {
    id: 'skill-04',
    name: 'Cross-Bot Context Synchronization Protocol',
    description: 'Automatically synchronizes problem-solving breakthroughs made by Hermes to ZeroClaw and OpenClaw via EverOS mRAG.',
    pattern: 'Hermes marks solution verified -> EverOS generates LanceDB vector embedding -> broadcasts sync signal to active bots',
    distilledFromCases: ['case-015', 'case-022', 'case-044'],
    confidence: 0.98,
    timesApplied: 62,
    sourceBot: 'hermes-agent',
    createdAt: '2026-09-04',
    executablePrompt: 'Broadcast newly verified architectural patterns across all active bots in claw-network.'
  }
];

export const INITIAL_AGENT_TASKS: AgentTaskItem[] = [
  {
    id: 'task-hermes-01',
    title: 'Container Stack Healthcheck & Safe Rollback',
    description: 'Autonomous health verification polling and container stderr telemetry inspection across all docker containers.',
    agentId: 'hermes-agent',
    status: 'running',
    category: 'devops',
    startedAt: '15m ago',
    priority: 'high'
  },
  {
    id: 'task-hermes-02',
    title: 'Docker Socket & GID 999 Permissions Auditor',
    description: 'Enforces non-root container isolation, unix socket rw rights, and bridge network security isolation.',
    agentId: 'hermes-agent',
    status: 'active',
    category: 'security',
    startedAt: '32m ago',
    priority: 'medium'
  },
  {
    id: 'task-zeroclaw-01',
    title: 'MQTT Sensor Stream Ingest & Sub-15MB RSS Pruner',
    description: 'High-frequency telemetry buffering with zero-copy serde deserialization and dynamic memory compaction.',
    agentId: 'zeroclaw',
    status: 'running',
    category: 'edge',
    startedAt: '1h ago',
    priority: 'high'
  },
  {
    id: 'task-zeroclaw-02',
    title: 'Zero-Copy UNIX Socket EverOS Memory Pipeline',
    description: 'Streams binary trajectory snapshots over local domain sockets to bypass HTTP connection pool overhead.',
    agentId: 'zeroclaw',
    status: 'active',
    category: 'memory',
    startedAt: '45m ago',
    priority: 'high'
  },
  {
    id: 'task-openclaw-01',
    title: 'Multi-Channel Telegram / Discord Rate Limit Jitter',
    description: 'Token-bucket queue management, webhook backoff scheduling, and message payload deduplication.',
    agentId: 'openclaw',
    status: 'running',
    category: 'messaging',
    startedAt: '22m ago',
    priority: 'high'
  },
  {
    id: 'task-openclaw-02',
    title: 'TypeScript Schema Validation & Pydantic v2 Bridge',
    description: 'Type-safe contract enforcement and real-time JSON schema serialization for agent tool calling.',
    agentId: 'openclaw',
    status: 'active',
    category: 'coding',
    startedAt: '10m ago',
    priority: 'medium'
  },
  {
    id: 'task-picoclaw-01',
    title: 'Sipeed RISC-V Edge Telemetry & PicoLM Inference',
    description: 'Quantized on-device lightweight reasoning and low-power telemetry syncing over HTTP REST.',
    agentId: 'picoclaw',
    status: 'running',
    category: 'edge',
    startedAt: '2h ago',
    priority: 'medium'
  },
  {
    id: 'task-everos-01',
    title: 'Cross-Agent Memory Matrix Consolidation & LanceDB Indexing',
    description: 'Performs background BM25 keyword re-indexing and LanceDB 384-dim dense vector embedding updates.',
    agentId: 'everos-daemon',
    status: 'running',
    category: 'memory',
    startedAt: '5m ago',
    priority: 'high'
  }
];

export const INITIAL_MEMORY_TASK_RELATIONSHIPS: MemoryTaskRelationship[] = [
  {
    id: 'rel-01',
    memoryId: 'mem-001',
    taskId: 'task-hermes-02',
    weight: 0.98,
    reason: 'Direct topology & socket permission rules enforced during container permission audits',
    accessFrequency: 42,
    lastReinforced: '2m ago'
  },
  {
    id: 'rel-02',
    memoryId: 'mem-001',
    taskId: 'task-hermes-01',
    weight: 0.89,
    reason: 'Bridge network port mapping referenced during healthcheck port probes',
    accessFrequency: 38,
    lastReinforced: '5m ago'
  },
  {
    id: 'rel-03',
    memoryId: 'mem-006',
    taskId: 'task-hermes-01',
    weight: 0.96,
    reason: 'Execution blueprint for 3-strike unhealthy container rollback',
    accessFrequency: 54,
    lastReinforced: '1m ago'
  },
  {
    id: 'rel-04',
    memoryId: 'mem-002',
    taskId: 'task-openclaw-02',
    weight: 0.94,
    reason: 'Pydantic v2 & TypeScript conventions strictly enforced on tool schemas',
    accessFrequency: 89,
    lastReinforced: '8m ago'
  },
  {
    id: 'rel-05',
    memoryId: 'mem-003',
    taskId: 'task-zeroclaw-01',
    weight: 0.95,
    reason: 'Zero-copy serde memory recycling technique applied to MQTT payloads',
    accessFrequency: 31,
    lastReinforced: '4m ago'
  },
  {
    id: 'rel-06',
    memoryId: 'mem-003',
    taskId: 'task-zeroclaw-02',
    weight: 0.91,
    reason: 'UNIX domain socket buffer allocation parameters and steady-state guidelines',
    accessFrequency: 27,
    lastReinforced: '12m ago'
  },
  {
    id: 'rel-07',
    memoryId: 'mem-004',
    taskId: 'task-openclaw-01',
    weight: 0.93,
    reason: 'Token-bucket rate limit algorithm & Telegram 429 jitter backoff pattern',
    accessFrequency: 48,
    lastReinforced: '3m ago'
  },
  {
    id: 'rel-08',
    memoryId: 'mem-005',
    taskId: 'task-picoclaw-01',
    weight: 0.92,
    reason: 'RISC-V build flags and EverOS REST transmission specification for Sipeed edge boards',
    accessFrequency: 19,
    lastReinforced: '15m ago'
  },
  {
    id: 'rel-09',
    memoryId: 'mem-002',
    taskId: 'task-everos-01',
    weight: 0.78,
    reason: 'User preference guidelines referenced for markdown memory storage structure',
    accessFrequency: 22,
    lastReinforced: '25m ago'
  },
  {
    id: 'rel-10',
    memoryId: 'mem-001',
    taskId: 'task-everos-01',
    weight: 0.85,
    reason: 'EverOS daemon port 8080 binding and volume mount mapping',
    accessFrequency: 35,
    lastReinforced: '18m ago'
  },
  {
    id: 'rel-11',
    memoryId: 'mem-004',
    taskId: 'task-everos-01',
    weight: 0.74,
    reason: 'Offline batch consolidation queue used to buffer high-burst conversational traces',
    accessFrequency: 16,
    lastReinforced: '30m ago'
  },
  {
    id: 'rel-12',
    memoryId: 'mem-005',
    taskId: 'task-zeroclaw-01',
    weight: 0.65,
    reason: 'Cross-edge memory sharing between Sipeed RISC-V and Rust Tokio runtimes',
    accessFrequency: 11,
    lastReinforced: '45m ago'
  }
];
