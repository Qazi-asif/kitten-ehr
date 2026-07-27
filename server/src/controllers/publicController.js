import prisma from '../lib/prisma.js';
import { DEFAULTS } from './settingsController.js';
import { PUBLIC_SETTINGS_SELECT, toPublicSettings } from '../utils/publicSettings.js';
import {
  buildPublicAvailableKittenWhereClause,
  buildPublicFeaturedKittenWhereClause,
  buildPublicWebsiteWhereClause,
} from '../utils/publishTargets.js';
import { isPhotoDocument, photoDocumentOrderBy, photoDocumentSelect } from '../utils/photoDocuments.js';
import {
  GENERIC_KITTEN_PHOTO_FALLBACK,
  isResolvablePhotoUrl,
  normalizeKittenPhotoUrl,
} from '../utils/resolveKittenPhotoUrl.js';
import { getCachedResponse, setCachedResponse } from '../utils/responseCache.js';
import { resolveStoredFileAbsolutePath } from '../utils/fileStorage.js';
import nodemailer from 'nodemailer';
import { escapeHtml } from '../utils/htmlEscape.js';

// Cache TTLs for public read-only endpoints (milliseconds)
const PUBLIC_KITTENS_TTL_MS = 60 * 1000;  // 1 min — kitten list
const PUBLIC_STATS_TTL_MS  = 60 * 1000;   // 1 min — stat counters

const publicKittenSelect = {
  id: true,
  name: true,
  status: true,
  primaryPhotoUrl: true,
  rescueStory: true,
  dateOfBirth: true,
  sex: true,
  breed: true,
  color: true,
  specialNeeds: true,
  isBondedPair: true,
  bondedWithKittenId: true,
  bondedWithName: true,
  isMedicalSpecialNeeds: true,
  bondedWithKitten: { select: { id: true, name: true } },
};

const publicWebsiteFilter = buildPublicWebsiteWhereClause();
const publicAvailableKittenFilter = buildPublicAvailableKittenWhereClause();
const publicFeaturedKittenFilter = buildPublicFeaturedKittenWhereClause();

const PUBLIC_KITTEN_STATUS_ORDER = {
  'Available for Adoption': 0,
  'In Foster Care': 1,
};

