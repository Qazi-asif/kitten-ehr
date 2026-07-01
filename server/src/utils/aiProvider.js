import prisma from '../lib/prisma.js';

const GROK_ENV_NAMES = ['XAI_API_KEY', 'GROK_API_KEY', 'GROK_KEY', 'XAI_KEY'];

function buildGrokProvider(apiKey, modelOverride) {
  const baseUrl = (process.env.XAI_API_BASE_URL || 'https://api.x.ai/v1').trim().replace(/\/$/, '');
  return {
    apiKey,
    apiUrl: `${baseUrl}/chat/completions`,
    model: modelOverride || process.env.GROK_MODEL || process.env.XAI_MODEL || 'grok-3-mini',
    providerLabel: 'Grok',
  };
}

function buildOpenAiProvider(apiKey) {
  return {
    apiKey,
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    providerLabel: 'OpenAI',
  };
}

function readEnvProvider() {
  for (const name of GROK_ENV_NAMES) {
    const value = process.env[name]?.trim();
    if (value) return buildGrokProvider(value);
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) return buildOpenAiProvider(openaiKey);

  return null;
}

export async function resolveAiProvider() {
  const fromEnv = readEnvProvider();
  if (fromEnv) return fromEnv;

  const settings = await prisma.settings.findUnique({
    where: { id: 1 },
    select: { xaiApiKey: true, grokModel: true },
  });

  if (settings?.xaiApiKey?.trim()) {
    return buildGrokProvider(settings.xaiApiKey.trim(), settings.grokModel?.trim() || undefined);
  }

  return null;
}

export function getMissingKeyHint() {
  if (process.env.VERCEL) {
    return 'Set XAI_API_KEY in Vercel → Environment Variables and redeploy, or paste your Grok key in Settings → Organization → AI Copywriter and save.';
  }
  return 'Add XAI_API_KEY to server/.env and restart, or paste your Grok key in Settings → Organization → AI Copywriter and save.';
}

export function isAiKeyConfiguredInEnv() {
  return Boolean(readEnvProvider());
}
