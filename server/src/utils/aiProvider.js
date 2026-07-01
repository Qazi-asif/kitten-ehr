import prisma from '../lib/prisma.js';

function buildGroqProvider(apiKey, modelOverride) {
  const baseUrl = (process.env.GROQ_API_BASE_URL || 'https://api.groq.com/openai/v1').trim().replace(/\/$/, '');
  return {
    apiKey,
    apiUrl: `${baseUrl}/chat/completions`,
    model: modelOverride || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    providerLabel: 'Groq',
    supportsModelFallback: true,
  };
}

function buildOpenAiProvider(apiKey) {
  return {
    apiKey,
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    providerLabel: 'OpenAI',
    supportsModelFallback: false,
  };
}

function readEnvProvider() {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) return buildGroqProvider(groqKey);

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) return buildOpenAiProvider(openaiKey);

  return null;
}

export async function resolveAiProvider() {
  const fromEnv = readEnvProvider();
  if (fromEnv) return fromEnv;

  const settings = await prisma.settings.findUnique({
    where: { id: 1 },
    select: { groqApiKey: true, groqModel: true },
  });

  if (settings?.groqApiKey?.trim()) {
    return buildGroqProvider(settings.groqApiKey.trim(), settings.groqModel?.trim() || undefined);
  }

  return null;
}

export function getMissingKeyHint() {
  if (process.env.VERCEL) {
    return 'Set GROQ_API_KEY in Vercel → Environment Variables and redeploy, or paste your Groq key in Settings → Organization → AI Copywriter and save.';
  }
  return 'Add GROQ_API_KEY to server/.env and restart, or paste your Groq key in Settings → Organization → AI Copywriter and save.';
}

export function isAiKeyConfiguredInEnv() {
  return Boolean(readEnvProvider());
}
