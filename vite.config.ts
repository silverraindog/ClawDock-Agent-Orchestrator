import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

function apiServerPlugin(): Plugin {
  return {
    name: 'clawdock-api-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next();
        }

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          return res.end();
        }

        const parsedUrl = new URL(req.url, 'http://localhost');
        const pathname = parsedUrl.pathname;

        // Health endpoint
        if (pathname === '/api/health') {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
        }

        // State endpoint
        if (pathname === '/api/state') {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({
            success: true,
            agentStates: {
              'hermes-agent': { status: 'running', containerId: 'c108a94fd32b', logs: ['[Hermes Core] Running'] },
              'zeroclaw': { status: 'stopped', containerId: 'b94101e4aa22', logs: ['[ZeroClaw] Stopped'] },
              'openclaw': { status: 'detected_local', containerId: '', logs: ['[OpenClaw] Detected local'] },
              'picoclaw': { status: 'running', containerId: 'e4991ac89b10', logs: ['[PicoClaw] Running'] }
            }
          }));
        }

        // Persistence endpoint
        if (pathname === '/api/persistence') {
          res.setHeader('Content-Type', 'application/json');
          if (req.method === 'GET') {
            const dataDir = path.join(process.cwd(), 'data', 'clawdock');
            const persistenceFile = path.join(dataDir, 'persistence.json');
            let data: any = {};
            try {
              if (fs.existsSync(persistenceFile)) {
                data = JSON.parse(fs.readFileSync(persistenceFile, 'utf8'));
              }
            } catch {}
            return res.end(JSON.stringify({ success: true, data }));
          }

          if (req.method === 'POST' || req.method === 'PUT') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const dataDir = path.join(process.cwd(), 'data', 'clawdock');
                if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
                const persistenceFile = path.join(dataDir, 'persistence.json');
                let existing: any = {};
                try {
                  if (fs.existsSync(persistenceFile)) existing = JSON.parse(fs.readFileSync(persistenceFile, 'utf8'));
                } catch {}
                if (parsed.key && parsed.value !== undefined) {
                  existing[parsed.key] = parsed.value;
                } else if (parsed && typeof parsed === 'object') {
                  existing = { ...existing, ...parsed };
                }
                fs.writeFileSync(persistenceFile, JSON.stringify(existing, null, 2), 'utf8');
                return res.end(JSON.stringify({ success: true, data: existing }));
              } catch (e: any) {
                return res.end(JSON.stringify({ success: true }));
              }
            });
            return;
          }
        }

        // Config endpoints for agents
        if (pathname.startsWith('/api/agents/')) {
          res.setHeader('Content-Type', 'application/json');
          const dataDir = path.join(process.cwd(), 'data', 'clawdock');
          
          if (pathname === '/api/agents/all/configs') {
            const files: Record<string, string> = {
              'hermes-agent': 'hermes.yaml',
              'openclaw': 'openclaw.json',
              'zeroclaw': 'zeroclaw.toml',
              'picoclaw': 'picoclaw.json'
            };
            const configs: Record<string, any> = {};
            for (const [id, f] of Object.entries(files)) {
              const fp = path.join(dataDir, f);
              if (fs.existsSync(fp)) {
                const content = fs.readFileSync(fp, 'utf8');
                configs[id] = { success: true, agentId: id, nativeFileName: f, nativeContent: content };
              }
            }
            return res.end(JSON.stringify({ success: true, configs }));
          }

          const match = pathname.match(/\/api\/agents\/([^/]+)\/config/);
          if (match) {
            const agentId = match[1];
            const fileMap: Record<string, string> = {
              'hermes-agent': 'hermes.yaml',
              'openclaw': 'openclaw.json',
              'zeroclaw': 'zeroclaw.toml',
              'picoclaw': 'picoclaw.json'
            };
            const fileName = fileMap[agentId] || `${agentId}.json`;
            const filePath = path.join(dataDir, fileName);
            let content = '';
            if (fs.existsSync(filePath)) {
              content = fs.readFileSync(filePath, 'utf8');
            }
            return res.end(JSON.stringify({
              success: true,
              agentId,
              nativeFileName: fileName,
              nativeContent: content,
              nativeFormat: fileName.endsWith('.yaml') ? 'yaml' : fileName.endsWith('.toml') ? 'toml' : 'json'
            }));
          }
        }

        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
