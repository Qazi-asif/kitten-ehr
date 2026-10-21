import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../lib/prisma.js';
import { sendCustomEmail } from './emailService.js';
import { ensureCdnPhotosForKitten } from './photoCdn.js';
import { hashCsv, isSnapshotEligible, kittenToCsvRow, rowsToCsv } from './rescueGroupsCsv.js';
import { evaluateSnapshotGuard, nextBackoffMinutes, outboxDisposition } from './snapshotGuard.js';
import { DEFAULT_BREED_MAP, LOOKUP_VERSION, mapBreed } from './syndicationLookups.js';
import { getRescueGroupsFtpConfig, uploadRescueGroupsSnapshot } from './rescueGroupsFtp.js';

const SNAPSHOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../uploads/syndication');
const REGISTERED_FILE_NAME = process.env.RG_FTP_FILENAME || 'animals.csv';

export async function ensureLookupTables() {
  for (const [sourceValue, targetValue] of DEFAULT_BREED_MAP) {
    await prisma.syndicationLookup.upsert({
      where: {
        kind_sourceValue_version: {
          kind: 'breed',
          sourceValue,
          version: LOOKUP_VERSION,
        },
      },
      create: {
        kind: 'breed',
        sourceValue,
        targetValue,
        version: LOOKUP_VERSION,
      },
      update: { targetValue },
    });
  }
}

async function breedMap() {
  const rows = await prisma.syndicationLookup.findMany({
    where: { kind: 'breed', version: LOOKUP_VERSION },
  });
  return new Map(rows.map((row) => [row.sourceValue, row.targetValue]));
}

function applyBaseUrl() {
  return (process.env.PUBLIC_BASE_URL || process.env.PUBLIC_SITE_URL || '').replace(/\/$/, '');
}

export async function enqueueSyndication(eventType, kittenId = null, db = prisma) {
  await db.syndicationOutbox.create({
    data: { eventType, kittenId },
  });
}

export async function atomicWriteSnapshot(csv, fileName = REGISTERED_FILE_NAME) {
  await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
  const finalPath = path.join(SNAPSHOT_DIR, fileName);
  const tempPath = `${finalPath}.tmp`;
  await fs.writeFile(tempPath, csv, 'utf8');
  await fs.rename(tempPath, finalPath);
  return finalPath;
}

async function lastSuccessfulRun() {
  return prisma.syndicationRun.findFirst({
    where: { status: { in: ['success', 'success_local'] } },
    orderBy: { finishedAt: 'desc' },
  });
}

export async function buildEligibleSnapshot({ override = false } = {}) {
  await ensureLookupTables();
  const kittens = await prisma.kitten.findMany({
    where: { status: 'Available for Adoption', isActive: true },
    include: {
      weightLogs: { orderBy: { date: 'desc' }, take: 1 },
    },
  });

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const lookups = await breedMap();
  const orgName = settings?.orgName || 'Pawsitive Transformations';

  const rows = [];
  for (const kitten of kittens) {
    const prepared = {
      ...kitten,
      latestWeightGrams: kitten.weightLogs[0]?.weightGrams || 0,
    };
    if (!isSnapshotEligible(prepared)) continue;
    const photos = await ensureCdnPhotosForKitten(kitten);
    rows.push(kittenToCsvRow(prepared, {
      orgName,
      applyBaseUrl: applyBaseUrl(),
      photos,
      breedMap: lookups,
    }));
  }

  const csv = rowsToCsv(rows);
  const snapshot = {
    csv,
    rows,
    rowCount: rows.length,
    ids: rows.map((row) => row.externalID),
    fileHash: hashCsv(csv),
  };

  const previous = await lastSuccessfulRun();
  const guard = evaluateSnapshotGuard({
    rowCount: snapshot.rowCount,
    lastSuccessfulCount: previous?.rowCount || 0,
    override,
  });

  return {
    ...snapshot,
    guard,
    previous,
    mapBreed: (value) => mapBreed(value, lookups),
  };
}

async function alertConsecutiveFailures(count, errorMessage) {
  if (count < 3) return;
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const to = settings?.adminNotifyEmail;
  if (!to) return;
  await sendCustomEmail({
    toEmail: to,
    subject: 'RescueGroups syndication failed 3 times',
    html: `<p>Syndication has failed ${count} consecutive times.</p><p>${errorMessage || ''}</p>`,
    text: `Syndication has failed ${count} consecutive times. ${errorMessage || ''}`,
    templateKey: 'syndication.alert',
    relatedType: 'Syndication',
  });
}

