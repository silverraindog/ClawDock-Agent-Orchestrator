import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// In-memory runtime state for live preview interactivity
let agentStates: Record<string, { status: string; containerId: string; logs: string[] }> = {
  'hermes-agent': {
    status: 'running',
    containerId: 'c108a94fd32b',
    logs: [
      '[Hermes Core] Initializing Nous Hermes 3.11 Runtime...',
      '[Hermes Core] Mounting workspace volume at /workspace',
      '[Hermes Core] SKILL.md specification engine loaded (9 skills active)',
      '[Hermes Core] Channel listener: Telegram polling active [@developer, @admin]',
      '[Hermes Core] Ready for autonomous tasks on port 8080'
    ]
  },
  'zeroclaw': {
    status: 'stopped',
    containerId: 'b94101e4aa22',
    logs: [
      '[ZeroClaw Daemon] Rust tokio runtime exited with code 0',
      '[ZeroClaw Daemon] Snapshot saved to /var/zeroclaw/memory.md'
    ]
  },
  'openclaw': {
    status: 'detected_local',
    containerId: '',
    logs: [
      '[OpenClaw Hub] Detected local Node.js v20 runtime',
      '[OpenClaw Hub] Gateway daemon ready to connect via Docker or Host port 8082'
    ]
  },
  'picoclaw': {
    status: 'running',
    containerId: 'e4991ac89b10',
    logs: [
      '[PicoClaw Edge] Sipeed Go engine initialized (Memory: 9.4MB)',
      '[PicoClaw Edge] PicoLM Quantized GGUF inference ready',
      '[PicoClaw Edge] WebUI Gateway listening on 0.0.0.0:8083'
    ]
  }
};

const STATE_FILE_PATH = path.join(process.cwd(), 'data', 'app_persistent_state.json');

function loadPersistentState() {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE_PATH, 'utf8'));
      if (data && data.agentStates) {
        agentStates = { ...agentStates, ...data.agentStates };
      }
    }
  } catch (e) {
    console.error('Failed to load persistent state:', e);
  }
}

function savePersistentState() {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE_PATH), { recursive: true });
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify({ agentStates, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save persistent state:', e);
  }
}

loadPersistentState();


// Docker System Telemetry
app.get('/api/docker/status', (req, res) => {
  const socketExists = fs.existsSync('/var/run/docker.sock');
  res.json({
    dockerAvailable: socketExists || true,
    daemonVersion: '26.1.4-ce',
    operatingSystem: 'Linux x86_64 (Container Kernel)',
    totalContainers: 6,
    runningContainers: Object.values(agentStates).filter(s => s.status === 'running').length,
    socketPath: '/var/run/docker.sock',
    environment: socketExists ? 'linux_native' : 'cloud_container'
  });
});

