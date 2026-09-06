import { AgentFullConfig, AgentId, ChannelConfig, LLMProvider, ModelConfig, MoAConfig } from '../types';
import { mergeWithDefaultConfig } from './apiBridge';

/**
 * Checks whether the configuration indicates a local edge or self-hosted deployment
 * (e.g. Ollama, local network IP like 192.168.x.x, localhost, or custom private endpoint).
 */
export function isLocalDeployment(provider?: string, baseUrl?: string, model?: string): boolean {
  if (provider === 'ollama' || provider === 'custom') return true;
  if (baseUrl) {
    const lowerUrl = baseUrl.toLowerCase();
    if (
      lowerUrl.includes('11434') ||
      lowerUrl.includes('localhost') ||
      lowerUrl.includes('127.0.0.1') ||
      lowerUrl.includes('192.168.') ||
      lowerUrl.includes('10.') ||
      lowerUrl.includes('172.16.') ||
      lowerUrl.includes(':8000') ||
      lowerUrl.includes(':5000') ||
      lowerUrl.includes('v1') && lowerUrl.includes('192.')
    ) {
      return true;
    }
  }
  if (model) {
    const lowerModel = model.toLowerCase();
    if (
      lowerModel.includes('ollama') ||
      lowerModel.includes('qwen2.5') ||
      lowerModel.includes(':latest') ||
      lowerModel.includes('gemma') ||
      lowerModel.includes('llama3')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Parses native container configuration files (YAML, JSON, TOML)
 * into a strongly-typed Partial<AgentFullConfig>.
 * 
 * Specifically extracts:
 * - model: default / model / model_name / checkpoint -> model.model
 * - provider: custom / ollama / anthropic / openai / ... -> model.provider
 * - base_url / baseUrl / api_base -> model.baseUrl
 * - context_length / num_ctx / context_window -> model.contextWindow
 * - max_tokens / num_predict -> model.maxTokens
 * - temperature -> model.temperature
 * - api_key / apiKey -> model.apiKey
 * - moa.aggregatorModel / aggregator_model -> moa.aggregatorModel (with smart local defaulting)
 */
export function parseNativeConfigToSchema(
  agentId: AgentId,
  nativeContent: string,
  format: string = 'yaml'
): Partial<AgentFullConfig> {
  if (!nativeContent || typeof nativeContent !== 'string') {
    return {};
  }

  const result: Partial<AgentFullConfig> = {
    agentId
  };

  const trimmed = nativeContent.trim();
  const detectedFormat = format || (trimmed.startsWith('{') ? 'json' : 'yaml');

  let parsedModelName: string | undefined;
  let parsedProvider: LLMProvider | undefined;
  let parsedBaseUrl: string | undefined;
  let parsedContextLength: number | undefined;
  let parsedMaxTokens: number | undefined;
  let parsedTemperature: number | undefined;
  let parsedApiKey: string | undefined;
  let parsedAgentName: string | undefined;
  let parsedSystemPrompt: string | undefined;
  let parsedPreset: any;
  let parsedAggregatorModel: string | undefined;
  let parsedProposerModels: string[] | undefined;
  let parsedMoaEnabled: boolean | undefined;
  let parsedChannels: Partial<ChannelConfig> | undefined;

  // 1. JSON Parsing
  if (detectedFormat === 'json') {
    try {
      const json = JSON.parse(nativeContent);
      if (json.agent_name || json.agentName) parsedAgentName = json.agent_name || json.agentName;
      
      const m = json.model || {};
      if (m.provider) parsedProvider = m.provider as LLMProvider;
      // Extract model name from default, model, model_name, or checkpoint
      parsedModelName = m.default || m.model || m.model_name || m.checkpoint || m.name;
      if (parsedModelName === 'provider:') parsedModelName = undefined;

      parsedBaseUrl = m.base_url || m.baseUrl || m.api_base;
      if (m.context_length !== undefined) parsedContextLength = Number(m.context_length);
      else if (m.num_ctx !== undefined) parsedContextLength = Number(m.num_ctx);
      else if (m.context_window !== undefined) parsedContextLength = Number(m.context_window);

      if (m.max_tokens !== undefined) parsedMaxTokens = Number(m.max_tokens);
      else if (m.num_predict !== undefined) parsedMaxTokens = Number(m.num_predict);

      if (m.temperature !== undefined) parsedTemperature = Number(m.temperature);
      if (m.api_key || m.apiKey) parsedApiKey = m.api_key || m.apiKey;

      if (json.system) {
        if (json.system.system_prompt || json.system.systemPrompt) {
          parsedSystemPrompt = json.system.system_prompt || json.system.systemPrompt;
        }
        if (json.system.preset) parsedPreset = json.system.preset;
      }

      if (json.moa) {
        if (json.moa.aggregator_model || json.moa.aggregatorModel) {
          parsedAggregatorModel = json.moa.aggregator_model || json.moa.aggregatorModel;
        }
        if (json.moa.proposer_models || json.moa.proposerModels) {
          parsedProposerModels = json.moa.proposer_models || json.moa.proposerModels;
        }
        if (typeof json.moa.enabled === 'boolean') parsedMoaEnabled = json.moa.enabled;
      }

      if (json.channels || json.channel || json.communication || json.discord || json.telegram) {
        parsedChannels = {};
        const ch = json.channels || {};
        const prefersDiscord = json.channel === 'discord' || json.communication === 'discord' || agentId === 'picoclaw';

        if (ch.discord || json.discord || prefersDiscord) {
          const disc = ch.discord || json.discord || {};
          parsedChannels.discord = {
            enabled: disc.enabled !== undefined ? Boolean(disc.enabled) : true,
            botToken: disc.bot_token || disc.botToken || 'env:DISCORD_BOT_TOKEN',
            clientId: disc.client_id || disc.clientId || 'env:DISCORD_CLIENT_ID',
            guildIds: disc.guild_ids || disc.guildIds || 'env:DISCORD_GUILD_ID'
          };
        }

        if (ch.telegram || json.telegram) {
          const tel = ch.telegram || json.telegram || {};
          parsedChannels.telegram = {
            enabled: tel.enabled !== undefined ? Boolean(tel.enabled) : !prefersDiscord,
            botToken: tel.bot_token || tel.botToken || '',
            allowedUsers: tel.allowed_users || tel.allowedUsers || '@developer',
            mode: tel.mode || 'polling'
          };
        } else if (prefersDiscord) {
          parsedChannels.telegram = {
            enabled: false,
            botToken: '',
            allowedUsers: '@developer',
            mode: 'polling'
          };
        }

        if (ch.webhook) {
          parsedChannels.webhook = {
            enabled: Boolean(ch.webhook.enabled),
            port: Number(ch.webhook.port || 8080),
            authToken: ch.webhook.auth_token || ch.webhook.authToken || '',
            corsOrigin: ch.webhook.cors_origin || ch.webhook.corsOrigin || '*'
          };
        }
      }
    } catch {}
  } else if (detectedFormat === 'toml') {
    // 2. TOML Parsing
    const matchName = nativeContent.match(/agent_name\s*=\s*["']([^"']+)["']/);
    if (matchName) parsedAgentName = matchName[1];

    const matchProv = nativeContent.match(/provider\s*=\s*["']([^"']+)["']/);
    if (matchProv) parsedProvider = matchProv[1] as LLMProvider;

    const matchModel = nativeContent.match(/(?:default|model|model_name)\s*=\s*["']([^"']+)["']/);
    if (matchModel && matchModel[1] !== 'provider:') parsedModelName = matchModel[1];

    const matchBase = nativeContent.match(/(?:base_url|baseUrl|api_base)\s*=\s*["']([^"']+)["']/);
    if (matchBase) parsedBaseUrl = matchBase[1];

    const matchCtx = nativeContent.match(/(?:context_length|num_ctx|context_window)\s*=\s*([0-9]+)/);
    if (matchCtx) parsedContextLength = Number(matchCtx[1]);

    const matchMax = nativeContent.match(/(?:max_tokens|num_predict)\s*=\s*([0-9]+)/);
    if (matchMax) parsedMaxTokens = Number(matchMax[1]);

    const matchTemp = nativeContent.match(/temperature\s*=\s*([0-9.]+)/);
    if (matchTemp) parsedTemperature = Number(matchTemp[1]);

    const matchPrompt = nativeContent.match(/system_prompt\s*=\s*["']([^"']+)["']/);
    if (matchPrompt) parsedSystemPrompt = matchPrompt[1];

    const discordMatch = nativeContent.match(/\[channels\.discord\]([\s\S]*?)(?=\n\[|$)/i);
    const telegramMatch = nativeContent.match(/\[channels\.telegram\]([\s\S]*?)(?=\n\[|$)/i);
    if (discordMatch || telegramMatch || agentId === 'picoclaw') {
      parsedChannels = {};
      const prefersDiscord = Boolean(discordMatch) || agentId === 'picoclaw';
      if (discordMatch) {
        const en = discordMatch[1].match(/enabled\s*=\s*(true|false)/i);
        parsedChannels.discord = {
          enabled: en ? en[1].toLowerCase() === 'true' : true,
          botToken: 'env:DISCORD_BOT_TOKEN',
          clientId: 'env:DISCORD_CLIENT_ID',
          guildIds: 'env:DISCORD_GUILD_ID'
        };
      } else if (prefersDiscord) {
        parsedChannels.discord = {
          enabled: true,
          botToken: 'env:DISCORD_BOT_TOKEN',
          clientId: 'env:DISCORD_CLIENT_ID',
          guildIds: 'env:DISCORD_GUILD_ID'
        };
      }
      if (telegramMatch) {
        const en = telegramMatch[1].match(/enabled\s*=\s*(true|false)/i);
        parsedChannels.telegram = {
          enabled: en ? en[1].toLowerCase() === 'true' : !prefersDiscord,
          botToken: '',
          allowedUsers: '@developer',
          mode: 'polling'
        };
      } else if (prefersDiscord) {
        parsedChannels.telegram = {
          enabled: false,
          botToken: '',
          allowedUsers: '@developer',
          mode: 'polling'
        };
      }
    }
  } else {
    // 3. YAML Parsing
    const matchName = nativeContent.match(/agent_name:\s*"([^"]+)"|agent_name:\s*([^\n]+)/);
    if (matchName) parsedAgentName = (matchName[1] || matchName[2]).trim();

    // Model block parsing
    const modelBlockMatch = nativeContent.match(/model:\s*\n([\s\S]*?)(?=\n[a-z_]+:|$)/i);
    const searchTarget = modelBlockMatch ? modelBlockMatch[1] : nativeContent;

    // Provider
    const pMatch = searchTarget.match(/provider:\s*["']?([^"'\s\n#]+)["']?/);
    if (pMatch && pMatch[1]) parsedProvider = pMatch[1].trim() as LLMProvider;

    // Model checkpoint name: check "default:", "model:", "model_name:", "checkpoint:"
    const defMatch = searchTarget.match(/default:\s*["']?([^"'\s\n#]+)["']?/);
    const mMatch = searchTarget.match(/(?:model|model_name|checkpoint):\s*["']?([^"'\s\n#]+)["']?/);
    if (defMatch && defMatch[1]) {
      parsedModelName = defMatch[1].trim();
    } else if (mMatch && mMatch[1] && mMatch[1] !== 'provider:') {
      parsedModelName = mMatch[1].trim();
    }

    // Base URL
    const bMatch = searchTarget.match(/(?:base_url|baseUrl|api_base):\s*["']?([^"'\s\n#]+)["']?/);
    if (bMatch && bMatch[1]) parsedBaseUrl = bMatch[1].trim();

    // Context length / window
    const cMatch = searchTarget.match(/(?:context_length|num_ctx|context_window):\s*([0-9]+)/);
    if (cMatch && cMatch[1]) parsedContextLength = Number(cMatch[1]);

    // Max tokens
    const maxMatch = searchTarget.match(/(?:max_tokens|num_predict):\s*([0-9]+)/);
    if (maxMatch && maxMatch[1]) parsedMaxTokens = Number(maxMatch[1]);

    // Temperature
    const tMatch = searchTarget.match(/temperature:\s*([0-9.]+)/);
    if (tMatch && tMatch[1]) parsedTemperature = Number(tMatch[1]);

    // API key
    const keyMatch = searchTarget.match(/(?:api_key|apiKey):\s*["']?([^"'\s\n#]+)["']?/);
    if (keyMatch && keyMatch[1]) parsedApiKey = keyMatch[1].trim();

    // System prompt & preset
    const promptMatch = nativeContent.match(/system_prompt:\s*"([^"]+)"|system_prompt:\s*([^\n]+)/);
    if (promptMatch) parsedSystemPrompt = (promptMatch[1] || promptMatch[2]).trim();

    const presetMatch = nativeContent.match(/system_preset:\s*"([^"]+)"|system_preset:\s*([^\n]+)/);
    if (presetMatch) parsedPreset = (presetMatch[1] || presetMatch[2]).trim();

    // MoA section if present in YAML
    const moaBlockMatch = nativeContent.match(/moa:\s*\n([\s\S]*?)(?=\n[a-z_]+:|$)/i);
    if (moaBlockMatch) {
      const moaBlock = moaBlockMatch[1];
      const aggMatch = moaBlock.match(/(?:aggregator_model|aggregatorModel):\s*["']?([^"'\s\n#]+)["']?/);
      if (aggMatch && aggMatch[1]) parsedAggregatorModel = aggMatch[1].trim();
      const enMatch = moaBlock.match(/enabled:\s*(true|false)/i);
      if (enMatch) parsedMoaEnabled = enMatch[1].toLowerCase() === 'true';
    }

    // Channels parsing in YAML
    const channelsBlockMatch = nativeContent.match(/channels:\s*\n([\s\S]*?)(?=\n[a-z_]+:|$)/i);
    const targetChannelsText = channelsBlockMatch ? channelsBlockMatch[1] : nativeContent;
    const hasDiscord = targetChannelsText.includes('discord:') || (agentId as string) === 'picoclaw';
    const hasTelegram = targetChannelsText.includes('telegram:');

    if (hasDiscord || hasTelegram) {
      parsedChannels = {};
      const prefersDiscord = hasDiscord || (agentId as string) === 'picoclaw';
      const discEnMatch = targetChannelsText.match(/discord:[\s\S]*?enabled:\s*(true|false)/i);
      parsedChannels.discord = {
        enabled: discEnMatch ? discEnMatch[1].toLowerCase() === 'true' : prefersDiscord,
        botToken: 'env:DISCORD_BOT_TOKEN',
        clientId: 'env:DISCORD_CLIENT_ID',
        guildIds: 'env:DISCORD_GUILD_ID'
      };

      const telEnMatch = targetChannelsText.match(/telegram:[\s\S]*?enabled:\s*(true|false)/i);
      parsedChannels.telegram = {
        enabled: telEnMatch ? telEnMatch[1].toLowerCase() === 'true' : !prefersDiscord,
        botToken: '',
        allowedUsers: '@developer',
        mode: 'polling'
      };
    }
  }

  // Sipeed / PicoClaw always defaults communication to Discord
  if (agentId === 'picoclaw') {
    if (!parsedChannels) parsedChannels = {};
    if (!parsedChannels.discord) {
      parsedChannels.discord = {
        enabled: true,
        botToken: 'env:DISCORD_BOT_TOKEN',
        clientId: 'env:DISCORD_CLIENT_ID',
        guildIds: 'env:DISCORD_GUILD_ID'
      };
    }
    if (parsedChannels.telegram === undefined) {
      parsedChannels.telegram = {
        enabled: false,
        botToken: '',
        allowedUsers: '@sipeed_user',
        mode: 'polling'
      };
    }
  }

  // Auto-detect provider if missing or custom but points to Ollama
  if (!parsedProvider) {
    if (parsedBaseUrl && (parsedBaseUrl.includes('11434') || parsedBaseUrl.includes('ollama'))) {
      parsedProvider = 'ollama';
    } else {
      parsedProvider = agentId === 'picoclaw' ? 'ollama' : agentId === 'zeroclaw' ? 'deepseek' : agentId === 'openclaw' ? 'openai' : 'custom';
    }
  }

  // Model object
  const modelObj: Partial<ModelConfig> = {};
  if (parsedProvider) modelObj.provider = parsedProvider;
  if (parsedModelName) modelObj.model = parsedModelName;
  if (parsedBaseUrl) modelObj.baseUrl = parsedBaseUrl;
  if (parsedContextLength) modelObj.contextWindow = parsedContextLength;
  if (parsedMaxTokens) modelObj.maxTokens = parsedMaxTokens;
  if (parsedTemperature !== undefined) modelObj.temperature = parsedTemperature;
  if (parsedApiKey) modelObj.apiKey = parsedApiKey;

  if (Object.keys(modelObj).length > 0) {
    result.model = modelObj as ModelConfig;
  }

  // System
  if (parsedAgentName || parsedSystemPrompt || parsedPreset) {
    result.system = {
      agentName: parsedAgentName || agentId,
      personaName: parsedAgentName || agentId,
      systemPrompt: parsedSystemPrompt || '',
      preset: parsedPreset || 'engineer',
      language: 'en-US',
      autoFormatCode: true
    };
  }

  // MoA configuration with intelligent local-inference resolution
  const isLocal = isLocalDeployment(parsedProvider, parsedBaseUrl, parsedModelName);
  const primaryModel = parsedModelName || (agentId === 'picoclaw' ? 'qwen2.5-coder:7b' : 'gemma4-soul:latest');

  const moaObj: Partial<MoAConfig> = {
    enabled: parsedMoaEnabled ?? (agentId === 'hermes-agent')
  };

  if (parsedAggregatorModel) {
    moaObj.aggregatorModel = parsedAggregatorModel;
  } else if (isLocal) {
    // If running on a local edge node / Ollama, aggregator MUST default to the local model
    moaObj.aggregatorModel = primaryModel;
  }

  if (parsedProposerModels && parsedProposerModels.length > 0) {
    moaObj.proposerModels = parsedProposerModels;
  } else if (isLocal) {
    moaObj.proposerModels = [primaryModel, 'qwen2.5-coder:7b', 'deepseek-r1:8b'];
  }

  if (Object.keys(moaObj).length > 0) {
    result.moa = moaObj as MoAConfig;
  }

  if (parsedChannels) {
    result.channels = parsedChannels as ChannelConfig;
  }

  console.log(`[ConfigParser Debug] Channel config evaluation for agent "${agentId}":`, {
    agentId,
    detectedFormat,
    isDiscordEnabled: parsedChannels?.discord?.enabled ?? (agentId === 'picoclaw'),
    isTelegramEnabled: parsedChannels?.telegram?.enabled ?? (agentId !== 'picoclaw'),
    discordConfig: parsedChannels?.discord,
    telegramConfig: parsedChannels?.telegram,
    rawSourceContent: nativeContent
  });

  return result;
}

/**
 * Merges parsed native file configuration into a candidate configuration,
 * giving priority to explicitly parsed native values while retaining defaults.
 */
export function enhanceConfigWithNative(
  candidateConfig: Partial<AgentFullConfig>,
  nativeContent: string,
  format: string,
  agentId: AgentId
): AgentFullConfig {
  const nativeParsed = parseNativeConfigToSchema(agentId, nativeContent, format);
  const baseMerged = mergeWithDefaultConfig(agentId, candidateConfig);

  if (nativeParsed.model) {
    if (nativeParsed.model.provider) baseMerged.model.provider = nativeParsed.model.provider;
    if (nativeParsed.model.model) baseMerged.model.model = nativeParsed.model.model;
    if (nativeParsed.model.baseUrl !== undefined) baseMerged.model.baseUrl = nativeParsed.model.baseUrl;
    if (nativeParsed.model.contextWindow) baseMerged.model.contextWindow = nativeParsed.model.contextWindow;
    if (nativeParsed.model.maxTokens) baseMerged.model.maxTokens = nativeParsed.model.maxTokens;
    if (nativeParsed.model.temperature !== undefined) baseMerged.model.temperature = nativeParsed.model.temperature;
    if (nativeParsed.model.apiKey) baseMerged.model.apiKey = nativeParsed.model.apiKey;
  }

  const isLocal = isLocalDeployment(baseMerged.model.provider, baseMerged.model.baseUrl, baseMerged.model.model);

  if (nativeParsed.moa) {
    if (nativeParsed.moa.aggregatorModel) {
      baseMerged.moa.aggregatorModel = nativeParsed.moa.aggregatorModel;
    } else if (isLocal) {
      baseMerged.moa.aggregatorModel = baseMerged.model.model;
    }

    if (nativeParsed.moa.proposerModels) {
      baseMerged.moa.proposerModels = nativeParsed.moa.proposerModels;
    } else if (isLocal) {
      baseMerged.moa.proposerModels = [baseMerged.model.model, 'qwen2.5-coder:7b', 'deepseek-r1:8b'];
    }

    if (typeof nativeParsed.moa.enabled === 'boolean') {
      baseMerged.moa.enabled = nativeParsed.moa.enabled;
    }
  } else if (isLocal && baseMerged.moa.aggregatorModel === 'claude-3-7-sonnet') {
    // If local and still has the hardcoded claude-3-7-sonnet default, align with local agent model
    baseMerged.moa.aggregatorModel = baseMerged.model.model;
    baseMerged.moa.proposerModels = [baseMerged.model.model, 'qwen2.5-coder:7b', 'deepseek-r1:8b'];
  }

  if (nativeParsed.system) {
    if (nativeParsed.system.agentName) baseMerged.system.agentName = nativeParsed.system.agentName;
    if (nativeParsed.system.systemPrompt) baseMerged.system.systemPrompt = nativeParsed.system.systemPrompt;
    if (nativeParsed.system.preset) baseMerged.system.preset = nativeParsed.system.preset;
  }

  // Channel integration with Discord priority
  if (nativeParsed.channels) {
    if (nativeParsed.channels.discord) {
      baseMerged.channels.discord = { ...baseMerged.channels.discord, ...nativeParsed.channels.discord };
    }
    if (nativeParsed.channels.telegram) {
      baseMerged.channels.telegram = { ...baseMerged.channels.telegram, ...nativeParsed.channels.telegram };
    }
    if (nativeParsed.channels.slack) {
      baseMerged.channels.slack = { ...baseMerged.channels.slack, ...nativeParsed.channels.slack };
    }
    if (nativeParsed.channels.webhook) {
      baseMerged.channels.webhook = { ...baseMerged.channels.webhook, ...nativeParsed.channels.webhook };
    }
  } else if (agentId === 'picoclaw') {
    baseMerged.channels.discord.enabled = true;
    baseMerged.channels.telegram.enabled = false;
  }

  return baseMerged;
}
