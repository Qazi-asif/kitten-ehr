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
};

export async function getSettings(_req, res, next) {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });

    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: SETTINGS_ID, ...DEFAULTS },
      });
    }

    res.json(settings);
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
    } = req.body;

    const data = {};

    if (orgName !== undefined) data.orgName = orgName;
    if (missionStatement !== undefined) data.missionStatement = missionStatement;
    if (defaultDonationAmount !== undefined) {
      data.defaultDonationAmount = Number.parseInt(defaultDonationAmount, 10);
    }
    if (amazonWishlistUrl !== undefined) data.amazonWishlistUrl = amazonWishlistUrl;
    if (chewyWishlistUrl !== undefined) data.chewyWishlistUrl = chewyWishlistUrl;
    if (facebookUrl !== undefined) data.facebookUrl = facebookUrl;
    if (instagramUrl !== undefined) data.instagramUrl = instagramUrl;

    const settings = await prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...DEFAULTS, ...data },
      update: data,
    });

    res.json(settings);
  } catch (error) {
    next(error);
  }
}
