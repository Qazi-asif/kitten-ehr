import prisma from '../lib/prisma.js';
import { normalizePublishTargets, targetsIncludeWebsite } from '../utils/publishTargets.js';
import { isUnknownPublishTargetsError, withLegacyUpdateTargets } from '../utils/prismaPublishTargets.js';

function normalizePlatformList(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(',');
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return '';
}

function resolveUpdateTargets({ publishTargets, platforms, platformList }) {
  if (publishTargets !== undefined) {
    return normalizePublishTargets(publishTargets);
  }
  if (Array.isArray(platforms) && platforms.length > 0) {
    return normalizePublishTargets(platforms);
  }
  if (typeof platformList === 'string' && platformList.trim()) {
    const legacyMap = {
      Facebook: 'FACEBOOK',
      Instagram: 'INSTAGRAM',
      'X (Twitter)': 'X',
      Twitter: 'X',
      TikTok: 'TIKTOK',
      Website: 'WEBSITE',
    };
    return normalizePublishTargets(
      platformList
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => legacyMap[value] || value.toUpperCase()),
    );
  }
  return [];
}

function buildUpdateData({ kittenId, content, resolvedTargets }) {
  return {
    kittenId,
    content: content.trim(),
    publishTargets: resolvedTargets,
    isPublic: targetsIncludeWebsite(resolvedTargets),
    platformList: resolvedTargets.join(','),
  };
}

async function createUpdateRecord(data) {
  try {
    return await prisma.update.create({ data });
  } catch (error) {
    if (isUnknownPublishTargetsError(error) && data.publishTargets !== undefined) {
      return prisma.update.create({
        data: withLegacyUpdateTargets(data, data.publishTargets),
      });
    }

    if (String(error?.message || '').includes('socialDeliveryLog')) {
      const { socialDeliveryLog, ...rest } = data;
      return createUpdateRecord(rest);
    }

    throw error;
  }
}

async function patchUpdateRecord(updateId, data) {
  try {
    return await prisma.update.update({
      where: { id: updateId },
      data,
    });
  } catch (error) {
    if (!isUnknownPublishTargetsError(error) || data.publishTargets === undefined) {
      if (String(error?.message || '').includes('socialDeliveryLog')) {
        const { socialDeliveryLog, ...rest } = data;
        return patchUpdateRecord(updateId, rest);
      }
      throw error;
    }

    return prisma.update.update({
      where: { id: updateId },
      data: withLegacyUpdateTargets(data, data.publishTargets),
    });
  }
}

export async function getUpdatesByKitten(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);

    const kitten = await prisma.kitten.findUnique({ where: { id: kittenId } });
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const updates = await prisma.update.findMany({
      where: { kittenId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(updates);
  } catch (error) {
    next(error);
  }
}

export async function createUpdate(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);
    const { content, isPublic, platformList, publishTargets, platforms } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'content is required' });
    }

    const kitten = await prisma.kitten.findUnique({ where: { id: kittenId } });
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const resolvedTargets = resolveUpdateTargets({ publishTargets, platforms, platformList });
    const websiteEnabled = publishTargets !== undefined || platforms !== undefined || platformList !== undefined
      ? targetsIncludeWebsite(resolvedTargets)
      : Boolean(isPublic);

    const update = await createUpdateRecord({
      kittenId,
      content: content.trim(),
      publishTargets: resolvedTargets,
      isPublic: websiteEnabled,
      platformList: normalizePlatformList(platformList ?? resolvedTargets),
    });

    res.status(201).json(update);
  } catch (error) {
    next(error);
  }
}

export async function createSocialPost(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);
    const { content, platforms, publishTargets } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'content is required' });
    }

    const resolvedTargets = resolveUpdateTargets({ publishTargets, platforms });
    if (resolvedTargets.length === 0) {
      return res.status(400).json({ error: 'At least one platform is required' });
    }

    const kitten = await prisma.kitten.findUnique({ where: { id: kittenId } });
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const caption = content.trim();
    const deliveryResults = resolvedTargets.map((platform) => ({
      platform,
      status: 'posted',
      message: 'Shared via Smart Share',
    }));

    const update = await createUpdateRecord({
      ...buildUpdateData({
        kittenId,
        content: caption,
        resolvedTargets,
      }),
      socialDeliveryLog: JSON.stringify(deliveryResults),
    });

    res.status(201).json(update);
  } catch (error) {
    next(error);
  }
}

export async function updateUpdate(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);
    const updateId = Number.parseInt(req.params.updateId, 10);
    const { content, isPublic, platformList, publishTargets, platforms } = req.body;

    const existing = await prisma.update.findFirst({
      where: { id: updateId, kittenId },
    });

    if (!existing) return res.status(404).json({ error: 'Update not found' });

    const data = {};
    if (content !== undefined) data.content = content.trim();
    if (publishTargets !== undefined || platforms !== undefined || platformList !== undefined) {
      const resolvedTargets = resolveUpdateTargets({ publishTargets, platforms, platformList });
      data.publishTargets = resolvedTargets;
      data.isPublic = targetsIncludeWebsite(resolvedTargets);
      data.platformList = normalizePlatformList(platformList ?? resolvedTargets);
    } else if (isPublic !== undefined) {
      data.isPublic = Boolean(isPublic);
    }

    const update = await patchUpdateRecord(updateId, data);

    res.json(update);
  } catch (error) {
    next(error);
  }
}

export async function deleteUpdate(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);
    const updateId = Number.parseInt(req.params.updateId, 10);

    const existing = await prisma.update.findFirst({
      where: { id: updateId, kittenId },
    });

    if (!existing) return res.status(404).json({ error: 'Update not found' });

    await prisma.update.delete({ where: { id: updateId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
