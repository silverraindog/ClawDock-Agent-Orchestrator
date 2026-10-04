import { MCPServerConfig } from '../types';

/**
 * Official Model Context Protocol (MCP) Server Directory
 * Curated from https://mcpservers.org/official and the official Model Context Protocol ecosystem.
 */
export const OFFICIAL_MCP_REGISTRY: MCPServerConfig[] = [
  {
    id: 'official-mcp-github',
    name: 'GitHub MCP Server',
    vendor: 'GitHub / Anthropic',
    description: 'Official MCP integration for GitHub. Search repositories, create pull requests, manage issues, view commits, and manipulate code branches.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    category: 'Developer Tools',
    enabled: false,
    status: 'disconnected',
    isOfficial: true,
    packageOrRepo: '@modelcontextprotocol/server-github',
    sourceUrl: 'https://mcpservers.org/official',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
    toolsProvided: [
      'create_or_update_file',
      'search_repositories',
      'create_issue',
      'get_issue',
      'create_pull_request',
      'list_commits',
      'search_code',
      'create_branch',
      'list_branches',
      'get_file_contents'
    ],
    envRequirements: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        description: 'GitHub Personal Access Token (classic or fine-grained) with repo scope.',
        placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
        required: true
      }
    ]
  },
  {
    id: 'official-mcp-filesystem',
    name: 'Filesystem MCP Server',
    vendor: 'Anthropic Reference',
    description: 'Secure, directory-scoped filesystem access server allowing agents to read, write, edit, and traverse files on the host or in Docker volumes.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/workspace', '/data'],
    category: 'System & Storage',
    enabled: true,
    status: 'connected',
    isOfficial: true,
    packageOrRepo: '@modelcontextprotocol/server-filesystem',
    sourceUrl: 'https://mcpservers.org/official',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    toolsProvided: [
      'read_file',
      'read_multiple_files',
      'write_file',
      'edit_file',
      'create_directory',
      'list_directory',
      'directory_tree',
      'move_file',
      'search_files',
      'get_file_info'
    ]
  },
  {
    id: 'official-mcp-postgres',
    name: 'PostgreSQL MCP Server',
    vendor: 'PostgreSQL / MCP',
    description: 'Connect directly to PostgreSQL databases with read/write SQL query execution, schema introspection, and automated transaction safety.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://postgres:postgres@localhost:5432/agentdb'],
    category: 'Databases',
    enabled: false,
    status: 'disconnected',
    isOfficial: true,
    packageOrRepo: '@modelcontextprotocol/server-postgres',
    sourceUrl: 'https://mcpservers.org/official',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
    toolsProvided: [
      'query',
      'describe_table',
      'list_tables',
      'explain_query'
    ],
    envRequirements: [
      {
        name: 'DATABASE_URL',
        description: 'PostgreSQL connection URI (e.g., postgresql://user:pass@host:5432/dbname)',
        placeholder: 'postgresql://user:password@localhost:5432/dbname',
        required: false
      }
    ]
  },
  {
    id: 'official-mcp-sqlite',
    name: 'SQLite Database Explorer',
    vendor: 'SQLite / MCP',
    description: 'Embedded, fast zero-configuration relational database engine for agent state persistence, structured data query, and tabular reasoning.',
    transport: 'stdio',
    command: 'uvx',
    args: ['mcp-server-sqlite', '--db-path', '/data/clawdock/agent_state.db'],
    category: 'Databases',
    enabled: true,
    status: 'connected',
    isOfficial: true,
    packageOrRepo: 'mcp-server-sqlite',
    sourceUrl: 'https://mcpservers.org/official',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite',
    toolsProvided: [
      'read_query',
      'write_query',
      'create_table',
      'list_tables',
      'describe_table',
      'backup_database'
    ]
  },
  {
    id: 'official-mcp-brave-search',
    name: 'Brave Search MCP',
    vendor: 'Brave Software',
    description: 'Independent, high-precision web and local location search API powered by the private Brave search index with no tracking.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    category: 'Web & Search',
    enabled: false,
    status: 'disconnected',
    isOfficial: true,
    packageOrRepo: '@modelcontextprotocol/server-brave-search',
    sourceUrl: 'https://mcpservers.org/official',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
    toolsProvided: [
      'brave_web_search',
      'brave_local_search'
    ],
    envRequirements: [
      {
        name: 'BRAVE_API_KEY',
        description: 'Brave Search API Key from brave.com/search/api',
        placeholder: 'BSA_xxxxxxxxxxxxxxxxxxxx',
        required: true
      }
    ]
  },
  {
    id: 'official-mcp-slack',
    name: 'Slack MCP Server',
    vendor: 'Slack Technologies',
    description: 'Post and read messages, browse channels, start threads, and upload files across your Slack workspaces directly from your AI agents.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    category: 'Communication',
    enabled: false,
    status: 'disconnected',
    isOfficial: true,
    packageOrRepo: '@modelcontextprotocol/server-slack',
    sourceUrl: 'https://mcpservers.org/official',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
    toolsProvided: [
      'list_channels',
      'post_message',
      'reply_to_thread',
      'add_reaction',
      'get_channel_history',
      'get_thread_replies',
      'get_user_profile'
    ],
    envRequirements: [
      {
        name: 'SLACK_BOT_TOKEN',
        description: 'Slack Bot User OAuth Token with chat:write and channels:history scopes.',
        placeholder: 'xoxb-xxxxxxxxxxxxxxxxxxxx',
        required: true
      },
      {
        name: 'SLACK_TEAM_ID',
        description: 'Slack Workspace Team ID (optional).',
        placeholder: 'T0123456789',
        required: false
      }
    ]
  },
  {
    id: 'official-mcp-stripe',
    name: 'Stripe Payments MCP',
    vendor: 'Stripe Inc. Official',
    description: 'Official Stripe Model Context Protocol server. Inspect payments, manage subscriptions, lookup invoices, and handle customer accounts.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@stripe/mcp'],
    category: 'Productivity & Finance',
    enabled: false,
    status: 'disconnected',
    isOfficial: true,
    packageOrRepo: '@stripe/mcp',
    sourceUrl: 'https://mcpservers.org/official',
    docsUrl: 'https://github.com/stripe/agent-toolkit',
    toolsProvided: [
      'create_customer',
      'list_customers',
      'retrieve_customer',
      'create_payment_intent',
      'list_charges',
      'search_invoices',
      'create_subscription',
      'refund_payment'
    ],
    envRequirements: [
      {
        name: 'STRIPE_SECRET_KEY',
        description: 'Stripe Restricted or Secret API Key (sk_test_... or sk_live_...).',
        placeholder: 'sk_test_xxxxxxxxxxxxxxxxxxxx',
        required: true
      }
    ]
  },
  {
    id: 'official-mcp-notion',
    name: 'Notion Workspace MCP',
    vendor: 'Notion Labs Official',
    description: 'Official Notion MCP integration. Query and update team databases, retrieve markdown page content, search workspaces, and create documents.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@notionhq/mcp-server'],
    category: 'Productivity & Finance',
    enabled: false,
    status: 'disconnected',
    isOfficial: true,
    packageOrRepo: '@notionhq/mcp-server',
    sourceUrl: 'https://mcpservers.org/official',
    docsUrl: 'https://developers.notion.com',
    toolsProvided: [
      'search',
      'get_page',
      'get_block_children',
      'create_page',
      'update_page_properties',
      'query_database',
      'append_block_children'
    ],
    envRequirements: [
      {
        name: 'NOTION_API_KEY',
        description: 'Internal Notion Integration Secret token (secret_...).',
        placeholder: 'secret_xxxxxxxxxxxxxxxxxxxx',
        required: true
      }
    ]
  },
  {
    id: 'official-mcp-google-drive',
    name: 'Google Drive MCP Server',
    vendor: 'Google / MCP',
    description: 'Search, read, upload, and export files and Docs directly from Google Drive workspaces.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-gdrive'],
    category: 'Productivity & Finance',
    enabled: false,
    status: 'disconnected',
    isOfficial: true,
    packageOrRepo: '@modelcontextprotocol/server-gdrive',
    sourceUrl: 'https://mcpservers.org/official',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/gdrive',
    toolsProvided: [
      'search_files',
      'read_file',
      'list_folder',
      'create_folder',
      'export_doc'
    ],
    envRequirements: [
      {
        name: 'GDRIVE_CREDENTIALS_PATH',
        description: 'Path to Google Cloud Service Account or OAuth client credentials JSON.',
        placeholder: '/workspace/credentials.json',
        required: true
      }
    ]
  },
  {
    id: 'official-mcp-google-maps',
    name: 'Google Maps Platform MCP',
    vendor: 'Google Maps / MCP',
    description: 'Geocoding, reverse geocoding, point-of-interest discovery, turn-by-turn routing, and elevation queries powered by Google Maps API.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-google-maps'],
    category: 'Web & Search',
    enabled: false,
    status: 'disconnected',
    isOfficial: true,
    packageOrRepo: '@modelcontextprotocol/server-google-maps',
    sourceUrl: 'https://mcpservers.org/official',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/google-maps',
    toolsProvided: [
      'maps_geocode',
      'maps_reverse_geocode',
      'maps_search_places',
      'maps_place_details',
      'maps_distance_matrix',
      'maps_elevation',
      'maps_directions'
    ],
    envRequirements: [
      {
        name: 'GOOGLE_MAPS_API_KEY',
        description: 'Google Maps Platform API key with Geocoding and Places enabled.',
        placeholder: 'AIzaSyxxxxxxxxxxxxxxxxxxxx',
        required: true
      }
    ]
  },
  {
    id: 'official-mcp-git',
    name: 'Git Version Control MCP',
    vendor: 'Git / MCP Steering',
    description: 'Read and manipulate local git repositories: inspect git status, staged diffs, commit trees, branches, and commit histories.',
    transport: 'stdio',
    command: 'uvx',
    args: ['mcp-server-git', '--repository', '/workspace'],
    category: 'Developer Tools',
    enabled: true,
    status: 'connected',
    isOfficial: true,
    packageOrRepo: 'mcp-server-git',
    sourceUrl: 'https://mcpservers.org/official',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/git',
    toolsProvided: [
      'git_status',
      'git_diff_unstaged',
      'git_diff_staged',
      'git_commit',
      'git_add',
      'git_reset',
      'git_log',
      'git_create_branch',
      'git_checkout',
      'git_show'
    ]
  },
  {
    id: 'official-mcp-memory',
    name: 'Memory Knowledge Graph MCP',
    vendor: 'Anthropic Reference',
    description: 'Knowledge graph-based persistent memory system. Constructs persistent entity relations, observations, and structured graph context across sessions.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    category: 'Memory & State',
    enabled: true,
    status: 'connected',
    isOfficial: true,
    packageOrRepo: '@modelcontextprotocol/server-memory',
    sourceUrl: 'https://mcpservers.org/official',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
    toolsProvided: [
      'create_entities',
      'create_relations',
      'add_observations',
      'delete_entities',
      'delete_observations',
      'read_graph',
      'search_nodes',
      'open_nodes'
    ]
  },
  {
    id: 'official-mcp-puppeteer',
    name: 'Puppeteer Browser Automation',
    vendor: 'Puppeteer / MCP',
    description: 'Headless Chromium browser automation tool. Navigate dynamic web apps, execute clicks, capture screenshots, fill inputs, and scrape JS-rendered DOMs.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    category: 'Web & Search',
    enabled: false,
    status: 'disconnected',
    isOfficial: true,
    packageOrRepo: '@modelcontextprotocol/server-puppeteer',
    sourceUrl: 'https://mcpservers.org/official',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer',
    toolsProvided: [
      'puppeteer_navigate',
      'puppeteer_screenshot',
      'puppeteer_click',
      'puppeteer_fill',
      'puppeteer_select',
      'puppeteer_hover',
      'puppeteer_evaluate'
    ]
  },
  {
    id: 'official-mcp-fetch',
    name: 'HTTP Fetcher & Markdown Reader',
    vendor: 'MCP Steering',
    description: 'Efficient internet page fetcher that converts raw HTML, articles, and APIs into clean, token-efficient Markdown for LLM ingestion.',
    transport: 'stdio',
    command: 'uvx',
    args: ['mcp-server-fetch'],
    category: 'Web & Search',
    enabled: true,
    status: 'connected',
    isOfficial: true,
    packageOrRepo: 'mcp-server-fetch',
    sourceUrl: 'https://mcpservers.org/official',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
    toolsProvided: [
      'fetch'
    ]
  },
  {
    id: 'official-mcp-cloudflare',
    name: 'Cloudflare Platform MCP',
    vendor: 'Cloudflare Official',
    description: 'Official Cloudflare MCP server. Manage DNS zones, deploy Workers, configure KV stores, inspect R2 buckets, and trigger zero-trust policies.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@cloudflare/mcp-server-cloudflare'],
    category: 'Cloud & Infrastructure',
    enabled: false,
    status: 'disconnected',
    isOfficial: true,
    packageOrRepo: '@cloudflare/mcp-server-cloudflare',
    sourceUrl: 'https://mcpservers.org/official',
    docsUrl: 'https://github.com/cloudflare/mcp-server-cloudflare',
    toolsProvided: [
      'list_zones',
      'get_dns_records',
      'create_dns_record',
      'deploy_worker',
      'get_worker_logs',
      'kv_get',
      'kv_put',
      'list_r2_buckets'
    ],
    envRequirements: [
      {
        name: 'CLOUDFLARE_API_TOKEN',
        description: 'Cloudflare API Token with Account and Zone permissions.',
        placeholder: 'CLOUDFLARE_TOKEN_xxxxxxxxxxxx',
        required: true
      },
      {
        name: 'CLOUDFLARE_ACCOUNT_ID',
        description: 'Your Cloudflare Account ID.',
        placeholder: 'account_id_hex',
        required: true
      }
    ]
  },
  {
    id: 'official-mcp-linear',
    name: 'Linear Issue Tracking MCP',
    vendor: 'Linear Official',
    description: 'Project management and issue tracker integration for Linear. Create, query, update issues, assign teammates, and inspect project cycles.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-linear'],
    category: 'Productivity & Finance',
    enabled: false,
    status: 'disconnected',
    isOfficial: true,
    packageOrRepo: 'mcp-server-linear',
    sourceUrl: 'https://mcpservers.org/official',
    docsUrl: 'https://linear.app',
    toolsProvided: [
      'linear_search_issues',
      'linear_create_issue',
      'linear_update_issue',
      'linear_get_issue',
      'linear_get_team',
      'linear_list_projects',
      'linear_list_cycles'
    ],
    envRequirements: [
      {
        name: 'LINEAR_API_KEY',
        description: 'Linear Personal API Key (lin_api_...).',
        placeholder: 'lin_api_xxxxxxxxxxxxxxxxxxxx',
        required: true
      }
    ]
  },
  {
    id: 'official-mcp-sentry',
    name: 'Sentry Error Monitoring MCP',
    vendor: 'Sentry.io Official',
    description: 'Inspect runtime exceptions, trace stack traces, search production issues, and resolve events from Sentry crash reporting directly.',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sentry'],
    category: 'Developer Tools',
    enabled: false,
    status: 'disconnected',
    isOfficial: true,
    packageOrRepo: '@modelcontextprotocol/server-sentry',
    sourceUrl: 'https://mcpservers.org/official',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sentry',
    toolsProvided: [
      'get_issue',
      'search_issues',
      'resolve_issue',
      'list_events',
      'get_latest_release'
    ],
    envRequirements: [
      {
        name: 'SENTRY_AUTH_TOKEN',
        description: 'Sentry User Auth Token with issue:read and event:read permissions.',
        placeholder: 'sntrys_xxxxxxxxxxxxxxxxxxxx',
        required: true
      },
      {
        name: 'SENTRY_ORG',
        description: 'Sentry Organization slug.',
        placeholder: 'my-org',
        required: true
      }
    ]
  },
  {
    id: 'official-mcp-redis',
    name: 'Redis In-Memory Data Store',
    vendor: 'Redis Ltd / MCP',
    description: 'High-throughput in-memory key-value cache, pub/sub channel inspector, and TTL session storage server.',
    transport: 'stdio',
    command: 'uvx',
    args: ['mcp-server-redis', 'redis://localhost:6379'],
    category: 'Databases',
    enabled: false,
    status: 'disconnected',
    isOfficial: true,
    packageOrRepo: 'mcp-server-redis',
    sourceUrl: 'https://mcpservers.org/official',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/redis',
    toolsProvided: [
      'redis_get',
      'redis_set',
      'redis_keys',
      'redis_del',
      'redis_info',
      'redis_ttl',
      'redis_hgetall'
    ]
  },
  {
    id: 'official-mcp-kubernetes',
    name: 'Kubernetes Cluster MCP',
    vendor: 'Kubernetes SIG',
    description: 'Inspect pods, stream container logs, describe services, inspect ingress controllers, and apply manifests against Kubernetes clusters.',
    transport: 'stdio',
    command: 'uvx',
    args: ['mcp-server-kubernetes'],
    category: 'Cloud & Infrastructure',
    enabled: false,
    status: 'disconnected',
    isOfficial: true,
    packageOrRepo: 'mcp-server-kubernetes',
    sourceUrl: 'https://mcpservers.org/official',
    docsUrl: 'https://github.com/modelcontextprotocol/servers',
    toolsProvided: [
      'list_pods',
      'get_pod_logs',
      'describe_service',
      'apply_manifest',
      'get_deployments',
      'get_namespaces'
    ],
    envRequirements: [
      {
        name: 'KUBECONFIG',
        description: 'Path to kubeconfig file (defaults to ~/.kube/config).',
        placeholder: '/workspace/.kube/config',
        required: false
      }
    ]
  },
  {
    id: 'official-mcp-docker',
    name: 'Docker Daemon MCP Server',
    vendor: 'Docker Community',
    description: 'Full container lifecycle management: list containers, inspect images, retrieve logs, and execute commands via the host Docker daemon socket.',
    transport: 'stdio',
    command: 'docker-mcp-server',
    args: ['--socket', '/var/run/docker.sock'],
    category: 'Cloud & Infrastructure',
    enabled: true,
    status: 'connected',
    isOfficial: true,
    packageOrRepo: 'docker-mcp-server',
    sourceUrl: 'https://mcpservers.org/official',
    docsUrl: 'https://docs.docker.com',
    toolsProvided: [
      'list_containers',
      'start_container',
      'stop_container',
      'inspect_container',
      'get_container_logs',
      'pull_image',
      'docker_ps'
    ]
  }
];

export const OFFICIAL_MCP_CATEGORIES = [
  'All',
  'Developer Tools',
  'Databases',
  'System & Storage',
  'Web & Search',
  'Productivity & Finance',
  'Communication',
  'Cloud & Infrastructure',
  'Memory & State'
];
