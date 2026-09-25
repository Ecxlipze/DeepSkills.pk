// AI provider clients for the site assistant.
//
// Three providers are supported and selected with CHAT_AI_PROVIDER:
//   claude   -> Anthropic Messages API   (@anthropic-ai/sdk)
//   openai   -> OpenAI Chat Completions  (openai)
//   deepseek -> DeepSeek, which is OpenAI-compatible, so it uses the same SDK
//               pointed at DeepSeek's base URL.
//
// Nothing here runs until an API key is present. With no key the assistant keeps
// answering from the keyword knowledge base exactly as before.

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export const PROVIDERS = {
  claude: {
    label: 'Claude',
    keyVar: 'ANTHROPIC_API_KEY',
    // Anthropic's current default model. Set CHAT_AI_MODEL to use a cheaper one
    // (for example claude-haiku-4-5) if this volume of chat justifies it.
    defaultModel: 'claude-opus-5',
  },
  openai: {
    label: 'OpenAI',
    keyVar: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini',
  },
  deepseek: {
    label: 'DeepSeek',
    keyVar: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
    baseURL: 'https://api.deepseek.com',
  },
};

const REQUEST_TIMEOUT_MS = Number(process.env.CHAT_AI_TIMEOUT_MS || 12_000);
const MAX_TOKENS = 1200;

/**
 * Which provider (if any) this deployment should use. Returns null when no key
 * is configured, which is the normal state until keys are added.
 */
export function getProviderConfig(env = process.env) {
  const requested = String(env.CHAT_AI_PROVIDER || '').trim().toLowerCase();

  // With no explicit choice, use whichever key happens to be present.
  const name = requested || Object.keys(PROVIDERS).find((key) => env[PROVIDERS[key].keyVar]);
  if (!name) return null;

  const provider = PROVIDERS[name];
  if (!provider) {
    console.error(`[chatbot] unknown CHAT_AI_PROVIDER "${requested}" — falling back to keyword answers.`);
    return null;
  }

  const apiKey = String(env[provider.keyVar] || '').trim();
  if (!apiKey) return null;

  return {
    name,
    label: provider.label,
    apiKey,
    // CHAT_AI_BASE_URL points the client at a gateway, proxy or compatible
    // endpoint instead of the provider's own.
    baseURL: String(env.CHAT_AI_BASE_URL || '').trim() || provider.baseURL,
    model: String(env.CHAT_AI_MODEL || '').trim() || provider.defaultModel,
  };
}

export const isAiEnabled = (env = process.env) => Boolean(getProviderConfig(env));

// Clients are reused across requests. The key covers every field the client is
// constructed from, so changing the endpoint or key never reuses a stale client.
const clients = new Map();

function getClient(config) {
  const cacheKey = `${config.name}:${config.model}:${config.baseURL || ''}:${config.apiKey.slice(-6)}`;
  const existing = clients.get(cacheKey);
  if (existing) return existing;

  const client = config.name === 'claude'
    ? new Anthropic({ apiKey: config.apiKey, timeout: REQUEST_TIMEOUT_MS })
    : new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL, timeout: REQUEST_TIMEOUT_MS });

  clients.set(cacheKey, client);
  return client;
}

async function callClaude(client, config, { system, messages }) {
  const response = await client.messages.create({
    model: config.model,
    max_tokens: MAX_TOKENS,
    system,
    // Low effort: these are short, grounded answers, and a visitor is waiting.
    output_config: { effort: 'low' },
    messages,
  });

  if (response.stop_reason === 'refusal') {
    throw new Error(`refused: ${response.stop_details?.category || 'unspecified'}`);
  }

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

async function callOpenAiCompatible(client, config, { system, messages }) {
  // DeepSeek follows the older chat-completions field name.
  const tokenField = config.name === 'deepseek' ? 'max_tokens' : 'max_completion_tokens';

  const response = await client.chat.completions.create({
    model: config.model,
    [tokenField]: MAX_TOKENS,
    messages: [{ role: 'system', content: system }, ...messages],
  });

  return String(response.choices?.[0]?.message?.content || '').trim();
}

/**
 * Sends one grounded request to the configured provider.
 * Throws on failure; callers fall back to the keyword answer.
 */
export async function generate({ system, messages }, env = process.env) {
  const config = getProviderConfig(env);
  if (!config) throw new Error('No AI provider configured');

  const client = getClient(config);
  const text = config.name === 'claude'
    ? await callClaude(client, config, { system, messages })
    : await callOpenAiCompatible(client, config, { system, messages });

  if (!text) throw new Error('Empty response from provider');
  return { text, provider: config.name, model: config.model };
}

export function describeAiError(error) {
  if (error instanceof Anthropic.AuthenticationError || error instanceof OpenAI.AuthenticationError) {
    return 'auth_failed';
  }
  if (error instanceof Anthropic.RateLimitError || error instanceof OpenAI.RateLimitError) {
    return 'rate_limited';
  }
  if (error instanceof Anthropic.BadRequestError || error instanceof OpenAI.BadRequestError) {
    return 'bad_request';
  }
  if (error instanceof Anthropic.APIError || error instanceof OpenAI.APIError) {
    return `api_error_${error.status || 'unknown'}`;
  }
  return 'request_failed';
}