export async function runSyndication({ override = false, trigger = 'manual' } = {}) {
  const previous = await lastSuccessfulRun();
  const lastRun = await prisma.syndicationRun.findFirst({ orderBy: { startedAt: 'desc' } });
  const consecutive = lastRun?.status === 'success' || lastRun?.status === 'success_local'
    ? 0
    : (lastRun?.consecutiveFailures || 0);

  const run = await prisma.syndicationRun.create({
    data: { status: 'running', consecutiveFailures: consecutive },
  });

  try {
    const snapshot = await buildEligibleSnapshot({ override });
    if (!snapshot.guard.ok) {
      await prisma.syndicationRun.update({
        where: { id: run.id },
        data: {
          status: 'guard_blocked',
          finishedAt: new Date(),
          rowCount: snapshot.rowCount,
          fileHash: snapshot.fileHash,
          errorMessage: snapshot.guard.message,
          overrideUsed: override,
        },
      });
      return { ok: false, blocked: true, reason: snapshot.guard.reason, message: snapshot.guard.message, runId: run.id };
    }

    const snapshotPath = await atomicWriteSnapshot(snapshot.csv);
    const ftp = await uploadRescueGroupsSnapshot(snapshotPath, REGISTERED_FILE_NAME);
    const prevIds = new Set(previous?.idsAdded || previous?.idsRemoved || []);
    const nextIds = new Set(snapshot.ids);
    const idsAdded = snapshot.ids.filter((id) => !prevIds.has(id));
    const idsRemoved = [...prevIds].filter((id) => !nextIds.has(id));
    const remoteStatus = ftp.uploaded ? 'uploaded' : 'skipped_remote';
    const runStatus = ftp.uploaded ? 'success' : 'success_local';
    const ftpNote = ftp.uploaded
      ? `remote=uploaded; file=${ftp.remoteFile}`
      : `remote=skipped_remote; ${ftp.reason}`;

    await prisma.syndicationRun.update({
      where: { id: run.id },
      data: {
        status: runStatus,
        finishedAt: new Date(),
        rowCount: snapshot.rowCount,
        fileHash: snapshot.fileHash,
        idsAdded: snapshot.ids,
        idsRemoved,
        snapshotPath,
        overrideUsed: override,
        consecutiveFailures: 0,
        platformResponse: `trigger=${trigger}; file=${REGISTERED_FILE_NAME}; ${ftpNote}`,
      },
    });

    return {
      ok: true,
      rowCount: snapshot.rowCount,
      fileHash: snapshot.fileHash,
      snapshotPath,
      runId: run.id,
      remote: remoteStatus,
      ftpConfigured: Boolean(getRescueGroupsFtpConfig()),
    };
  } catch (error) {
    const failures = consecutive + 1;
    await prisma.syndicationRun.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        finishedAt: new Date(),
        errorMessage: error.message,
        consecutiveFailures: failures,
      },
    });
    await alertConsecutiveFailures(failures, error.message);
    return { ok: false, error: error.message, runId: run.id };
  }
}

export async function processOutbox(limit = 20) {
  const due = await prisma.syndicationOutbox.findMany({
    where: { processedAt: null, availableAt: { lte: new Date() } },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
  if (due.length === 0) return { processed: 0 };

  const result = await runSyndication({ trigger: 'outbox' });
  const now = new Date();
  const disposition = outboxDisposition(result);

  for (const item of due) {
    if (disposition === 'processed') {
      await prisma.syndicationOutbox.update({
        where: { id: item.id },
        data: { processedAt: now, lastError: '' },
      });
    } else if (disposition === 'retry_guard') {
      await prisma.syndicationOutbox.update({
        where: { id: item.id },
        data: { lastError: result.message || 'Snapshot guard blocked upload' },
      });
    } else {
      const attempts = item.attempts + 1;
      const delayMin = nextBackoffMinutes(attempts);
      await prisma.syndicationOutbox.update({
        where: { id: item.id },
        data: {
          attempts,
          lastError: result.error || 'Syndication failed',
          availableAt: new Date(now.getTime() + delayMin * 60 * 1000),
        },
      });
    }
  }

  return { processed: due.length, result };
}

export async function reconcileListings() {
  const apiKey = process.env.RG_API_KEY?.trim();
  const orgId = process.env.RG_ORG_ID?.trim();
  if (!apiKey || !orgId) {
    return { ok: false, skipped: true, reason: 'RG_API_KEY or RG_ORG_ID is not configured' };
  }

  const rms = await prisma.kitten.findMany({
    where: { status: 'Available for Adoption', isActive: true },
    select: { id: true, externalId: true, name: true, status: true },
  });
  const rmsIds = new Set(rms.map((kitten) => kitten.externalId).filter(Boolean));

  const listed = [];
  const host = process.env.RG_API_HOST || 'https://api.rescuegroups.org/v5';
  let offset = 0;
  const pageLimit = 250;
  while (true) {
    const response = await fetch(`${host}/public/orgs/${orgId}/animals/search/available/?limit=${pageLimit}&start=${offset}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/vnd.api+json',
      },
    });
    if (!response.ok) {
      return { ok: false, error: `RescueGroups API ${response.status}` };
    }
    const body = await response.json();
    const page = Array.isArray(body.data) ? body.data : [];
    listed.push(...page);
    if (page.length < pageLimit) break;
    offset += pageLimit;
  }

  const listedIds = new Set(
    listed.map((row) => row?.attributes?.externalId || row?.attributes?.externalID).filter(Boolean),
  );

  const adoptedInRmsStillListed = rms
    .filter((kitten) => kitten.status !== 'Available for Adoption')
    .map((kitten) => kitten.externalId);

  const stillListedButAdopted = await prisma.kitten.findMany({
    where: {
      status: { in: ['Adopted', 'Transferred', 'Deceased', 'Released'] },
      externalId: { in: [...listedIds] },
    },
    select: { name: true, externalId: true, status: true },
  });

  const drift = {
    listedNotInRmsAvailable: [...listedIds].filter((id) => !rmsIds.has(id)),
    adoptedStillListed: stillListedButAdopted,
  };

  if (stillListedButAdopted.length > 0) {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (settings?.adminNotifyEmail) {
      const lines = stillListedButAdopted
        .map((kitten) => `${kitten.externalId} ${kitten.name} (${kitten.status})`)
        .join('<br>');
      await sendCustomEmail({
        toEmail: settings.adminNotifyEmail,
        subject: 'Listing drift: adopted cats still published',
        html: `<p>These cats are adopted/closed in RMS but still listed on RescueGroups:</p><p>${lines}</p>`,
        text: stillListedButAdopted.map((k) => `${k.externalId} ${k.name}`).join('\n'),
        templateKey: 'syndication.reconcile',
        relatedType: 'Syndication',
      });
    }
  }

  void adoptedInRmsStillListed;
  return { ok: true, drift };
}
