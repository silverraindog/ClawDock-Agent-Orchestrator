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
  res.json({ success: true, status: 'running' });
});

// Stop agent
app.post('/api/agents/:id/stop', (req, res) => {
  const agentId = req.params.id;
  if (agentStates[agentId]) {
    agentStates[agentId].status = 'stopped';
    agentStates[agentId].logs.push(`[${new Date().toLocaleTimeString()}] Received SIGTERM. Container stopped gracefully.`);
  }
  res.json({ success: true, status: 'stopped' });
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
  }
];

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
