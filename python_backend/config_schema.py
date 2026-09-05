"""
ClawDock Agent Orchestrator - Full Configuration Schema
Pydantic Schema matching Hermes Agent, ZeroClaw, OpenClaw, and PicoClaw.
"""

from typing import List, Dict, Optional, Literal, Any
from pydantic import BaseModel, Field

class ModelConfigSchema(BaseModel):
    provider: Literal[
        'openai', 'anthropic', 'gemini', 'deepseek', 
        'groq', 'mistral', 'ollama', 'openrouter', 'custom'
    ] = 'anthropic'
    model: str = 'claude-3-7-sonnet'
    api_key: Optional[str] = Field(default='', description="API Key for the LLM Provider")
    base_url: Optional[str] = Field(default=None, description="Custom base URL (e.g. for Ollama or Local proxy)")
    temperature: float = Field(default=0.3, ge=0.0, le=2.0)
    reasoning_effort: Literal['none', 'low', 'medium', 'high', 'extended'] = 'high'
    max_tokens: int = Field(default=8192, ge=256, le=65536)
    context_window: int = Field(default=200000, ge=4096, le=2000000)
    top_p: float = Field(default=0.95, ge=0.0, le=1.0)

class TelegramChannelSchema(BaseModel):
    enabled: bool = False
    bot_token: str = ''
    allowed_users: str = '@admin'
    mode: Literal['polling', 'webhook'] = 'polling'
    webhook_url: Optional[str] = None

class DiscordChannelSchema(BaseModel):
    enabled: bool = False
    bot_token: str = ''
    client_id: str = ''
    guild_ids: str = ''

class SlackChannelSchema(BaseModel):
    enabled: bool = False
    bot_token: str = ''
    app_token: str = ''
    signing_secret: str = ''
    socket_mode: bool = True

class WhatsAppChannelSchema(BaseModel):
    enabled: bool = False
    session_id: str = 'agent_wa_session'
    webhook_url: str = 'http://localhost:8080/webhook/whatsapp'

class MatrixChannelSchema(BaseModel):
    enabled: bool = False
    homeserver: str = 'https://matrix.org'
    access_token: str = ''
    room_ids: str = '#agents:matrix.org'

class WebhookChannelSchema(BaseModel):
    enabled: bool = True
    port: int = 8080
    auth_token: str = 'secret_token_123'
    cors_origin: str = '*'

class ChannelsConfigSchema(BaseModel):
    telegram: TelegramChannelSchema = Field(default_factory=TelegramChannelSchema)
    discord: DiscordChannelSchema = Field(default_factory=DiscordChannelSchema)
    slack: SlackChannelSchema = Field(default_factory=SlackChannelSchema)
    whatsapp: WhatsAppChannelSchema = Field(default_factory=WhatsAppChannelSchema)
    matrix: MatrixChannelSchema = Field(default_factory=MatrixChannelSchema)
    webhook: WebhookChannelSchema = Field(default_factory=WebhookChannelSchema)

class SystemPromptSchema(BaseModel):
    preset: Literal['engineer', 'researcher', 'devops', 'edge_assistant', 'custom'] = 'engineer'
    system_prompt: str = (
        "You are an autonomous AI assistant capable of reasoning, executing shell commands, "
        "and utilizing external tools via SKILL.md and Model Context Protocol (MCP)."
    )
    agent_name: str = 'Claw Agent'
    persona_name: str = 'Prime'
    language: str = 'en-US'
    auto_format_code: bool = True

class SecurityConfigSchema(BaseModel):
    sandbox_mode: Literal['docker_isolated', 'host_restricted', 'read_only'] = 'docker_isolated'
    allowed_directories: List[str] = Field(default_factory=lambda: ['/workspace', '/tmp/scratch'])
    block_network_access: bool = False
    max_execution_time_sec: int = Field(default=120, ge=5, le=3600)
    require_approval_for_commands: bool = False
    security_profile_file: str = '.security.yml'

class StorageConfigSchema(BaseModel):
    memory_backend: Literal['sqlite', 'chroma', 'redis', 'markdown'] = 'sqlite'
    db_path: str = '/data/agent_memory.db'
    auto_summarize_interval: int = 25
    max_history_turns: int = 100
    vector_db_url: Optional[str] = None

class AgentFullConfigSchema(BaseModel):
    agent_id: Literal['hermes-agent', 'zeroclaw', 'openclaw', 'picoclaw']
    version: str = '1.0.0'
    model: ModelConfigSchema = Field(default_factory=ModelConfigSchema)
    channels: ChannelsConfigSchema = Field(default_factory=ChannelsConfigSchema)
    system: SystemPromptSchema = Field(default_factory=SystemPromptSchema)
    security: SecurityConfigSchema = Field(default_factory=SecurityConfigSchema)
    storage: StorageConfigSchema = Field(default_factory=StorageConfigSchema)
    custom_env: Dict[str, str] = Field(default_factory=dict)
