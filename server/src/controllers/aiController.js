const SYSTEM_PROMPT =
  'You are an expert social media manager for a cat rescue. Write a highly engaging, emotional, and optimized Facebook/Instagram caption for this kitten. Follow 2026 Meta best practices: start with a hook, use emojis, keep it under 200 words, include 3-5 relevant hashtags. Do not use banned or overly aggressive language. CRITICAL: You must end every caption with a call to action including the donation link. Format it exactly like this at the end: "Support our rescue and donate here: [DONATE_LINK]"';

function getDonationUrl() {
  if (process.env.DONATION_URL?.trim()) {
    return process.env.DONATION_URL.trim().replace(/\/$/, '');
  }
  if (process.env.PUBLIC_SITE_URL?.trim()) {
    return `${process.env.PUBLIC_SITE_URL.trim().replace(/\/$/, '')}/donate`;
  }
  return 'https://buy.stripe.com/test_placeholder';
}

function resolveAiProvider() {
  const grokKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (grokKey?.trim()) {
    const baseUrl = (process.env.XAI_API_BASE_URL || 'https://api.x.ai/v1').trim().replace(/\/$/, '');
    return {
      apiKey: grokKey.trim(),
      apiUrl: `${baseUrl}/chat/completions`,
      model: process.env.GROK_MODEL || process.env.XAI_MODEL || 'grok-3-mini',
      providerLabel: 'Grok',
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey?.trim()) {
    return {
      apiKey: openaiKey.trim(),
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      providerLabel: 'OpenAI',
    };
  }

  return null;
}

function getMissingKeyHint() {
  if (process.env.VERCEL) {
    return 'Add XAI_API_KEY or GROK_API_KEY (or OPENAI_API_KEY) in Vercel → Project Settings → Environment Variables, then redeploy.';
  }
  return 'Add XAI_API_KEY, GROK_API_KEY, or OPENAI_API_KEY to server/.env and restart the server.';
}

export async function generateCaption(req, res, next) {
  try {
    const provider = resolveAiProvider();
    if (!provider) {
      return res.status(503).json({ error: `AI API key is not configured. ${getMissingKeyHint()}` });
    }

    const { name, story, status } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Kitten name is required' });
    }

    const donationUrl = getDonationUrl();

    const userPrompt = [
      `Kitten name: ${name.trim()}`,
      `Status: ${status?.trim() || 'Unknown'}`,
      `Story: ${story?.trim() || 'No story provided yet.'}`,
      `Donation URL (use as [DONATE_LINK] in the closing call to action): ${donationUrl}`,
    ].join('\n');

    const response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 400,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = payload.error?.message || `${provider.providerLabel} request failed`;
      return res.status(response.status >= 500 ? 502 : 400).json({ error: message });
    }

    let caption = payload.choices?.[0]?.message?.content?.trim();
    if (!caption) {
      return res.status(502).json({ error: `${provider.providerLabel} returned an empty caption` });
    }

    caption = caption.replace(/\[DONATE_LINK\]/g, donationUrl);
    if (!caption.includes(donationUrl)) {
      caption = `${caption}\n\nSupport our rescue and donate here: ${donationUrl}`;
    }

    res.json({ caption });
  } catch (error) {
    next(error);
  }
}
