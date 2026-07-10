import prisma from '../lib/prisma.js';
import { DEFAULTS } from './settingsController.js';
import { PUBLIC_SETTINGS_SELECT, toPublicSettings } from '../utils/publicSettings.js';
import {
  buildPublicAvailableKittenWhereClause,
  buildPublicWebsiteWhereClause,
} from '../utils/publishTargets.js';
import { isPhotoDocument, photoDocumentOrderBy } from '../utils/photoDocuments.js';
import {
  GENERIC_KITTEN_PHOTO_FALLBACK,
  isResolvablePhotoUrl,
  normalizeKittenPhotoUrl,
} from '../utils/resolveKittenPhotoUrl.js';
import { getCachedResponse, setCachedResponse } from '../utils/responseCache.js';
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

async function enrichPublicKittensWithPhotos(kittens) {
  if (kittens.length === 0) return kittens;

  const needsDocLookup = kittens.filter((kitten) => !isResolvablePhotoUrl(kitten.primaryPhotoUrl));
  if (needsDocLookup.length === 0) {
    return kittens.map((kitten) => {
      const normalized = normalizeKittenPhotoUrl(kitten.primaryPhotoUrl, kitten.name);
      return normalized
        ? { ...kitten, primaryPhotoUrl: normalized }
        : { ...kitten, primaryPhotoUrl: normalizeKittenPhotoUrl(null, kitten.name) || GENERIC_KITTEN_PHOTO_FALLBACK };
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
      return { ...kitten, primaryPhotoUrl: normalized };
    }

    const documentPhoto = photoByKittenId.get(kitten.id);
    if (documentPhoto) {
      return { ...kitten, primaryPhotoUrl: documentPhoto };
    }

    const nameFallback = normalizeKittenPhotoUrl(null, kitten.name);
    return { ...kitten, primaryPhotoUrl: nameFallback || GENERIC_KITTEN_PHOTO_FALLBACK };
  });
}

function resolvePublicKittenPhoto(kitten, documentPhoto = null) {
  const normalized = normalizeKittenPhotoUrl(kitten.primaryPhotoUrl, kitten.name);
  if (normalized) return normalized;
  if (documentPhoto) return documentPhoto;
  return normalizeKittenPhotoUrl(null, kitten.name) || GENERIC_KITTEN_PHOTO_FALLBACK;
}

export async function getPublicKittens(req, res, next) {
  try {
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : undefined;

    const cacheKey = `public-kittens:${limit ?? 'all'}`;
    const cached = getCachedResponse(cacheKey, PUBLIC_KITTENS_TTL_MS);
    if (cached) {
      return res.json(cached);
    }

    const kittens = await prisma.kitten.findMany({
      where: publicAvailableKittenFilter,
      select: publicKittenSelect,
      orderBy: { id: 'asc' },
      ...(limit ? { take: limit } : {}),
    });
    const enriched = await enrichPublicKittensWithPhotos(kittens);

    setCachedResponse(cacheKey, enriched);
    res.json(enriched);
  } catch (error) {
    next(error);
  }
}

export async function getPublicKittenById(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    const kitten = await prisma.kitten.findFirst({
      where: { id, ...publicAvailableKittenFilter },
      select: publicKittenSelect,
    });

    if (!kitten) {
      return res.status(404).json({ error: 'Kitten not found' });
    }

    const [enriched] = await enrichPublicKittensWithPhotos([kitten]);
    res.json(enriched);
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
      },
    });
    res.json(events);
  } catch (error) {
    next(error);
  }
}

export async function getPublicKittenPhotos(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    const kitten = await prisma.kitten.findFirst({
      where: { id, ...publicAvailableKittenFilter },
      select: { id: true, primaryPhotoUrl: true },
    });

    if (!kitten) {
      return res.status(404).json({ error: 'Kitten not found' });
    }

    const documents = await prisma.document.findMany({
      where: { kittenId: id },
      orderBy: [{ isPrimaryPhoto: 'desc' }, { sortOrder: 'asc' }, { uploadedAt: 'desc' }],
      select: {
        id: true,
        fileUrl: true,
        docType: true,
        isPrimaryPhoto: true,
        uploadedAt: true,
      },
    });

    const photos = documents.filter(
      (doc) =>
        doc.isPrimaryPhoto ||
        doc.fileUrl.startsWith('data:image/') ||
        /Photo/i.test(doc.docType || '') ||
        /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.fileUrl),
    );

    const gallery = [];
    const seen = new Set();
    const resolvedPrimary = resolvePublicKittenPhoto(kitten);

    if (resolvedPrimary) {
      gallery.push({
        id: 'primary',
        fileUrl: resolvedPrimary,
        isPrimaryPhoto: true,
      });
      seen.add(resolvedPrimary);
    }

    for (const photo of photos) {
      if (seen.has(photo.fileUrl)) continue;
      gallery.push(photo);
      seen.add(photo.fileUrl);
    }

    res.json(gallery);
  } catch (error) {
    next(error);
  }
}

export async function getPublicKittenUpdates(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    const kitten = await prisma.kitten.findFirst({
      where: { id, ...publicAvailableKittenFilter },
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
    // port 465 = direct SSL; everything else (587, 25, etc.) = STARTTLS
    const secure = port === 465 || process.env.SMTP_SECURE === 'true' || settings?.smtpSecure === true;
    const orgName = settings?.orgName || 'Pawsitive Transformations';

    const transportConfig = {
      host: smtpHost,
      port,
      secure,
      auth: { user: smtpUser, pass: smtpPass },
      // Tighten TLS for STARTTLS connections without using requireTLS,
      // which can cause handshake failures on some hosted environments.
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