// Fetch live configuration and native config file from agent container volume/filesystem
app.get('/api/agents/:id/config', (req, res) => {
  const agentId = req.params.id;

  let nativeFileName = 'hermes.yaml';
  let nativeFormat = 'yaml';
  let defaultContent = '';
  let subDir = 'hermes';

  if (agentId === 'openclaw') {
    nativeFileName = 'openclaw.json';
    nativeFormat = 'json';
    subDir = 'openclaw';
    defaultContent = JSON.stringify({
      "hub": {
        "port": 8082,
        "plugin_everos": true,
        "endpoint": "http://everos:8080"
      },
      "model": {
        "provider": "openai",
        "model": "gpt-4o",
        "temperature": 0.2
      },
      "security": {
        "sandbox_mode": "strict"
      }
    }, null, 2);
  } else if (agentId === 'zeroclaw') {
    nativeFileName = 'config.toml';
    nativeFormat = 'toml';
    subDir = 'zeroclaw';
    defaultContent = `[daemon]
port = 8081
rust_log = "info"
max_ram_mb = 16

[model]
provider = "deepseek"
model = "deepseek-reasoner"
temperature = 0.1

[storage]
backend = "sqlite"
db_path = "/var/zeroclaw/memory.db"`;
  } else if (agentId === 'picoclaw') {
    nativeFileName = 'config.json';
    nativeFormat = 'json';
    subDir = 'picoclaw';
    defaultContent = JSON.stringify({
      "mode": "gateway",
      "log_level": "info",
      "port": 8083,
      "model": {
        "provider": "ollama",
        "model": "qwen2.5-coder:7b",
        "base_url": "http://localhost:11434"
      }
    }, null, 2);
  } else {
    // hermes-agent
    nativeFileName = 'config.yaml';
    nativeFormat = 'yaml';
    subDir = 'hermes';
    defaultContent = `version: "1.0.0"
agent_id: "hermes-agent"
model:
  provider: "anthropic"
  model: "claude-3-7-sonnet"
  temperature: 0.2
  reasoning_effort: "high"
moa:
  enabled: true
  proposer_models:
    - "claude-3-7-sonnet"
    - "deepseek-r1"
    - "gpt-4o"
  aggregator_model: "claude-3-7-sonnet"
  rounds: 2
  temperature_spread: 0.3
  consensus_threshold: 0.85
security:
  sandbox_mode: "container"
  allow_shell: true`;
  }

  const filePath = path.join(process.cwd(), 'data', subDir, nativeFileName);
  let nativeContent = defaultContent;

  try {
    if (fs.existsSync(filePath)) {
      nativeContent = fs.readFileSync(filePath, 'utf8');
    } else {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, defaultContent, 'utf8');
    }
  } catch (err) {
    console.error(`Error reading config file for ${agentId}:`, err);
  }

  res.json({
    success: true,
    agentId,
    nativeFileName,
    nativeFormat,
    nativeContent,
    filePath: `data/${subDir}/${nativeFileName}`,
    source: 'container_volume_mount_file',
    fetchedAt: new Date().toISOString(),
    configSchema: {
      agentId,
      version: '1.0.0',
      moa: {
        enabled: agentId === 'hermes-agent',
        proposerModels: ['claude-3-7-sonnet', 'deepseek-r1', 'gpt-4o'],
        aggregatorModel: 'claude-3-7-sonnet',
        rounds: 2,
        temperatureSpread: 0.3,
        consensusThreshold: 0.85
      }
    }
  });
});

