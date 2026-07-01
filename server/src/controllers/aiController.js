const SYSTEM_PROMPT =
  'You are an expert social media manager for a cat rescue. Write a highly engaging, emotional, and optimized Facebook/Instagram caption for this kitten. Follow 2026 Meta best practices: start with a hook, use emojis, keep it under 200 words, include 3-5 relevant hashtags. Do not use banned or overly aggressive language.';

export async function generateCaption(req, res, next) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'OpenAI API key is not configured. Add OPENAI_API_KEY to your server .env file.',
      });
    }

    const { name, story, status } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Kitten name is required' });
    }

    const userPrompt = [
      `Kitten name: ${name.trim()}`,
      `Status: ${status?.trim() || 'Unknown'}`,
      `Story: ${story?.trim() || 'No story provided yet.'}`,
    ].join('\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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
      const message = payload.error?.message || 'OpenAI request failed';
      return res.status(response.status >= 500 ? 502 : 400).json({ error: message });
    }

    const caption = payload.choices?.[0]?.message?.content?.trim();
    if (!caption) {
      return res.status(502).json({ error: 'OpenAI returned an empty caption' });
    }

    res.json({ caption });
  } catch (error) {
    next(error);
  }
}