function sortPublicKittens(kittens) {
  return [...kittens].sort((a, b) => {
    const statusDiff =
      (PUBLIC_KITTEN_STATUS_ORDER[a.status] ?? 99) - (PUBLIC_KITTEN_STATUS_ORDER[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
  });
}

// The public API must never embed a kitten's raw base64 photo inline in a
// JSON response - a single photo can be several MB, which is what caused the
// public kitten grid/profile pages to take 6-18+s (sometimes indefinitely)
// to load. When the resolved photo turns out to be a data: URL, point the
// client at the short image-proxy endpoint instead; it decodes the same
// base64 blob server-side and streams it back as a real image response.
// Real URLs (future S3/R2) and local /images or /uploads paths are already
// short and pass through unchanged - no code change needed here once
// object storage is actually configured.
function toPublicPhotoUrl(kittenId, rawUrl) {
  if (typeof rawUrl === 'string' && rawUrl.startsWith('data:image/')) {
    return `/api/public/kittens/${kittenId}/photo`;
  }
  return rawUrl;
}

async function enrichPublicKittensWithPhotos(kittens) {
  if (kittens.length === 0) return kittens;

  const needsDocLookup = kittens.filter((kitten) => !isResolvablePhotoUrl(kitten.primaryPhotoUrl));
  if (needsDocLookup.length === 0) {
    return kittens.map((kitten) => {
      const normalized = normalizeKittenPhotoUrl(kitten.primaryPhotoUrl, kitten.name);
      const resolved = normalized || normalizeKittenPhotoUrl(null, kitten.name) || GENERIC_KITTEN_PHOTO_FALLBACK;
      return { ...kitten, primaryPhotoUrl: toPublicPhotoUrl(kitten.id, resolved) };
    });
  }

  const photoByKittenId = new Map();

  if (needsDocLookup.length > 0) {
    const documents = await prisma.document.findMany({
      where: { kittenId: { in: needsDocLookup.map((kitten) => kitten.id) } },
      orderBy: photoDocumentOrderBy(),
      select: { kittenId: true, fileUrl: true, docType: true, isPrimaryPhoto: true },
    });

    for (const document of documents) {
      if (photoByKittenId.size === needsDocLookup.length) break;
      if (!isPhotoDocument(document)) continue;
      if (!photoByKittenId.has(document.kittenId)) {
        photoByKittenId.set(document.kittenId, document.fileUrl);
      }
    }
  }

  return kittens.map((kitten) => {
    const normalized = normalizeKittenPhotoUrl(kitten.primaryPhotoUrl, kitten.name);
    if (normalized) {
      return { ...kitten, primaryPhotoUrl: toPublicPhotoUrl(kitten.id, normalized) };
    }

    const documentPhoto = photoByKittenId.get(kitten.id);
    if (documentPhoto) {
      return { ...kitten, primaryPhotoUrl: toPublicPhotoUrl(kitten.id, documentPhoto) };
    }

    const nameFallback = normalizeKittenPhotoUrl(null, kitten.name);
    const resolved = nameFallback || GENERIC_KITTEN_PHOTO_FALLBACK;
    return { ...kitten, primaryPhotoUrl: toPublicPhotoUrl(kitten.id, resolved) };
  });
}

export async function getPublicKittens(req, res, next) {
  try {
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : undefined;
    const featuredRaw = typeof req.query.featured === 'string' ? req.query.featured.trim().toLowerCase() : '';
    const featured = featuredRaw === '1' || featuredRaw === 'true';
    const where = featured ? publicFeaturedKittenFilter : publicAvailableKittenFilter;

    const cacheKey = `public-kittens:${featured ? 'featured' : 'available'}:${limit ?? 'all'}`;
    const cached = getCachedResponse(cacheKey, PUBLIC_KITTENS_TTL_MS);
    if (cached) {
      return res.json(cached);
    }

    // Fetch then sort: Available for Adoption first, then In Foster Care; alpha by name.
    // (Prisma cannot express custom status priority + name in one orderBy.)
    const kittens = await prisma.kitten.findMany({
      where,
      select: publicKittenSelect,
      orderBy: { name: 'asc' },
    });
    const sorted = sortPublicKittens(kittens);
    const limited = limit ? sorted.slice(0, limit) : sorted;
    const enriched = await enrichPublicKittensWithPhotos(limited);

    setCachedResponse(cacheKey, enriched);
    res.json(enriched);
  } catch (error) {
    next(error);
  }
}

// Builds the list of public gallery photo URLs for a kitten - one short
// image-proxy reference per photo document, same rationale as
// toPublicPhotoUrl above: never embed raw base64 blobs inline in JSON.
async function buildGalleryPhotoUrls(kittenId) {
  const documents = await prisma.document.findMany({
    where: { kittenId },
    orderBy: photoDocumentOrderBy(),
    select: photoDocumentSelect(),
  });

  return documents
    .filter((document) => isPhotoDocument(document))
    .map((document) => `/api/public/kittens/${kittenId}/photos/${document.id}`);
}

export async function getPublicKittenById(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    // Same status gate as the public listings — never expose In Socialization
    // (or other non-public statuses) via direct profile URL.
    const kitten = await prisma.kitten.findFirst({
      where: { id, ...publicAvailableKittenFilter },
      select: publicKittenSelect,
    });

    if (!kitten) {
      return res.status(404).json({ error: 'Kitten not found' });
    }

    const [enriched] = await enrichPublicKittensWithPhotos([kitten]);
    const galleryPhotoUrls = await buildGalleryPhotoUrls(id);
    res.json({ ...enriched, galleryPhotoUrls });
  } catch (error) {
    next(error);
  }
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], 'base64') };
}

