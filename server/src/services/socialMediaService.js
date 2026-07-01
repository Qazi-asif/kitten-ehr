import prisma from '../lib/prisma.js';

const SETTINGS_ID = 1;
const GRAPH_API = 'https://graph.facebook.com/v21.0';

export function getPublicSiteBase(req) {
  if (process.env.PUBLIC_SITE_URL) return process.env.PUBLIC_SITE_URL.replace(/\/$/, '');
  if (process.env.CLIENT_URL) return process.env.CLIENT_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (req?.get?.('host')) {
    const protocol = req.protocol || 'https';
    return `${protocol}://${req.get('host')}`;
  }
  return 'http://localhost:5173';
}

export function resolvePublicAssetUrl(path, req) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const base = getPublicSiteBase(req);
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function getSocialPostingConfig() {
  let settings = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
  if (!settings) {
    settings = await prisma.settings.create({ data: { id: SETTINGS_ID } });
  }

  const envEnabled = process.env.SOCIAL_POSTING_ENABLED === 'true';
  const pageId = settings.facebookPageId || process.env.FACEBOOK_PAGE_ID || '';
  const accessToken = settings.facebookPageAccessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '';
  const instagramAccountId = settings.instagramBusinessAccountId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '';

  return {
    enabled: Boolean(settings.socialPostingEnabled || envEnabled),
    pageId,
    accessToken,
    instagramAccountId,
    facebookProfileUrl: settings.facebookUrl || '',
    instagramProfileUrl: settings.instagramUrl || '',
    orgName: settings.orgName || 'Pawsitive Transformations',
  };
}

async function graphRequest(path, { method = 'GET', params = {} } = {}) {
  const url = new URL(`${GRAPH_API}/${path.replace(/^\//, '')}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, { method });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.error) {
    const message = payload.error?.message || `Graph API request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

async function resolveInstagramAccountId(pageId, accessToken, existingId) {
  if (existingId) return existingId;
  const payload = await graphRequest(`${pageId}`, {
    params: {
      fields: 'instagram_business_account',
      access_token: accessToken,
    },
  });
  return payload.instagram_business_account?.id || '';
}

export async function testSocialConnection(config = null) {
  const resolved = config || await getSocialPostingConfig();
  if (!resolved.pageId || !resolved.accessToken) {
    return {
      ok: false,
      message: 'Add Facebook Page ID and Page Access Token in Settings → Organization.',
    };
  }

  const page = await graphRequest(`${resolved.pageId}`, {
    params: { fields: 'name,id', access_token: resolved.accessToken },
  });
  const instagramAccountId = await resolveInstagramAccountId(
    resolved.pageId,
    resolved.accessToken,
    resolved.instagramAccountId,
  );

  return {
    ok: true,
    message: `Connected to Facebook page "${page.name}".${instagramAccountId ? ' Instagram Business account detected.' : ' Link Instagram to this page for IG posting.'}`,
    pageName: page.name,
    instagramAccountId,
  };
}

async function postToFacebook({ message, imageUrl, pageId, accessToken }) {
  if (imageUrl) {
    const payload = await graphRequest(`${pageId}/photos`, {
      method: 'POST',
      params: {
        url: imageUrl,
        caption: message,
        access_token: accessToken,
      },
    });
    return { postId: payload.id || payload.post_id || '', url: '' };
  }

  const payload = await graphRequest(`${pageId}/feed`, {
    method: 'POST',
    params: {
      message,
      access_token: accessToken,
    },
  });
  return { postId: payload.id || '', url: '' };
}

async function postToInstagram({ caption, imageUrl, igUserId, accessToken }) {
  if (!imageUrl) {
    throw new Error('Instagram requires a public photo URL on the kitten profile.');
  }

  const container = await graphRequest(`${igUserId}/media`, {
    method: 'POST',
    params: {
      image_url: imageUrl,
      caption,
      access_token: accessToken,
    },
  });

  const published = await graphRequest(`${igUserId}/media_publish`, {
    method: 'POST',
    params: {
      creation_id: container.id,
      access_token: accessToken,
    },
  });

  return { postId: published.id || container.id || '', url: '' };
}

function buildManualShareResult(platform, caption, kittenPublicUrl, profileUrl) {
  if (platform === 'FACEBOOK') {
    return {
      platform,
      status: 'manual',
      message: 'Open Facebook share dialog to finish posting.',
      shareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(kittenPublicUrl)}&quote=${encodeURIComponent(caption)}`,
      postId: '',
    };
  }

  if (platform === 'INSTAGRAM') {
    return {
      platform,
      status: 'manual',
      message: profileUrl
        ? 'Instagram API not configured — copy the caption and post from the Instagram app.'
        : 'Add your Instagram profile URL in Settings, then post from the Instagram app.',
      shareUrl: profileUrl || '',
      postId: '',
    };
  }

  return {
    platform,
    status: 'skipped',
    message: 'Automatic posting is not configured for this platform yet.',
    shareUrl: '',
    postId: '',
  };
}

export async function publishKittenSocialPost({
  caption,
  targets,
  imageUrl,
  kittenPublicUrl,
  req,
}) {
  const config = await getSocialPostingConfig();
  const results = [];
  const apiReady = config.enabled && config.pageId && config.accessToken;

  if (!apiReady) {
    return {
      configured: false,
      results: targets.map((platform) => buildManualShareResult(
        platform,
        caption,
        kittenPublicUrl,
        platform === 'INSTAGRAM' ? config.instagramProfileUrl : config.facebookProfileUrl,
      )),
    };
  }

  let instagramAccountId = config.instagramAccountId;
  if (targets.includes('INSTAGRAM')) {
    instagramAccountId = await resolveInstagramAccountId(
      config.pageId,
      config.accessToken,
      instagramAccountId,
    );
    if (instagramAccountId && instagramAccountId !== config.instagramAccountId) {
      await prisma.settings.update({
        where: { id: SETTINGS_ID },
        data: { instagramBusinessAccountId: instagramAccountId },
      }).catch(() => {});
    }
  }

  for (const platform of targets) {
    try {
      if (platform === 'FACEBOOK') {
        const posted = await postToFacebook({
          message: caption,
          imageUrl,
          pageId: config.pageId,
          accessToken: config.accessToken,
        });
        results.push({
          platform,
          status: 'posted',
          message: 'Published to Facebook.',
          postId: posted.postId,
          shareUrl: config.facebookProfileUrl || '',
        });
        continue;
      }

      if (platform === 'INSTAGRAM') {
        if (!instagramAccountId) {
          results.push({
            platform,
            status: 'failed',
            message: 'No Instagram Business account linked to this Facebook page.',
            shareUrl: config.instagramProfileUrl || '',
            postId: '',
          });
          continue;
        }

        const posted = await postToInstagram({
          caption,
          imageUrl,
          igUserId: instagramAccountId,
          accessToken: config.accessToken,
        });
        results.push({
          platform,
          status: 'posted',
          message: 'Published to Instagram.',
          postId: posted.postId,
          shareUrl: config.instagramProfileUrl || '',
        });
        continue;
      }

      results.push(buildManualShareResult(platform, caption, kittenPublicUrl, ''));
    } catch (error) {
      results.push({
        platform,
        status: 'failed',
        message: error.message,
        shareUrl: platform === 'FACEBOOK'
          ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(kittenPublicUrl)}&quote=${encodeURIComponent(caption)}`
          : config.instagramProfileUrl || '',
        postId: '',
      });
    }
  }

  return { configured: true, results };
}

export function parseSocialDeliveryLog(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
