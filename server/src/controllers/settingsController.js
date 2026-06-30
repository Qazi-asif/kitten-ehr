import prisma from '../lib/prisma.js';

const SETTINGS_ID = 1;

const DEFAULTS = {
  orgName: 'Pawsitive Transformations',
  missionStatement:
    'Pawsitive Transformations rescues, fosters, and finds loving homes for kittens in need across our community.',
  defaultDonationAmount: 50,
  amazonWishlistUrl: '',
  chewyWishlistUrl: '',
  facebookUrl: '',
  instagramUrl: '',
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
  const { smtpPass, ...rest } = settings;
  return {
    ...rest,
    smtpPassConfigured: Boolean(smtpPass || process.env.SMTP_PASS),
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
    if (amazonWishlistUrl !== undefined) data.amazonWishlistUrl = amazonWishlistUrl;
    if (chewyWishlistUrl !== undefined) data.chewyWishlistUrl = chewyWishlistUrl;
    if (facebookUrl !== undefined) data.facebookUrl = facebookUrl;
    if (instagramUrl !== undefined) data.instagramUrl = instagramUrl;
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