// Serves a kitten's photo as a real image response, decoding a base64-stored
// blob server-side so it never has to travel inline inside a JSON payload.
// Resolution mirrors enrichPublicKittensWithPhotos for a single kitten.
export async function getPublicKittenPhoto(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    const kitten = await prisma.kitten.findFirst({
      where: { id, ...publicWebsiteFilter },
      select: { id: true, name: true, primaryPhotoUrl: true },
    });

    if (!kitten) {
      return res.status(404).end();
    }

    let resolved = normalizeKittenPhotoUrl(kitten.primaryPhotoUrl, kitten.name);

    if (!resolved) {
      const documents = await prisma.document.findMany({
        where: { kittenId: id },
        orderBy: photoDocumentOrderBy(),
        select: photoDocumentSelect(),
      });
      const photoDocument = documents.find((document) => isPhotoDocument(document));
      if (photoDocument) {
        resolved = photoDocument.fileUrl;
      }
    }

    if (!resolved) {
      resolved = normalizeKittenPhotoUrl(null, kitten.name) || GENERIC_KITTEN_PHOTO_FALLBACK;
    }

    if (resolved.startsWith('data:image/')) {
      const parsed = parseDataUrl(resolved);
      if (!parsed) {
        return res.status(404).end();
      }
      res.set('Content-Type', parsed.mime);
      res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      return res.send(parsed.buffer);
    }

    // Prefer serving local disk bytes here so public cards do not depend on
    // anonymous /uploads static access for non-image or locked paths.
    if (resolved.startsWith('/uploads/')) {
      const absolutePath = resolveStoredFileAbsolutePath(resolved);
      if (!absolutePath) {
        return res.status(404).end();
      }
      const ext = resolved.split('.').pop()?.toLowerCase();
      const mimeByExt = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif',
      };
      res.set('Content-Type', mimeByExt[ext] || 'application/octet-stream');
      res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      return res.sendFile(absolutePath, (err) => {
        if (err && !res.headersSent) res.status(404).end();
      });
    }

    // Already a short reference (real object-storage URL once S3/R2 is
    // configured, or a local /images path) - just point the
    // browser at it directly rather than re-encoding.
    return res.redirect(302, resolved);
  } catch (error) {
    next(error);
  }
}

// Streams a single gallery photo document, scoped to a publicly listed
// kitten. Mirrors getPublicKittenPhoto's resolution logic (data URL vs.
// local /uploads path vs. already-short URL) but for an explicit docId
// instead of resolving "the" primary photo.
export async function getPublicKittenGalleryPhoto(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const docId = Number.parseInt(req.params.docId, 10);

    const kitten = await prisma.kitten.findFirst({
      where: { id, ...publicWebsiteFilter },
      select: { id: true },
    });

    if (!kitten) {
      return res.status(404).end();
    }

    const document = await prisma.document.findFirst({
      where: { id: docId, kittenId: id },
      select: photoDocumentSelect(),
    });

    if (!document || !isPhotoDocument(document)) {
      return res.status(404).end();
    }

    const resolved = document.fileUrl;
    if (!resolved) {
      return res.status(404).end();
    }

    if (resolved.startsWith('data:image/')) {
      const parsed = parseDataUrl(resolved);
      if (!parsed) {
        return res.status(404).end();
      }
      res.set('Content-Type', parsed.mime);
      res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      return res.send(parsed.buffer);
    }

    if (resolved.startsWith('/uploads/')) {
      const absolutePath = resolveStoredFileAbsolutePath(resolved);
      if (!absolutePath) {
        return res.status(404).end();
      }
      const ext = resolved.split('.').pop()?.toLowerCase();
      const mimeByExt = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif',
      };
      res.set('Content-Type', mimeByExt[ext] || 'application/octet-stream');
      res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      return res.sendFile(absolutePath, (err) => {
        if (err && !res.headersSent) res.status(404).end();
      });
    }

    return res.redirect(302, resolved);
  } catch (error) {
    next(error);
  }
}

