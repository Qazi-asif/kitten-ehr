import { resolveCdnFile } from '../services/photoCdn.js';
import {
  buildEligibleSnapshot,
  processOutbox,
  reconcileListings,
  runSyndication,
} from '../services/syndicationService.js';
import fs from 'fs';

export async function getSyndicationPreview(req, res, next) {
  try {
    const override = req.query.override === '1' || req.query.override === 'true';
    const snapshot = await buildEligibleSnapshot({ override });
    res.json({
      rowCount: snapshot.rowCount,
      ids: snapshot.ids,
      fileHash: snapshot.fileHash,
      guard: snapshot.guard,
      csvPreview: snapshot.csv.slice(0, 4000),
    });
  } catch (error) {
    next(error);
  }
}

export async function postSyndicationRun(req, res, next) {
  try {
    const override = Boolean(req.body?.override);
    const result = await runSyndication({ override, trigger: 'manual' });
    const status = result.blocked ? 409 : (result.ok ? 200 : 502);
    res.status(status).json(result);
  } catch (error) {
    next(error);
  }
}

export async function postProcessOutbox(_req, res, next) {
  try {
    const result = await processOutbox();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function postReconcile(_req, res, next) {
  try {
    const result = await reconcileListings();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function serveCdnPhoto(req, res, next) {
  try {
    const absolute = resolveCdnFile(req.params.externalId, req.params.fileName);
    if (!absolute || !fs.existsSync(absolute)) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.sendFile(absolute);
  } catch (error) {
    next(error);
  }
}
