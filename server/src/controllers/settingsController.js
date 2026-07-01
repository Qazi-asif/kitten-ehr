import prisma from '../lib/prisma.js';
import { testSocialConnection } from '../services/socialMediaService.js';
import { isAiKeyConfiguredInEnv } from '../utils/aiProvider.js';

const SETTINGS_ID = 1;

function normalizeOptionalUrl(value) {
  if (value === undefined) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const DEFAULTS = {
  orgName: 'Pawsitive Transformations',
  missionStatement:
    'Pawsitive Transformations rescues, fosters, and finds loving homes for kittens in need across our community.',
  defaultDonationAmount: 50,
  amazonWishlistUrl: '',
  chewyWishlistUrl: '',
  facebookUrl: '',
  instagramUrl: '',
  socialPostingEnabled: false,
  facebookPageId: '',
  facebookPageAccessToken: '',
  instagramBusinessAccountId: '',
  xaiApiKey: '',
  grokModel: 'grok-3-mini',
  emailsEnabled: false,
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPass: '',
  fromEmail: '',
  fromName: '',
  adminNotifyEmail: '',
};

function sanitizeSettings(settings) {
  const { smtpPass, facebookPageAccessToken, xaiApiKey, ...rest } = settings;
  return {
    ...rest,
    smtpPassConfigured: Boolean(smtpPass || process.env.SMTP_PASS),
    facebookPageAccessTokenConfigured: Boolean(
      facebookPageAccessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
    ),
    xaiApiKeyConfigured: Boolean(xaiApiKey?.trim() || isAiKeyConfiguredInEnv()),
  };
}

export async function getSettings(_req, res, next) {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });

    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: SETTINGS_ID, ...DEFAULTS },
      });
    }

    res.json(sanitizeSettings(settings));
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const {
      orgName,
      missionStatement,
      defaultDonationAmount,
      amazonWishlistUrl,
      chewyWishlistUrl,
      facebookUrl,
      instagramUrl,
      socialPostingEnabled,
      facebookPageId,
      facebookPageAccessToken,
      instagramBusinessAccountId,
      xaiApiKey,
      grokModel,
      emailsEnabled,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
      fromEmail,
      fromName,
      adminNotifyEmail,
    } = req.body;

    const data = {};

    if (orgName !== undefined) {
      if (typeof orgName !== 'string' || !orgName.trim()) {
        return res.status(400).json({ error: 'orgName cannot be empty' });
      }
      data.orgName = orgName.trim();
    }
    if (missionStatement !== undefined) data.missionStatement = missionStatement;
    if (defaultDonationAmount !== undefined) {
      const parsed = Number.parseInt(defaultDonationAmount, 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        return res.status(400).json({ error: 'defaultDonationAmount must be a positive integer' });
      }
      data.defaultDonationAmount = parsed;
    }
    if (amazonWishlistUrl !== undefined) data.amazonWishlistUrl = normalizeOptionalUrl(amazonWishlistUrl);
    if (chewyWishlistUrl !== undefined) data.chewyWishlistUrl = normalizeOptionalUrl(chewyWishlistUrl);
    if (facebookUrl !== undefined) data.facebookUrl = normalizeOptionalUrl(facebookUrl);
    if (instagramUrl !== undefined) data.instagramUrl = normalizeOptionalUrl(instagramUrl);
    if (socialPostingEnabled !== undefined) data.socialPostingEnabled = Boolean(socialPostingEnabled);
    if (facebookPageId !== undefined) data.facebookPageId = String(facebookPageId).trim();
    if (facebookPageAccessToken !== undefined && facebookPageAccessToken !== '') {
      data.facebookPageAccessToken = String(facebookPageAccessToken).trim();
    }
    if (instagramBusinessAccountId !== undefined) {
      data.instagramBusinessAccountId = String(instagramBusinessAccountId).trim();
    }
    if (xaiApiKey !== undefined && xaiApiKey !== '') {
      data.xaiApiKey = String(xaiApiKey).trim();
    }
    if (grokModel !== undefined) {
      const model = String(grokModel).trim();
      data.grokModel = model || 'grok-3-mini';
    }
    if (emailsEnabled !== undefined) data.emailsEnabled = Boolean(emailsEnabled);
    if (smtpHost !== undefined) data.smtpHost = String(smtpHost).trim();
    if (smtpPort !== undefined) {
      const parsed = Number.parseInt(smtpPort, 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        return res.status(400).json({ error: 'smtpPort must be a positive integer' });
      }
      data.smtpPort = parsed;
    }
    if (smtpSecure !== undefined) data.smtpSecure = Boolean(smtpSecure);
    if (smtpUser !== undefined) data.smtpUser = String(smtpUser).trim();
    if (smtpPass !== undefined && smtpPass !== '') data.smtpPass = String(smtpPass);
    if (fromEmail !== undefined) data.fromEmail = String(fromEmail).trim();
    if (fromName !== undefined) data.fromName = String(fromName).trim();
    if (adminNotifyEmail !== undefined) data.adminNotifyEmail = String(adminNotifyEmail).trim();

    const settings = await prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...DEFAULTS, ...data },
      update: data,
    });

    res.json(sanitizeSettings(settings));
  } catch (error) {
    next(error);
  }
}

export async function testSocialSettings(_req, res, next) {
  try {
    const result = await testSocialConnection();
    if (!result.ok) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
}