export async function getPublicStats(_req, res, next) {
  try {
    const cached = getCachedResponse('public-stats', PUBLIC_STATS_TTL_MS);
    if (cached) {
      return res.json(cached);
    }

    const [availableKittens, adoptedKittens, activeFosters] = await Promise.all([
      prisma.kitten.count({ where: publicAvailableKittenFilter }),
      prisma.kitten.count({ where: { status: 'Adopted' } }),
      prisma.foster.count({ where: { currentKittens: { some: {} } } }),
    ]);

    const payload = { availableKittens, adoptedKittens, activeFosters };
    setCachedResponse('public-stats', payload);
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

export async function getPublicContent(req, res, next) {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';

    const articles = await prisma.content.findMany({
      where: {
        ...publicWebsiteFilter,
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, slug: true, category: true, body: true, createdAt: true },
    });
    res.json(articles);
  } catch (error) {
    next(error);
  }
}

export async function getPublicContentBySlug(req, res, next) {
  try {
    const article = await prisma.content.findFirst({
      where: { slug: req.params.slug, ...publicWebsiteFilter },
      select: { id: true, title: true, slug: true, body: true, category: true, createdAt: true },
    });

    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  } catch (error) {
    next(error);
  }
}

export async function getPublicEvents(_req, res, next) {
  try {
    const events = await prisma.event.findMany({
      where: {
        ...publicWebsiteFilter,
        isPublic: true,
        status: 'PUBLISHED',
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        title: true,
        slug: true,
        date: true,
        location: true,
        description: true,
        imageUrl: true,
      },
    });
    res.json(events);
  } catch (error) {
    next(error);
  }
}

export async function getPublicKittenUpdates(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    const kitten = await prisma.kitten.findFirst({
      where: { id, ...publicWebsiteFilter },
      select: { id: true },
    });

    if (!kitten) {
      return res.status(404).json({ error: 'Kitten not found' });
    }

    const updates = await prisma.update.findMany({
      where: { kittenId: id, ...publicWebsiteFilter },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
      },
    });

    res.json(updates);
  } catch (error) {
    next(error);
  }
}

export async function getPublicSettings(_req, res, next) {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: 1 },
      select: PUBLIC_SETTINGS_SELECT,
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: 1, ...DEFAULTS },
        select: PUBLIC_SETTINGS_SELECT,
      });
    }

    // Allow short-lived public caching — settings rarely change.
    // The admin can force a refresh by updating settings.
    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
    res.json(toPublicSettings(settings));
  } catch (error) {
    next(error);
  }
}

