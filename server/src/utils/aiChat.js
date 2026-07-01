const GROQ_MODEL_FALLBACKS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'];

export function extractAiError(payload, fallback, status, providerLabel = 'AI') {
  if (status === 401) {
    return `Invalid or expired ${providerLabel} API key. Update it in Settings → Organization → AI Copywriter.`;
  }
  if (status === 403) {
    return `${providerLabel} API access denied. Check your API key and account at console.groq.com.`;
  }
  if (status === 429) {
    return `${providerLabel} rate limit reached. Wait a moment and try again.`;
  }

  if (!payload || typeof payload !== 'object') return fallback;

  if (typeof payload.error === 'string') return payload.error;
  if (payload.error?.message) return payload.error.message;
  if (typeof payload.message === 'string') return payload.message;
  if (typeof payload.detail === 'string') return payload.detail;
  if (Array.isArray(payload.detail)) {
    return payload.detail
      .map((entry) => entry?.msg || entry?.message || JSON.stringify(entry))
      .join('; ');
  }

  return fallback;
}

function shouldTryNextModel(status, message) {
  if ([400, 404, 422].includes(status)) {
    return /model|not found|does not exist|invalid|decommissioned/i.test(message);
  }
  return false;
}

function shouldRetryStatus(status) {
  return [429, 500, 502, 503, 504].includes(status);
}

export async function createChatCompletion(provider, messages, options = {}) {
  const models = provider.supportsModelFallback
    ? [...new Set([provider.model, ...GROQ_MODEL_FALLBACKS])]
    : [provider.model];

  let lastStatus = 502;
  let lastError = `${provider.providerLabel} request failed`;

  for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
    const model = models[modelIndex];
    const maxAttempts = modelIndex === 0 ? 2 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }

      const response = await fetch(provider.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.8,
          max_tokens: options.maxTokens ?? 400,
          stream: false,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (response.ok) {
        return { payload, model };
      }

      lastStatus = response.status;
      lastError = extractAiError(payload, lastError, response.status, provider.providerLabel);
      console.error(`${provider.providerLabel} API error (${response.status}) model=${model}:`, lastError);

      if (shouldRetryStatus(response.status) && attempt < maxAttempts - 1) {
        continue;
      }

      if (provider.supportsModelFallback && shouldTryNextModel(response.status, lastError) && modelIndex < models.length - 1) {
        break;
      }

      const error = new Error(lastError);
      error.status = lastStatus;
      throw error;
    }
  }

  const error = new Error(lastError);
  error.status = lastStatus;
  throw error;
}
