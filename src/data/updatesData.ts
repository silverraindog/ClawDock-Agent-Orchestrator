import { SystemUpdateItem } from '../types';

export const INITIAL_UPDATES: SystemUpdateItem[] = [
  // ==========================================
  // AI AGENTS (BOTS)
  // ==========================================
  {
    id: 'update-agent-hermes',
    name: 'Hermes Agent',
    category: 'agent',
    targetId: 'hermes-agent',
    currentVersion: 'v0.9.4',
    latestVersion: 'v1.2.0',
    status: 'update_available',
    lastChecked: '5 mins ago',
    packageOrImage: 'ghcr.io/nousresearch/hermes-agent:latest',
    description: 'Nous Research modular autonomous coding and multi-step reasoning agent with persistent memory.',
    installCommand: 'docker pull ghcr.io/nousresearch/hermes-agent:v1.2.0 && docker compose restart hermes-agent',
    breakingChanges: false,
    autoUpdateSupported: true,
    changelogSummary: [
      'Native Claude 3.7 Sonnet & Gemini 2.0 Flash reasoning tokens support',
      'High-throughput asynchronous tool execution queue',
      'Dual-agent consensus loop for self-correcting code generation',
      'Memory Graph SQLite schema v2 migration with vector pruning'
    ],
    availableVersions: [
      {
        version: 'v1.2.0',
        releaseDate: 'Sep 02, 2026',
        releaseNotes: 'Recommended: Claude 3.7 reasoning tokens, dynamic SKILL.md live reloading, memory v2.',
        isLatest: true,
        channel: 'stable'
      },
      {
        version: 'v1.1.0',
        releaseDate: 'Aug 15, 2026',
        releaseNotes: 'Structured JSON output schema validation and Telegram inline keyboards.',
        channel: 'stable'
      },
      {
        version: 'v1.0.0',
        releaseDate: 'Jul 20, 2026',
        releaseNotes: 'Production 1.0 milestone release with persistent memory graph and MCP stdio pipes.',
        channel: 'stable'
      },
      {
        version: 'v0.9.4',
        releaseDate: 'Jun 10, 2026',
        releaseNotes: 'Current running image on container hermes-agent-core.',
        isCurrent: true,
        channel: 'stable'
      }
    ]
  },
  {
    id: 'update-agent-zeroclaw',
    name: 'ZeroClaw',
    category: 'agent',
    targetId: 'zeroclaw',
    currentVersion: 'v0.4.1',
    latestVersion: 'v0.6.2',
    status: 'update_available',
    lastChecked: '5 mins ago',
    packageOrImage: 'zeroclaw/zeroclaw:latest',
    description: 'Ultra-minimal Rust Tokio assistant optimized for sub-15MB RAM edge devices.',
    installCommand: 'docker pull zeroclaw/zeroclaw:v0.6.2 && docker compose restart zeroclaw',
    breakingChanges: false,
    autoUpdateSupported: true,
    changelogSummary: [
      'Sub-12MB heap optimization with jemalloc 5.3 allocator',
      'AVX-512 / NEON SIMD accelerated token stream parser',
      'Direct serial UART & GPIO event listener for Raspberry Pi / embedded boards',
      'Zero-copy WebSocket frame buffering'
    ],
    availableVersions: [
      {
        version: 'v0.6.2',
        releaseDate: 'Aug 30, 2026',
        releaseNotes: 'Latest: SIMD token parser, sub-12MB RAM heap profile, SSE live telemetry.',
        isLatest: true,
        channel: 'stable'
      },
      {
        version: 'v0.5.0',
        releaseDate: 'Aug 01, 2026',
        releaseNotes: 'Async Tokio channel pooling and Linux epoll connection re-use.',
        channel: 'stable'
      },
      {
        version: 'v0.4.1',
        releaseDate: 'Jul 05, 2026',
        releaseNotes: 'Currently installed base Rust daemon.',
        isCurrent: true,
        channel: 'stable'
      }
    ]
  },
  {
    id: 'update-agent-openclaw',
    name: 'OpenClaw',
    category: 'agent',
    targetId: 'openclaw',
    currentVersion: 'v1.2.0',
    latestVersion: 'v1.4.1',
    status: 'update_available',
    lastChecked: '5 mins ago',
    packageOrImage: 'openclaw/openclaw:latest',
    description: 'Extensible multi-channel agent gateway connecting 16+ chat platforms (Telegram, Discord, Slack, Matrix).',
    installCommand: 'docker pull openclaw/openclaw:v1.4.1 && docker compose restart openclaw',
    breakingChanges: false,
    autoUpdateSupported: true,
    changelogSummary: [
      'WhatsApp Web multi-device session clustering with QR persistence',
      'Matrix crypto protocol v2 with end-to-end encryption speedups',
      'Webhook HMAC-SHA256 signature verification middleware',
      'Discord Slash commands dynamic manifest generator'
    ],
    availableVersions: [
      {
        version: 'v1.4.1',
        releaseDate: 'Sep 01, 2026',
        releaseNotes: 'Latest: WhatsApp clustering, Matrix crypto v2, Webhook HMAC verification.',
        isLatest: true,
        channel: 'stable'
      },
      {
        version: 'v1.3.0',
        releaseDate: 'Aug 10, 2026',
        releaseNotes: 'Discord slash command builder and Slack Block Kit adaptive templates.',
        channel: 'stable'
      },
      {
        version: 'v1.2.0',
        releaseDate: 'Jul 12, 2026',
        releaseNotes: 'Currently installed gateway daemon version.',
        isCurrent: true,
        channel: 'stable'
      }
    ]
  },
  {
    id: 'update-agent-picoclaw',
    name: 'PicoClaw',
    category: 'agent',
    targetId: 'picoclaw',
    currentVersion: 'v0.8.2',
    latestVersion: 'v1.0.0',
    status: 'update_available',
    lastChecked: '5 mins ago',
    packageOrImage: 'picoclaw/picoclaw:latest',
    description: 'Lightweight Go edge agent with sub-second boot time for local Linux and micro-gateways.',
    installCommand: 'docker pull picoclaw/picoclaw:v1.0.0 && docker compose restart picoclaw',
    breakingChanges: false,
    autoUpdateSupported: true,
    changelogSummary: [
      'Production 1.0 Milestone release with full backward compatibility',
      'RISC-V 64-bit hardware cryptographic instruction acceleration',
      'Flash storage wear-leveling driver for MicroSD cards',
      'Low-power sleep/wake event loop via systemd-notify'
    ],
    availableVersions: [
      {
        version: 'v1.0.0',
        releaseDate: 'Sep 03, 2026',
        releaseNotes: 'Official 1.0 Release: RISC-V acceleration, sub-100ms cold boot, flash wear leveling.',
        isLatest: true,
        channel: 'stable'
      },
      {
        version: 'v0.9.1',
        releaseDate: 'Aug 18, 2026',
        releaseNotes: 'Refactored Go 1.23 netpoll loop and Unix domain socket listeners.',
        channel: 'stable'
      },
      {
        version: 'v0.8.2',
        releaseDate: 'Jun 28, 2026',
        releaseNotes: 'Currently installed baseline image.',
        isCurrent: true,
        channel: 'stable'
      }
    ]
  },

  // ==========================================
  // MCP SERVERS
  // ==========================================
  {
    id: 'update-mcp-filesystem',
    name: 'Filesystem MCP Server',
    category: 'mcp',
    targetId: 'mcp_filesystem',
    currentVersion: '0.5.2',
    latestVersion: '0.6.1',
    status: 'update_available',
    lastChecked: '5 mins ago',
    packageOrImage: '@modelcontextprotocol/server-filesystem',
    description: 'Safe read/write filesystem access for containers within sandboxed directories.',
    installCommand: 'npx -y @modelcontextprotocol/server-filesystem@0.6.1',
    breakingChanges: false,
    autoUpdateSupported: true,
    changelogSummary: [
      'Enhanced directory traversal prevention on symlink traversal',
      'Added batch read_multiple_files tool with parallel async I/O',
      'Support for pattern-based glob matching in directory listing'
    ],
    availableVersions: [
      {
        version: '0.6.1',
        releaseDate: 'Aug 29, 2026',
        releaseNotes: 'Latest: batch read_multiple_files, improved symlink resolution.',
        isLatest: true,
        channel: 'stable'
      },
      {
        version: '0.6.0',
        releaseDate: 'Aug 12, 2026',
        releaseNotes: 'Path sandboxing security overhaul.',
        channel: 'stable'
      },
      {
        version: '0.5.2',
        releaseDate: 'Jun 22, 2026',
        releaseNotes: 'Currently active package version.',
        isCurrent: true,
        channel: 'stable'
      }
    ]
  },
  {
    id: 'update-mcp-github',
    name: 'GitHub MCP Server',
    category: 'mcp',
    targetId: 'mcp_github',
    currentVersion: '0.4.0',
    latestVersion: '0.5.1',
    status: 'update_available',
    lastChecked: '5 mins ago',
    packageOrImage: '@modelcontextprotocol/server-github',
    description: 'GitHub repositories, pull requests, issue tracking, and branch management tools.',
    installCommand: 'npx -y @modelcontextprotocol/server-github@0.5.1',
    breakingChanges: false,
    autoUpdateSupported: true,
    changelogSummary: [
      'Fine-grained Personal Access Token (PAT) permission verification',
      'Added pull_request_review_thread tool for inline code review comments',
      'GraphQL pagination support for repositories with 10k+ issues'
    ],
    availableVersions: [
      {
        version: '0.5.1',
        releaseDate: 'Aug 25, 2026',
        releaseNotes: 'Latest: Fine-grained PAT support, PR review threads API.',
        isLatest: true,
        channel: 'stable'
      },
      {
        version: '0.4.0',
        releaseDate: 'May 30, 2026',
        releaseNotes: 'Currently installed package.',
        isCurrent: true,
        channel: 'stable'
      }
    ]
  },
  {
    id: 'update-mcp-brave-search',
    name: 'Brave Search MCP Server',
    category: 'mcp',
    targetId: 'mcp_brave_search',
    currentVersion: '0.2.1',
    latestVersion: '0.3.0',
    status: 'update_available',
    lastChecked: '5 mins ago',
    packageOrImage: '@modelcontextprotocol/server-brave-search',
    description: 'Privacy-preserving global web and news search engine indexing.',
    installCommand: 'npx -y @modelcontextprotocol/server-brave-search@0.3.0',
    breakingChanges: false,
    autoUpdateSupported: true,
    changelogSummary: [
      'Freshness filtering parameter (pd, pw, pm, py) for recent news',
      'Domain whitelisting/blacklisting in search queries',
      'Automatic fallback to Brave Local POI search when location coordinates provided'
    ],
    availableVersions: [
      {
        version: '0.3.0',
        releaseDate: 'Aug 14, 2026',
        releaseNotes: 'Latest: Time-filter query syntax, domain filters, local POI search.',
        isLatest: true,
        channel: 'stable'
      },
      {
        version: '0.2.1',
        releaseDate: 'Apr 18, 2026',
        releaseNotes: 'Current version.',
        isCurrent: true,
        channel: 'stable'
      }
    ]
  },
  {
    id: 'update-mcp-sqlite',
    name: 'SQLite Database MCP Server',
    category: 'mcp',
    targetId: 'mcp_sqlite',
    currentVersion: '0.3.0',
    latestVersion: '0.3.0',
    status: 'up_to_date',
    lastChecked: '5 mins ago',
    packageOrImage: '@modelcontextprotocol/server-sqlite',
    description: 'Direct SQL query and schema analysis for local SQLite database files.',
    installCommand: 'npx -y @modelcontextprotocol/server-sqlite@0.3.0',
    breakingChanges: false,
    autoUpdateSupported: true,
    changelogSummary: [
      'Up to date - no new releases found on npm registry',
      'Supports read-only transaction mode and EXPLAIN query plan analyzer'
    ],
    availableVersions: [
      {
        version: '0.3.0',
        releaseDate: 'Aug 04, 2026',
        releaseNotes: 'Latest stable release with WAL journal mode verification.',
        isLatest: true,
        isCurrent: true,
        channel: 'stable'
      }
    ]
  },
  {
    id: 'update-mcp-docker',
    name: 'Docker MCP Server',
    category: 'mcp',
    targetId: 'mcp_docker',
    currentVersion: '1.1.0',
    latestVersion: '1.2.4',
    status: 'update_available',
    lastChecked: '5 mins ago',
    packageOrImage: 'docker-mcp-server',
    description: 'Container management, image building, volume inspection, and container logs streaming.',
    installCommand: 'pip install --upgrade docker-mcp-server==1.2.4',
    breakingChanges: false,
    autoUpdateSupported: true,
    changelogSummary: [
      'BuildKit progress stream multiplexer with colored terminal output',
      'Safe container prune filters with confirmation token',
      'Docker Compose v2 project lifecycle orchestration commands'
    ],
    availableVersions: [
      {
        version: '1.2.4',
        releaseDate: 'Sep 01, 2026',
        releaseNotes: 'Latest: BuildKit streaming, compose v2 controls, safety flags.',
        isLatest: true,
        channel: 'stable'
      },
      {
        version: '1.1.0',
        releaseDate: 'Jun 15, 2026',
        releaseNotes: 'Current version.',
        isCurrent: true,
        channel: 'stable'
      }
    ]
  },
  {
    id: 'update-mcp-puppeteer',
    name: 'Puppeteer Web Automation MCP',
    category: 'mcp',
    targetId: 'mcp_puppeteer',
    currentVersion: '0.4.2',
    latestVersion: '0.5.0',
    status: 'update_available',
    lastChecked: '5 mins ago',
    packageOrImage: '@modelcontextprotocol/server-puppeteer',
    description: 'Headless browser automation, full-page screenshot capture, and web scraping.',
    installCommand: 'npx -y @modelcontextprotocol/server-puppeteer@0.5.0',
    breakingChanges: false,
    autoUpdateSupported: true,
    changelogSummary: [
      'Chrome headless-shell upgrade for 40% lower memory footprint',
      'Support for CSS and XPath locator chaining',
      'Automatic cookie and session storage preservation across runs'
    ],
    availableVersions: [
      {
        version: '0.5.0',
        releaseDate: 'Aug 22, 2026',
        releaseNotes: 'Latest: Chrome headless-shell, lower RAM usage, session storage preservation.',
        isLatest: true,
        channel: 'stable'
      },
      {
        version: '0.4.2',
        releaseDate: 'May 10, 2026',
        releaseNotes: 'Current version.',
        isCurrent: true,
        channel: 'stable'
      }
    ]
  },
  {
    id: 'update-mcp-postgres',
    name: 'PostgreSQL MCP Server',
    category: 'mcp',
    targetId: 'mcp_postgres',
    currentVersion: '0.2.0',
    latestVersion: '0.3.1',
    status: 'update_available',
    lastChecked: '5 mins ago',
    packageOrImage: '@modelcontextprotocol/server-postgres',
    description: 'PostgreSQL database inspection, query execution, and foreign key graphing.',
    installCommand: 'npx -y @modelcontextprotocol/server-postgres@0.3.1',
    breakingChanges: false,
    autoUpdateSupported: true,
    changelogSummary: [
      'Automatic reconnect on connection drop with PgBouncer compatibility',
      'Prepared statement cache and parameterized query safety checks',
      'JSONB column schema unwrapping and indexing tool'
    ],
    availableVersions: [
      {
        version: '0.3.1',
        releaseDate: 'Aug 28, 2026',
        releaseNotes: 'Latest: PgBouncer retry logic, JSONB deep schema inspector.',
        isLatest: true,
        channel: 'stable'
      },
      {
        version: '0.2.0',
        releaseDate: 'Apr 11, 2026',
        releaseNotes: 'Current version.',
        isCurrent: true,
        channel: 'stable'
      }
    ]
  },
  {
    id: 'update-mcp-fetch',
    name: 'Fetch HTTP/REST MCP Server',
    category: 'mcp',
    targetId: 'mcp_fetch',
    currentVersion: '0.1.0',
    latestVersion: '0.2.0',
    status: 'update_available',
    lastChecked: '5 mins ago',
    packageOrImage: '@modelcontextprotocol/server-fetch',
    description: 'General HTTP/HTTPS client for fetching HTML, JSON, and downloading binaries.',
    installCommand: 'npx -y @modelcontextprotocol/server-fetch@0.2.0',
    breakingChanges: false,
    autoUpdateSupported: true,
    changelogSummary: [
      'HTTP/2 multiplexing support for concurrent API queries',
      'Automatic decompression for Brotli, Zstandard, and Gzip streams',
      'Configurable request timeout and custom user-agent rotation'
    ],
    availableVersions: [
      {
        version: '0.2.0',
        releaseDate: 'Aug 19, 2026',
        releaseNotes: 'Latest: HTTP/2 multiplexing, Zstandard decompression.',
        isLatest: true,
        channel: 'stable'
      },
      {
        version: '0.1.0',
        releaseDate: 'Mar 15, 2026',
        releaseNotes: 'Current version.',
        isCurrent: true,
        channel: 'stable'
      }
    ]
  },

  // ==========================================
  // INSTALLED SKILLS (SKILL.md SPECIFICATIONS)
  // ==========================================
  {
    id: 'update-skill-web-search',
    name: 'Web Search & Retrieval Skill',
    category: 'skill',
    targetId: 'skill_web-search',
    currentVersion: '1.2.0',
    latestVersion: '1.4.0',
    status: 'update_available',
    lastChecked: '5 mins ago',
    packageOrImage: 'clawdock/skills/web-search:1.4.0',
    description: 'High-speed web search and page content extraction skill for autonomous agent reasoning.',
    installCommand: 'clawdock skills update web-search --version 1.4.0',
    breakingChanges: false,
    autoUpdateSupported: true,
    changelogSummary: [
      'Multi-engine parallel search synthesis (Brave + DuckDuckGo)',
      'Direct PDF and Markdown preview extractor without full rendering',
      'Ad-blocker readability parser striping 85% of navigation boilerplate'
    ],
    availableVersions: [
      {
        version: '1.4.0',
        releaseDate: 'Sep 02, 2026',
        releaseNotes: 'Latest: PDF parsing, readability cleaner, multi-engine synthesis.',
        isLatest: true,
        channel: 'stable'
      },
      {
        version: '1.3.0',
        releaseDate: 'Aug 10, 2026',
        releaseNotes: 'Added search snippet ranker.',
        channel: 'stable'
      },
      {
        version: '1.2.0',
        releaseDate: 'Jun 19, 2026',
        releaseNotes: 'Currently installed skill definition.',
        isCurrent: true,
        channel: 'stable'
      }
    ]
  },
  {
    id: 'update-skill-python-exec',
    name: 'Python Code Execution Skill',
    category: 'skill',
    targetId: 'skill_python-exec',
    currentVersion: '2.0.1',
    latestVersion: '2.1.0',
    status: 'update_available',
    lastChecked: '5 mins ago',
    packageOrImage: 'clawdock/skills/python-exec:2.1.0',
    description: 'Isolated ephemeral Python execution environment for data science and calculations.',
    installCommand: 'clawdock skills update python-exec --version 2.1.0',
    breakingChanges: false,
    autoUpdateSupported: true,
    changelogSummary: [
      'Python 3.12 compatibility and Pandas 2.2 support',
      'Direct headless SVG plot generation for Matplotlib charts',
      'Memory limit guard with graceful SIGXCPU signal trapping'
    ],
    availableVersions: [
      {
        version: '2.1.0',
        releaseDate: 'Aug 26, 2026',
        releaseNotes: 'Latest: Python 3.12, Matplotlib SVG generator, memory traps.',
        isLatest: true,
        channel: 'stable'
      },
      {
        version: '2.0.1',
        releaseDate: 'Jul 04, 2026',
        releaseNotes: 'Current version in workspace.',
        isCurrent: true,
        channel: 'stable'
      }
    ]
  },
  {
    id: 'update-skill-git-master',
    name: 'Git Commit & PR Automation Skill',
    category: 'skill',
    targetId: 'skill_git-master',
    currentVersion: '1.0.0',
    latestVersion: '1.1.2',
    status: 'update_available',
    lastChecked: '5 mins ago',
    packageOrImage: 'clawdock/skills/git-master:1.1.2',
    description: 'Autonomous Git operations: branches, atomic commits, diff inspection, and pull requests.',
    installCommand: 'clawdock skills update git-master --version 1.1.2',
    breakingChanges: false,
    autoUpdateSupported: true,
    changelogSummary: [
      'Conventional Commit parser with automated changelog generator',
      'Multi-remote rebase conflict detector with branch safety snapshot',
      'GPG commit signing integration with container keyrings'
    ],
    availableVersions: [
      {
        version: '1.1.2',
        releaseDate: 'Aug 30, 2026',
        releaseNotes: 'Latest: Conventional commits generator, conflict detector, GPG signing.',
        isLatest: true,
        channel: 'stable'
      },
      {
        version: '1.0.0',
        releaseDate: 'Jun 01, 2026',
        releaseNotes: 'Current version.',
        isCurrent: true,
        channel: 'stable'
      }
    ]
  },
  {
    id: 'update-skill-memory-graph',
    name: 'Memory & Vector Graph Skill',
    category: 'skill',
    targetId: 'skill_memory-graph',
    currentVersion: '1.1.0',
    latestVersion: '1.3.0',
    status: 'update_available',
    lastChecked: '5 mins ago',
    packageOrImage: 'clawdock/skills/memory-graph:1.3.0',
    description: 'Long-term associative memory network with vector embeddings and graph relations.',
    installCommand: 'clawdock skills update memory-graph --version 1.3.0',
    breakingChanges: false,
    autoUpdateSupported: true,
    changelogSummary: [
      'Hierarchical semantic clustering of user facts and preferences',
      'Cosine similarity pruning with 3x faster vector query performance',
      'Cross-agent shared memory namespace isolation'
    ],
    availableVersions: [
      {
        version: '1.3.0',
        releaseDate: 'Sep 02, 2026',
        releaseNotes: 'Latest: Hierarchical clustering, 3x faster vector search, multi-agent namespaces.',
        isLatest: true,
        channel: 'stable'
      },
      {
        version: '1.1.0',
        releaseDate: 'Jul 15, 2026',
        releaseNotes: 'Current version.',
        isCurrent: true,
        channel: 'stable'
      }
    ]
  },
  {
    id: 'update-skill-shell-exec',
    name: 'Shell Sandbox Runner Skill',
    category: 'skill',
    targetId: 'skill_shell-exec',
    currentVersion: '1.5.0',
    latestVersion: '1.5.0',
    status: 'up_to_date',
    lastChecked: '5 mins ago',
    packageOrImage: 'clawdock/skills/shell-exec:1.5.0',
    description: 'Docker-isolated Bash command runner with output streaming and audit logging.',
    installCommand: 'clawdock skills update shell-exec --version 1.5.0',
    breakingChanges: false,
    autoUpdateSupported: true,
    changelogSummary: [
      'Up to date - no newer skill specifications available',
      'Current version enforces container seccomp and read-only volume masks'
    ],
    availableVersions: [
      {
        version: '1.5.0',
        releaseDate: 'Aug 17, 2026',
        releaseNotes: 'Latest stable release with seccomp profile enforcement.',
        isLatest: true,
        isCurrent: true,
        channel: 'stable'
      }
    ]
  },
  {
    id: 'update-skill-sql-query',
    name: 'SQL Database Querying Skill',
    category: 'skill',
    targetId: 'skill_sql-query',
    currentVersion: '1.0.0',
    latestVersion: '1.1.0',
    status: 'update_available',
    lastChecked: '5 mins ago',
    packageOrImage: 'clawdock/skills/sql-query:1.1.0',
    description: 'Parameterized database query generator with automatic schema reflection.',
    installCommand: 'clawdock skills update sql-query --version 1.1.0',
    breakingChanges: false,
    autoUpdateSupported: true,
    changelogSummary: [
      'Query execution plan analyzer with index recommendation suggestions',
      'Automatic slow-query timeout threshold enforcement (default 5000ms)',
      'Support for DuckDB and ClickHouse dialect syntax'
    ],
    availableVersions: [
      {
        version: '1.1.0',
        releaseDate: 'Aug 21, 2026',
        releaseNotes: 'Latest: DuckDB support, query plan visualizer, auto-timeout.',
        isLatest: true,
        channel: 'stable'
      },
      {
        version: '1.0.0',
        releaseDate: 'May 14, 2026',
        releaseNotes: 'Current version.',
        isCurrent: true,
        channel: 'stable'
      }
    ]
  },
  {
    id: 'update-skill-media-vision',
    name: 'Media & Vision Processing Skill',
    category: 'skill',
    targetId: 'skill_media-vision',
    currentVersion: '0.9.0',
    latestVersion: '1.0.0',
    status: 'update_available',
    lastChecked: '5 mins ago',
    packageOrImage: 'clawdock/skills/media-vision:1.0.0',
    description: 'Image captioning, OCR text extraction, and bounding box object labeling.',
    installCommand: 'clawdock skills update media-vision --version 1.0.0',
    breakingChanges: false,
    autoUpdateSupported: true,
    changelogSummary: [
      'Gemini 2.0 Flash multimodal image recognition integration',
      'High-resolution OCR bounding box coordinates formatting',
      'Automatic image resizing to optimize token consumption'
    ],
    availableVersions: [
      {
        version: '1.0.0',
        releaseDate: 'Sep 03, 2026',
        releaseNotes: 'Production 1.0: Multimodal token optimization, OCR bounding boxes.',
        isLatest: true,
        channel: 'stable'
      },
      {
        version: '0.9.0',
        releaseDate: 'Jun 20, 2026',
        releaseNotes: 'Current version.',
        isCurrent: true,
        channel: 'stable'
      }
    ]
  },
  {
    id: 'update-skill-iot-mqtt',
    name: 'IoT & MQTT Edge Bus Skill',
    category: 'skill',
    targetId: 'skill_iot-mqtt',
    currentVersion: '0.8.0',
    latestVersion: '0.9.5',
    status: 'update_available',
    lastChecked: '5 mins ago',
    packageOrImage: 'clawdock/skills/iot-mqtt:0.9.5',
    description: 'Publish and subscribe to telemetry topics across local micro-controllers and sensors.',
    installCommand: 'clawdock skills update iot-mqtt --version 0.9.5',
    breakingChanges: false,
    autoUpdateSupported: true,
    changelogSummary: [
      'MQTT v5 protocol support with QoS 2 message delivery guarantee',
      'TLS 1.3 certificate pinning and client mutual authentication (mTLS)',
      'Sub-millisecond binary protobuf message decoding'
    ],
    availableVersions: [
      {
        version: '0.9.5',
        releaseDate: 'Aug 27, 2026',
        releaseNotes: 'Latest: MQTT v5, mTLS authentication, Protobuf decoder.',
        isLatest: true,
        channel: 'stable'
      },
      {
        version: '0.8.0',
        releaseDate: 'Apr 25, 2026',
        releaseNotes: 'Current version.',
        isCurrent: true,
        channel: 'stable'
      }
    ]
  }
];