export async function submitContactForm(req, res, next) {
  try {
    const { firstName, lastName, email, phone, topic, message } = req.body;

    // Validation
    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({ error: 'First and last name are required.' });
    }
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    if (!topic?.trim() || topic === 'Select an option') {
      return res.status(400).json({ error: 'Please select a topic.' });
    }

    // Load SMTP config — env vars take priority over DB values
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });

    const smtpHost = (process.env.SMTP_HOST || settings?.smtpHost || '').trim();
    const smtpUser = (process.env.SMTP_USER || settings?.smtpUser || '').trim();
    const smtpPass = (process.env.SMTP_PASS || settings?.smtpPass || '').trim();
    const adminEmail = (settings?.adminNotifyEmail || settings?.contactEmail || smtpUser || '').trim();
    const emailsEnabled = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
      || Boolean(settings?.emailsEnabled);

    if (!emailsEnabled) {
      return res.status(503).json({ error: 'Email sending is currently disabled. Please contact us directly.' });
    }
    if (!smtpHost || !smtpUser || !smtpPass) {
      return res.status(503).json({ error: 'Email is not fully configured on the server. Please contact us directly.' });
    }
    if (!adminEmail) {
      return res.status(503).json({ error: 'No recipient email address is configured. Please contact us directly.' });
    }

    const port = Number(process.env.SMTP_PORT || settings?.smtpPort) || 587;
    // Derive secure ONLY from the port — never trust the DB smtpSecure flag
    // because it can be stale or incorrectly set.
    // 465 = direct SSL (secure:true), 587/25/2525 = STARTTLS (secure:false).
    const secure = port === 465;
    const orgName = settings?.orgName || 'Pawsitive Transformations';

    const transportConfig = {
      host: smtpHost,
      port,
      secure,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    };

    const transporter = nodemailer.createTransport(transportConfig);

    const subject = `[Contact Form] ${topic.trim()} — ${firstName.trim()} ${lastName.trim()}`;

    const htmlBody = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#334155;">
  <h2 style="color:#0d9488;margin:0 0 20px;">New Contact Form Message</h2>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:8px 0;font-weight:600;width:120px;color:#64748b;">Name</td><td style="padding:8px 0;">${escapeHtml(firstName.trim())} ${escapeHtml(lastName.trim())}</td></tr>
    <tr><td style="padding:8px 0;font-weight:600;color:#64748b;">Email</td><td style="padding:8px 0;"><a href="mailto:${escapeHtml(email.trim())}" style="color:#0d9488;">${escapeHtml(email.trim())}</a></td></tr>
    ${phone?.trim() ? `<tr><td style="padding:8px 0;font-weight:600;color:#64748b;">Phone</td><td style="padding:8px 0;">${escapeHtml(phone.trim())}</td></tr>` : ''}
    <tr><td style="padding:8px 0;font-weight:600;color:#64748b;">Topic</td><td style="padding:8px 0;">${escapeHtml(topic.trim())}</td></tr>
  </table>
  <div style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
    <p style="margin:0 0 8px;font-weight:600;color:#64748b;">Message</p>
    <p style="margin:0;white-space:pre-wrap;line-height:1.6;">${escapeHtml(message.trim())}</p>
  </div>
  <p style="margin-top:20px;font-size:12px;color:#94a3b8;">Sent via ${escapeHtml(orgName)} contact form</p>
</div>`;

    const textBody = [
      `New contact form message from ${firstName.trim()} ${lastName.trim()}`,
      `Email: ${email.trim()}`,
      phone?.trim() ? `Phone: ${phone.trim()}` : null,
      `Topic: ${topic.trim()}`,
      '',
      message.trim(),
    ].filter(Boolean).join('\n');

    try {
      // Admin notification
      await transporter.sendMail({
        from: `"${orgName} Contact Form" <${smtpUser}>`,
        to: adminEmail,
        replyTo: email.trim(),
        subject,
        text: textBody,
        html: htmlBody,
      });

      // Sender confirmation
      await transporter.sendMail({
        from: `"${orgName}" <${smtpUser}>`,
        to: email.trim(),
        subject: `We received your message — ${orgName}`,
        text: `Hi ${firstName.trim()},\n\nThanks for reaching out! We received your message about "${topic.trim()}" and will be in touch shortly.\n\n${orgName}`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#334155;"><h2 style="color:#0d9488;margin:0 0 16px;">Thanks for reaching out, ${escapeHtml(firstName.trim())}!</h2><p>We received your message about <strong>${escapeHtml(topic.trim())}</strong> and will get back to you as soon as possible.</p><p style="margin-top:20px;font-size:12px;color:#94a3b8;">${escapeHtml(orgName)}</p></div>`,
      });
    } catch (smtpError) {
      // Return a descriptive error instead of a generic 500
      console.error('Contact form SMTP error:', smtpError.message);
      return res.status(502).json({
        error: `Failed to send email: ${smtpError.message}`,
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Contact form error:', error.message);
    next(error);
  }
}