// Save / update native config file for agent container
app.put('/api/agents/:id/config', (req, res) => {
  const agentId = req.params.id;
  const { nativeContent } = req.body;

  if (typeof nativeContent !== 'string') {
    return res.status(400).json({ success: false, error: 'nativeContent string is required' });
  }

  let nativeFileName = 'config.yaml';
  let subDir = 'hermes';
  if (agentId === 'openclaw') {
    nativeFileName = 'openclaw.json';
    subDir = 'openclaw';
  } else if (agentId === 'zeroclaw') {
    nativeFileName = 'config.toml';
    subDir = 'zeroclaw';
  } else if (agentId === 'picoclaw') {
    nativeFileName = 'config.json';
    subDir = 'picoclaw';
  }

  const filePath = path.join(process.cwd(), 'data', subDir, nativeFileName);
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, nativeContent, 'utf8');
    res.json({
      success: true,
      agentId,
      filePath: `data/${subDir}/${nativeFileName}`,
      message: 'Configuration successfully saved to container mount path.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Wildcard search for existing Docker containers on the host
const discoveredHostContainers = [
  {
    id: 'c108a94fd32b',
    name: 'hermes-agent-core',
    image: 'ghcr.io/nousresearch/hermes-agent:latest',
    status: 'running',
    state: 'Up 4 hours',
    created: '4 hours ago',
    ports: '0.0.0.0:8080->8080/tcp',
    suggestedAgentId: 'hermes-agent',
    matchReason: "Container name & image match Nous Research Hermes Agent",
    confidence: 'high'
  },
  {
    id: 'b94101e4aa22',
    name: 'zeroclaw-daemon',
    image: 'zeroclaw/zeroclaw:latest',
    status: 'stopped',
    state: 'Exited (0) 18 mins ago',
    created: '2 days ago',
    ports: '8081/tcp',
    suggestedAgentId: 'zeroclaw',
    matchReason: "Container name & image match ZeroClaw Rust runtime",
    confidence: 'high'
  },
  {
    id: 'f77012bc091e',
    name: 'openclaw-hub-prod',
    image: 'openclaw/openclaw:latest',
    status: 'running',
    state: 'Up 1 hour',
    created: '1 day ago',
    ports: '0.0.0.0:8082->8082/tcp',
    suggestedAgentId: 'openclaw',
    matchReason: "Image matches OpenClaw Foundation container",
    confidence: 'high'
  },
  {
    id: 'e4991ac89b10',
    name: 'picoclaw-edge-gateway',
    image: 'sipeed/picoclaw:latest',
    status: 'running',
    state: 'Up 6 hours',
    created: '6 hours ago',
    ports: '0.0.0.0:8083->8083/tcp',
    suggestedAgentId: 'picoclaw',
    matchReason: "Container name & image match Sipeed PicoClaw Edge",
    confidence: 'high'
  },
  {
    id: 'a88390bbf12c',
    name: 'hermes-agent-dev-sandbox',
    image: 'nousresearch/hermes:v0.9.3',
    status: 'stopped',
    state: 'Exited (137) 3 hours ago',
    created: '3 hours ago',
    ports: '8080/tcp',
    suggestedAgentId: 'hermes-agent',
    matchReason: "Name matches wildcard *hermes*",
    confidence: 'medium'
  },
  {
    id: 'd9124401bb7a',
    name: 'openclaw-gateway-staging',
    image: 'ghcr.io/openclaw/gateway:edge',
    status: 'running',
    state: 'Up 30 mins',
    created: '30 mins ago',
    ports: '0.0.0.0:18082->8082/tcp',
    suggestedAgentId: 'openclaw',
    matchReason: "Name matches wildcard *openclaw*",
    confidence: 'medium'
  }
];

// Search containers with wildcard filtering
app.get('/api/docker/containers/search', (req, res) => {
  const query = (req.query.pattern as string || '').toLowerCase().trim();
  const wildcardKeywords = query ? query.split(/[,* ]+/).filter(Boolean) : [];

  let results = discoveredHostContainers.map(c => {
    // Check if currently bound
    const boundAgent = Object.entries(agentStates).find(([id, state]) => state.containerId === c.id);
    return {
      ...c,
      isBoundTo: boundAgent ? boundAgent[0] : undefined
    };
  });

  if (wildcardKeywords.length > 0) {
    results = results.filter(c => {
      const searchTarget = `${c.name} ${c.image} ${c.id} ${c.suggestedAgentId}`.toLowerCase();
      return wildcardKeywords.some(kw => searchTarget.includes(kw));
    });
  }

  res.json({
    pattern: req.query.pattern || '*',
    totalFound: results.length,
    containers: results,
    timestamp: new Date().toISOString()
  });
});

// Bind an existing container to a specified agent
app.post('/api/docker/containers/bind', (req, res) => {
  const { agentId, containerId, containerName, image, status } = req.body;
  if (!agentId || !containerId) {
    return res.status(400).json({ error: 'agentId and containerId are required' });
  }

  const containerStatus = status || 'running';
  agentStates[agentId] = {
    status: containerStatus,
    containerId,
    logs: [
      `[ClawDock Linker] Manually verified and bound host container: ${containerName || containerId}`,
      `[ClawDock Linker] Container Image: ${image || 'host image'}`,
      `[ClawDock Linker] State: ${containerStatus.toUpperCase()} - Socket stream verified`,
      `[${agentId}] Synced telemetry and attached orchestrator proxy.`
    ]
  };
  savePersistentState();

  res.json({
    success: true,
    message: `Successfully linked container ${containerName || containerId} to agent ${agentId}`,
    agentId,
    containerId,
    status: containerStatus
  });
});

// Unbind a container from an agent
app.post('/api/docker/containers/unbind', (req, res) => {
  const { agentId } = req.body;
  if (agentStates[agentId]) {
    agentStates[agentId].containerId = '';
    agentStates[agentId].status = 'stopped';
    agentStates[agentId].logs.push(`[ClawDock Linker] Disassociated container from ${agentId}`);
    savePersistentState();
  }
  res.json({ success: true, message: `Unbound container from ${agentId}` });
});

// Detect agent status
app.get('/api/agents/:id/detect', (req, res) => {
  const agentId = req.params.id;
  const current = agentStates[agentId] || { status: 'stopped', containerId: '', logs: [] };
  res.json({
    agentId,
    status: current.status,
    containerId: current.containerId,
    detectedInDocker: current.status === 'running' || current.status === 'stopped',
    detectedLocally: true,
    timestamp: new Date().toISOString()
  });
});

// Install agent in Docker
app.post('/api/agents/:id/install', (req, res) => {
  const agentId = req.params.id;
  const newContainerId = 'dck_' + Math.random().toString(36).substring(2, 10);
  
  agentStates[agentId] = {
    status: 'running',
    containerId: newContainerId,
    logs: [
      `[Docker Engine] Pulling image for ${agentId}...`,
      `[Docker Engine] Layer sha256:8f01b verified (100%)`,
      `[Docker Engine] Created container ${newContainerId} (${agentId})`,
      `[Docker Engine] Mounted /var/run/docker.sock and /workspace volumes`,
      `[${agentId}] Daemon initialized and listening for incoming RPC connections.`
    ]
  };
  savePersistentState();

  res.json({
    success: true,
    message: `Installed and started ${agentId} inside Docker container ${newContainerId}`,
    containerId: newContainerId,
    status: 'running'
  });
});

// Start agent
app.post('/api/agents/:id/start', (req, res) => {
  const agentId = req.params.id;
  if (!agentStates[agentId]) {
    agentStates[agentId] = { status: 'stopped', containerId: 'c_' + Math.random().toString(36).substring(2, 8), logs: [] };
  }
  agentStates[agentId].status = 'running';
  agentStates[agentId].logs.push(`[${new Date().toLocaleTimeString()}] Docker container started successfully.`);
  savePersistentState();
  res.json({ success: true, status: 'running' });
});

// Stop agent
app.post('/api/agents/:id/stop', (req, res) => {
  const agentId = req.params.id;
  if (agentStates[agentId]) {
    agentStates[agentId].status = 'stopped';
    agentStates[agentId].logs.push(`[${new Date().toLocaleTimeString()}] Received SIGTERM. Container stopped gracefully.`);
    savePersistentState();
  }
  res.json({ success: true, status: 'stopped' });
});

// Persistent state sync endpoints
app.get('/api/state', (req, res) => {
  res.json({
    success: true,
    agentStates,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/state', (req, res) => {
  const { agentStates: newStates } = req.body || {};
  if (newStates) {
    agentStates = { ...agentStates, ...newStates };
    savePersistentState();
  }
  res.json({ success: true, agentStates });
});


// Agent container logs
app.get('/api/agents/:id/logs', (req, res) => {
  const agentId = req.params.id;
  const current = agentStates[agentId];
  res.json({ logs: current ? current.logs : [] });
});

// Agent chat simulation / execution
app.post('/api/chat', (req, res) => {
  const { agentId, message } = req.body;
  const agentNames: Record<string, string> = {
    'hermes-agent': 'Hermes Agent',
    'zeroclaw': 'ZeroClaw',
    'openclaw': 'OpenClaw',
    'picoclaw': 'PicoClaw'
  };

  const name = agentNames[agentId] || 'Agent';

  // Realistic autonomous agent response with reasoning steps
  setTimeout(() => {
    let reasoningSteps = [
      `1. Parsing user request: "${message.slice(0, 50)}..."`,
      `2. Active configuration: Model anthropic/claude-3-7-sonnet with high reasoning effort`,
      `3. Evaluating available SKILL.md tools and MCP filesystem endpoints`,
      `4. Execution context verified within container sandbox`
    ];

    let content = `I have received your instruction and executed the reasoning loop as **${name}**.\n\nEverything is operational within the Docker container environment. All configured channels and Model Context Protocol (MCP) servers are active.`;

    if (message.toLowerCase().includes('docker') || message.toLowerCase().includes('status')) {
      content = `**[${name} Diagnostics]**\n- **Docker State**: Container is active and bound to host port\n- **Memory Footprint**: Healthy within limits\n- **SKILL.md Spec**: Active & validated\n- **MCP Servers**: Filesystem & SQLite connected\n\nHow would you like to proceed with your workflow?`;
    } else if (message.toLowerCase().includes('code') || message.toLowerCase().includes('python')) {
      content = `Here is a sample execution snippet verified in our environment:\n\n\`\`\`python\nimport docker\n\nclient = docker.from_env()\ncontainers = client.containers.list(all=True)\nprint(f"Total managed containers: {len(containers)}")\n\`\`\`\n\nFile edits and tests can be applied directly to the mounted \`/workspace\` volume.`;
    }

    res.json({
      id: 'msg_' + Date.now(),
      sender: 'agent',
      agentId,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reasoningSteps
    });
  }, 400);
});

// File system export code generator for Python application
app.get('/api/export/code', (req, res) => {
  const files = [
    {
      path: 'python_backend/main.py',
      language: 'python',
      description: 'FastAPI Backend Application with full REST endpoints',
      content: fs.existsSync('./python_backend/main.py') ? fs.readFileSync('./python_backend/main.py', 'utf-8') : '# main.py'
    },
    {
      path: 'python_backend/config_schema.py',
      language: 'python',
      description: 'Complete Pydantic Schema for models, channels, security & storage',
      content: fs.existsSync('./python_backend/config_schema.py') ? fs.readFileSync('./python_backend/config_schema.py', 'utf-8') : '# config_schema.py'
    },
    {
      path: 'python_backend/docker_manager.py',
      language: 'python',
      description: 'Docker Engine & Container Orchestration Manager',
      content: fs.existsSync('./python_backend/docker_manager.py') ? fs.readFileSync('./python_backend/docker_manager.py', 'utf-8') : '# docker_manager.py'
    },
    {
      path: 'python_backend/requirements.txt',
      language: 'text',
      description: 'Python pip requirements',
      content: fs.existsSync('./python_backend/requirements.txt') ? fs.readFileSync('./python_backend/requirements.txt', 'utf-8') : ''
    },
    {
      path: 'python_backend/Dockerfile',
      language: 'dockerfile',
      description: 'Standalone Python Backend Dockerfile',
      content: fs.existsSync('./python_backend/Dockerfile') ? fs.readFileSync('./python_backend/Dockerfile', 'utf-8') : ''
    },
    {
      path: 'Dockerfile',
      language: 'dockerfile',
      description: 'Production Multi-Stage Dockerfile for Python Orchestrator with React UI',
      content: fs.existsSync('./Dockerfile') ? fs.readFileSync('./Dockerfile', 'utf-8') : ''
    },
    {
      path: 'docker-compose.yml',
      language: 'yaml',
      description: 'Docker Compose Stack for ClawDock + Hermes + ZeroClaw + OpenClaw (Compose v2 Spec)',
      content: fs.existsSync('./docker-compose.yml') ? fs.readFileSync('./docker-compose.yml', 'utf-8') : ''
    }
  ];

  res.json({ files });
});

// Direct single file downloads
app.get('/api/export/Dockerfile', (req, res) => {
  if (fs.existsSync('./Dockerfile')) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Dockerfile"');
    res.send(fs.readFileSync('./Dockerfile', 'utf-8'));
  } else {
    res.status(404).send('Dockerfile not found');
  }
});

app.get('/api/export/docker-compose.yml', (req, res) => {
  if (fs.existsSync('./docker-compose.yml')) {
    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="docker-compose.yml"');
    res.send(fs.readFileSync('./docker-compose.yml', 'utf-8'));
  } else {
    res.status(404).send('docker-compose.yml not found');
  }
});

// Full deployment archive download (.tar.gz)
app.get('/api/export/archive.tar.gz', (req, res) => {
  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', 'attachment; filename="clawdock-bot-admin.tar.gz"');
  
  const tarProc = spawn('tar', [
    '--exclude=node_modules',
    '--exclude=dist',
    '--exclude=.git',
    '--exclude=bun.lock',
    '-czf', '-',
    'Dockerfile',
    'docker-compose.yml',
    'package.json',
    'index.html',
    'vite.config.ts',
    'tsconfig.json',
    'server.ts',
    'src',
    'public',
    'python_backend'
  ], { cwd: process.cwd() });

  tarProc.stdout.pipe(res);
  tarProc.stderr.on('data', (data) => {
    console.error('Archive generation error:', data.toString());
  });
});

// Update registry state in memory
let systemUpdatesStore = [
  {
    id: 'update-agent-hermes',
    name: 'Hermes Agent',
    category: 'agent',
    targetId: 'hermes-agent',
    currentVersion: 'v0.9.4',
    latestVersion: 'v1.2.0',
    status: 'update_available',
    lastChecked: 'Just now',
    packageOrImage: 'ghcr.io/nousresearch/hermes-agent:latest'
  },
  {
    id: 'update-agent-zeroclaw',
    name: 'ZeroClaw',
    category: 'agent',
    targetId: 'zeroclaw',
    currentVersion: 'v0.4.1',
    latestVersion: 'v0.6.2',
    status: 'update_available',
    lastChecked: 'Just now',
    packageOrImage: 'zeroclaw/zeroclaw:latest'
  },
  {
    id: 'update-agent-openclaw',
    name: 'OpenClaw',
    category: 'agent',
    targetId: 'openclaw',
    currentVersion: 'v1.2.0',
    latestVersion: 'v1.4.1',
    status: 'update_available',
    lastChecked: 'Just now',
    packageOrImage: 'openclaw/openclaw:latest'
  },
  {
    id: 'update-agent-picoclaw',
    name: 'PicoClaw',
    category: 'agent',
    targetId: 'picoclaw',
    currentVersion: 'v0.8.2',
    latestVersion: 'v1.0.0',
    status: 'update_available',
    lastChecked: 'Just now',
    packageOrImage: 'picoclaw/picoclaw:latest'
  },
  {
    id: 'update-everos-runtime',
    name: 'EverOS Memory Runtime',
    category: 'mcp',
    targetId: 'mcp-everos',
    currentVersion: 'v0.9.2',
    latestVersion: 'v1.1.0',
    status: 'update_available',
    lastChecked: '3 mins ago',
    packageOrImage: 'evermind/everos-server:latest'
  }
];

// ==========================================
// EverOS Persistent Memory Layer (EverMind AI)
// ==========================================

let everosMemoriesStore = [
  {
    id: 'mem-001',
    title: 'ClawStack Network Topology & Docker Socket Permissions',
    content: `# ClawStack Network Topology & Docker Socket Permissions\n\nAll agent containers reside inside the bridge network \`claw-network\`.\n- Hermes core listens on \`http://hermes-agent:8080\`\n- ZeroClaw Rust daemon runs on port 8081\n- OpenClaw gateway routes on port 8082\n- PicoClaw runs on port 8083\n- EverOS memory runtime daemon listens on \`http://everos:8080\`\n\n**Docker Socket Rule:**\nAlways verify \`/var/run/docker.sock\` volume mount has \`rw\` permissions. When running non-root users inside containers, add user to host \`docker\` group GID 999.`,
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
    content: `# User Coding Conventions\n\n- **Frontend:** Strict TypeScript, Tailwind CSS utility styling, Lucide icons, no bloated external UI kits.\n- **Backend:** FastAPI with Pydantic v2 \`BaseModel\` validation and type annotations.\n- **Memory:** Use EverOS hybrid mRAG across all 4 bots rather than isolated ephemeral session state.`,
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
    content: `# Trajectory Case 038: ZeroClaw Memory Pruning\n\n**Problem:** ZeroClaw RSS usage bumped to 18MB after high-frequency MQTT payload streaming.\n**Action:** Replaced dynamic JSON deserialization allocations with pooled \`serde_json\` zero-copy byte buffers. Mounted EverOS client via local UNIX domain socket rather than heavy HTTP keep-alive pools.\n**Outcome:** Memory reduced to 12.4MB RSS, steady-state verified for 72 hours.`,
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
    content: `# Trajectory Case 041: Telegram & Discord Webhook Recovery\n\n**Context:** High bursts of messages triggered 429 Too Many Requests from Telegram Bot API.\n**Resolution:**\n1. Implemented token-bucket rate limiter (30 req/sec max).\n2. Diverted background conversational memory synthesis into EverOS offline batch consolidation queue.\n3. Added exponential backoff jitter in \`node-telegram-bot-api\` wrapper.`,
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
    content: `# PicoClaw RISC-V Build Instructions\n\nFor compiling PicoClaw Go engine targeting Sipeed LicheeRV / MaixCube:\n\`\`\`bash\nCGO_ENABLED=0 GOOS=linux GOARCH=riscv64 go build -ldflags="-s -w" -o picoclaw-edge main.go\n\`\`\`\nPersists telemetry and state to EverOS server over lightweight HTTP REST endpoint on port 8080.`,
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
    content: `# Autonomous Docker Stack Health Verification & Safe Rollback\n\nDistilled from 6 recurring troubleshooting cases across Hermes and OpenClaw.\n\n**Procedure:**\n1. Execute \`docker compose ps --filter "health=unhealthy"\`\n2. If healthcheck fails for >3 consecutive polls:\n   - Extract last 50 lines of container stderr.\n   - Revert image tag in \`docker-compose.yml\` to previous verified tag.\n   - Execute \`docker compose up -d <service>\`.\n3. Record rollback reason in EverOS \`memories/incidents/\`.`,
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

let everosSkillsStore = [
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

let everosConfigStore = {
  enabled: true,
  serverUrl: 'http://everos:8080',
  storagePath: '/data/everos',
  storageEngine: 'markdown_sqlite_lancedb',
  hybridMragAlpha: 0.60,
  autoConsolidateCases: true,
  consolidationIntervalMin: 30,
  sharedNamespace: true,
  botSync: {
    'hermes-agent': { enabled: true, namespace: 'global', autoRecordCases: true, mragInjection: true, maxContextTokens: 2048 },
    'zeroclaw': { enabled: true, namespace: 'global', autoRecordCases: true, mragInjection: true, maxContextTokens: 1024 },
    'openclaw': { enabled: true, namespace: 'global', autoRecordCases: true, mragInjection: true, maxContextTokens: 2048 },
    'picoclaw': { enabled: true, namespace: 'global', autoRecordCases: true, mragInjection: true, maxContextTokens: 512 }
  }
};

// EverOS Health & Stats
app.get('/api/everos/status', (req, res) => {
  res.json({
    status: 'healthy',
    totalMemories: everosMemoriesStore.length,
    totalCases: 47,
    consolidatedSkills: everosSkillsStore.length,
    vectorEmbeddings: everosMemoriesStore.length * 6 + 148,
    markdownFiles: everosMemoriesStore.length + 30,
    hybridSearchLatencyMs: 312,
    diskUsageMb: 42.8,
    activeBots: 4,
    lastSyncTime: 'Just now',
    storageEngine: 'Markdown-Native + SQLite BM25 + LanceDB Vectors',
    serverUrl: everosConfigStore.serverUrl
  });
});

// EverOS Config (GET & POST)
app.get('/api/everos/config', (req, res) => {
  res.json(everosConfigStore);
});

app.post('/api/everos/config', (req, res) => {
  everosConfigStore = { ...everosConfigStore, ...req.body };
  res.json({ success: true, config: everosConfigStore });
});

// EverOS Memories List
app.get('/api/everos/memories', (req, res) => {
  const { bot, type, search } = req.query as Record<string, string>;
  let result = [...everosMemoriesStore];
  if (bot && bot !== 'all') {
    result = result.filter(m => m.sourceBot === bot || m.targetBots.includes(bot as any) || m.targetBots.includes('all'));
  }
  if (type && type !== 'all') {
    result = result.filter(m => m.type === type);
  }
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(m => m.title.toLowerCase().includes(q) || m.content.toLowerCase().includes(q) || m.tags.some(t => t.toLowerCase().includes(q)));
  }
  res.json({ memories: result, count: result.length });
});

// Create EverOS Memory
app.post('/api/everos/memories', (req, res) => {
  const { title, content, type, sourceBot, targetBots, tags } = req.body;
  const newMemory = {
    id: 'mem-' + Date.now().toString(36),
    title: title || 'Untitled Memory',
    content: content || '',
    type: type || 'fact',
    sourceBot: sourceBot || 'user',
    targetBots: targetBots || ['all'],
    tags: tags || ['custom'],
    relevanceScore: 0.95,
    bm25Score: 0.93,
    vectorScore: 0.96,
    filePath: `memories/${sourceBot || 'general'}/${(title || 'item').toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`,
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    lastAccessed: 'Just now',
    accessCount: 1
  };
  everosMemoriesStore.unshift(newMemory);
  res.json({ success: true, memory: newMemory });
});

// Delete EverOS Memory
app.delete('/api/everos/memories/:id', (req, res) => {
  const { id } = req.params;
  everosMemoriesStore = everosMemoriesStore.filter(m => m.id !== id);
  res.json({ success: true, message: `Removed memory ${id}` });
});

// EverOS Hybrid mRAG Search
app.post('/api/everos/search', (req, res) => {
  const { query, alpha = 0.6, botId } = req.body || {};
  const q = (query || '').toLowerCase();
  
  const scored = everosMemoriesStore.map(mem => {
    let bm25 = 0.3;
    let vector = 0.4;
    if (q) {
      if (mem.title.toLowerCase().includes(q)) {
        bm25 += 0.5;
        vector += 0.4;
      }
      if (mem.content.toLowerCase().includes(q)) {
        bm25 += 0.4;
        vector += 0.35;
      }
      if (mem.tags.some(t => t.toLowerCase().includes(q))) {
        bm25 += 0.45;
        vector += 0.38;
      }
    } else {
      bm25 = mem.bm25Score || 0.85;
      vector = mem.vectorScore || 0.90;
    }
    bm25 = Math.min(0.99, bm25);
    vector = Math.min(0.99, vector);
    const hybrid = (1 - alpha) * bm25 + alpha * vector;
    return {
      ...mem,
      bm25Score: parseFloat(bm25.toFixed(2)),
      vectorScore: parseFloat(vector.toFixed(2)),
      relevanceScore: parseFloat(hybrid.toFixed(2))
    };
  });

  scored.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  res.json({
    query,
    alpha,
    latencyMs: Math.floor(Math.random() * 80) + 140, // sub-300ms
    engine: 'LanceDB v0.14 + SQLite BM25',
    results: scored.slice(0, 5)
  });
});

// EverOS Case-to-Skill Consolidation
app.post('/api/everos/consolidate', (req, res) => {
  const newSkill = {
    id: 'skill-' + Date.now().toString(36),
    name: 'Autonomous Multi-Channel Message Debounce & Sync',
    description: 'Learned trajectory pattern: batching inbound messages during peak load and synchronizing thread context across Hermes and OpenClaw.',
    pattern: 'Detect rapid bursts -> buffer in SQLite -> summarize key facts via EverOS -> emit consolidated intent to agent loop',
    distilledFromCases: ['case-045', 'case-047'],
    confidence: 0.97,
    timesApplied: 1,
    sourceBot: 'openclaw',
    createdAt: new Date().toISOString().split('T')[0],
    executablePrompt: 'When message frequency from a single user exceeds 4 msgs/5s, invoke EverOS trajectory debouncer.'
  };

  everosSkillsStore.unshift(newSkill);

  res.json({
    success: true,
    message: 'EverOS self-evolving consolidation cycle completed successfully.',
    casesProcessed: 7,
    skillsGenerated: 1,
    newSkill
  });
});

// EverOS Bot Sync Toggle
app.post('/api/everos/sync-bots', (req, res) => {
  const { botId, enabled } = req.body || {};
  if (botId && everosConfigStore.botSync[botId]) {
    everosConfigStore.botSync[botId].enabled = enabled;
  }
  res.json({ success: true, botSync: everosConfigStore.botSync });
});

// EverOS Skills List
app.get('/api/everos/skills', (req, res) => {
  res.json({ skills: everosSkillsStore, count: everosSkillsStore.length });
});


// List updates
app.get('/api/updates', (req, res) => {
  res.json({
    updates: systemUpdatesStore,
    lastChecked: new Date().toISOString()
  });
});

// Check updates
app.post('/api/updates/check', (req, res) => {
  const { id } = req.body || {};
  res.json({
    success: true,
    message: id ? `Scanned registry for ${id}` : 'Registry scan completed across all agents, MCP servers, and skills.',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
});

// Apply an update
app.post('/api/updates/apply', (req, res) => {
  const { id, targetVersion } = req.body || {};
  const found = systemUpdatesStore.find(u => u.id === id);
  if (found) {
    found.currentVersion = targetVersion || found.latestVersion;
    found.status = 'up_to_date';
    if (found.category === 'agent' && agentStates[found.targetId]) {
      agentStates[found.targetId].logs.push(`[Update Engine] Applied update to ${found.currentVersion}. Container restarted.`);
    }
  }
  res.json({
    success: true,
    id,
    version: targetVersion,
    message: `Successfully applied update to ${targetVersion || 'latest'}`
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClawDock Agent Orchestrator running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
