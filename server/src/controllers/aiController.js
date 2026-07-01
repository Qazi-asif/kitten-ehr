import { getMissingKeyHint, resolveAiProvider } from '../utils/aiProvider.js';
import { createChatCompletion } from '../utils/aiChat.js';

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

export async function generateCaption(req, res, next) {
  try {
    const provider = await resolveAiProvider();
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

    const { payload } = await createChatCompletion(provider, [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);

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
    if (error.status) {
      const status = error.status >= 500 ? 502 : error.status;
      return res.status(status).json({ error: error.message });
    }
    next(error);
  }
}
