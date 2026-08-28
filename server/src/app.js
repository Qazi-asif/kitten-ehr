import './loadEnv.js';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import kittenRoutes from './routes/kittenRoutes.js';
import fosterRoutes from './routes/fosterRoutes.js';
import litterRoutes from './routes/litterRoutes.js';
import medicalRoutes from './routes/medicalRoutes.js';
import weightRoutes from './routes/weightRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import sponsorshipRoutes from './routes/sponsorshipRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import updateRoutes from './routes/updateRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import emailTemplateRoutes from './routes/emailTemplateRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import contractRoutes from './routes/contractRoutes.js';
import contractTemplateRoutes from './routes/contractTemplateRoutes.js';
import onboardingRoutes from './routes/onboardingRoutes.js';
import protocolRoutes from './routes/protocolRoutes.js';
import protocolLibraryRoutes from './routes/protocolLibraryRoutes.js';
import socialPostRoutes from './routes/socialPostRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import portalAuthRoutes from './routes/portalAuthRoutes.js';
import portalRoutes from './routes/portalRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import { requireAuth, requirePortalAuth } from './middleware/authMiddleware.js';
import { getUploadRoot } from './utils/fileStorage.js';
import { createOriginValidator } from './utils/corsOrigins.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;
const isOriginAllowed = createOriginValidator();

// Prefer server/public (Hostinger Node app root) so Git deploy updates the SPA
// without a separate client build step. Fall back to ../../client/dist for local monorepo.
function resolveClientDistPath() {
  const candidates = [
    path.join(__dirname, '../public'),
    path.join(__dirname, '../../client/dist'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }
  return candidates[0];
}

// Hostinger's Node hosting sits behind one reverse proxy hop (Passenger).
// Without this, req.ip resolves to the proxy's address for every request,
// which silently breaks per-visitor rate limiting (everyone shares one
// bucket) - not just a nicety, it's load-bearing for the limiters below.
app.set('trust proxy', 1);

// Default helmet() CSP blocks the third-party donation widgets embedded on
// the public Donate page (Givebutter/PayPal). Domains below match
// SecureWidget.jsx's ALLOWED_HOSTS sanitization allowlist. Stripe hosts are
// retained because Givebutter checkout loads Stripe.js under the hood —
// they are not for a standalone Stripe donation link (removed from Settings).
// Venmo needs no entry: its link is a plain <a> (CSP doesn't govern anchor
// navigation) and its QR code is stored as a data: URI, already covered by
// the existing img-src.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: [
          "'self'",
          'https://widgets.givebutter.com',
          'https://js.givebutter.com',
          'https://js.stripe.com',
        ],
        connectSrc: [
          "'self'",
          'https://givebutter.com',
          'https://widgets.givebutter.com',
          'https://js.givebutter.com',
          'https://api.givebutter.com',
          'https://js.stripe.com',
          'https://api.stripe.com',
        ],
        frameSrc: [
          "'self'",
          'https://givebutter.com',
          'https://widgets.givebutter.com',
          'https://js.stripe.com',
          'https://hooks.stripe.com',
        ],
        imgSrc: [
          "'self'",
          'data:',
          'https://givebutter.com',
          'https://widgets.givebutter.com',
          'https://givebutter.s3.amazonaws.com',
          'https://js.stripe.com',
          'https://www.paypal.com',
          'https://www.paypalobjects.com',
        ],
        // PayPal's donate button is a real <form> POSTing to paypal.com -
        // without this, the browser blocks the submission outright (default
        // form-action is 'self' only). Givebutter checkout also posts off-site.
        formAction: ["'self'", 'https://www.paypal.com', 'https://givebutter.com'],
      },
    },
  }),
);
app.use(compression());

app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }
      console.warn('Blocked CORS origin:', origin);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

// Public GET reads (kitten list/detail/photo, settings, content, events,
// stats, wishlists) are cacheable, non-abuse-prone traffic - a single
// visitor browsing a handful of kittens fires a photo request per card plus
// a settings refetch per page nav, so the general-purpose limiter below is
// far too tight for them. POST routes under /api/public (applications,
// donations, contact, rsvp) are NOT skipped here and stay governed by
// globalLimiter (plus their own stricter limiters below where present).
// /uploads is included because getPublicKittenPhoto 302-redirects there for
// non-base64-stored photos - without this, that redirect target would still
// burn a slot from the tight budget even though the request that
// triggered it was correctly exempted.
const isPublicRead = (req) => req.method === 'GET'
  && (req.path.startsWith('/api/public') || req.path.startsWith('/uploads'));

// Do NOT skip on a bare "Authorization: Bearer …" header — any client can
// send a fake Bearer and bypass the global budget, amplifying Hostinger load.
// Authenticated /api traffic is covered by authenticatedLimiter below; public
// GETs stay exempt via isPublicRead.
const isAuthenticatedApiPath = (req) =>
  req.path.startsWith('/api') && !req.path.startsWith('/api/public');

// Catch-all for traffic that is neither a public GET nor an authenticated API
// path (e.g. public POSTs that don't have a dedicated limiter). Sized for
// ~4000+ visitors/day with campaign bursts and imperfect proxy IP bucketing.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
  skip: (req) => isPublicRead(req) || isAuthenticatedApiPath(req),
});

// Public browsing: kitten cards fire a photo request each; a mobile session
// can easily reach hundreds of GETs. Shared campus/cafe Wi‑Fi can represent
// dozens of real visitors behind one IP during a launch push.
const publicReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
  skip: (req) => req.method !== 'GET',
});

// Staff dashboard / admin SPA: concurrent GET bursts during a busy intake day.
const authenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
  skip: (req) => !req.path.startsWith('/api') || req.path.startsWith('/api/public'),
});

const applicationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Campaign days: hundreds of real applicants; some share one mobile gateway IP.
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many application submissions. Please try again later.' },
  skip: () => process.env.LOAD_TEST_BYPASS_RATE_LIMIT === '1',
});

const donationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many donation submissions. Please try again later.' },
});

app.use(globalLimiter);
app.use('/api/public', publicReadLimiter);
app.use('/uploads', publicReadLimiter);
app.use(authenticatedLimiter);
app.use('/api/public/applications', applicationLimiter);
app.use('/api/public/donations', donationLimiter);

// 2mb covers signature data URLs without allowing multi-photo JSON bombs that
// spike Hostinger RAM. File uploads still go through multer (5mb/file).
app.use(express.json({ limit: '2mb' }));

// Application uploads are sensitive (IDs, forms). Never serve them anonymously.
app.use('/uploads/applications', (req, res) => {
  res.status(401).json({ error: 'Authentication required' });
});

// Anonymous /uploads is limited to kitten and event *image* files only
// (public cards / admin thumbnails / event banners). PDFs and other docs
// require authenticated document stream routes.
const PUBLIC_UPLOAD_IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;
app.use('/uploads', (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const relativePath = decodeURIComponent(req.path || '');
  const isPublicImagePath = (relativePath.startsWith('/kittens/') || relativePath.startsWith('/events/'))
    && PUBLIC_UPLOAD_IMAGE_EXT.test(relativePath);
  if (!isPublicImagePath) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  return next();
});

// fallthrough:false → missing files should 404 (not leak into SPA). With
// fallthrough:false express.static may pass ENOENT to the error handler —
// map that to a clean 404 instead of a 500 JSON body.
app.use('/uploads', express.static(getUploadRoot(), { fallthrough: false }));
app.use('/uploads', (err, _req, res, next) => {
  if (err && (err.code === 'ENOENT' || err.status === 404)) {
    return res.status(404).end();
  }
  return next(err);
});

let spec = {
  openapi: '3.0.0',
  info: { title: 'Pawsitive Transformations API', version: '1.0' },
  paths: {},
};

try {
  spec = swaggerJsdoc({
    definition: {
      openapi: '3.0.0',
      info: { title: 'Pawsitive Transformations API', version: '1.0' },
      servers: [{ url: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${PORT}` }],
    },
    apis: [path.join(__dirname, 'routes/*.js')],
  });
} catch (error) {
  console.warn('Swagger init skipped:', error.message);
}

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
app.use('/api/auth', authRoutes);
// Unauthenticated set-password redemption - must be registered before the
// requirePortalAuth-guarded /api/portal mount below so this sub-path
// resolves here first, not against the guard.
app.use('/api/portal/auth', portalAuthRoutes);
app.use('/api/portal', requirePortalAuth, portalRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/webhooks', webhookRoutes);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    vercel: Boolean(process.env.VERCEL),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
  });
});

app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/kittens', requireAuth, kittenRoutes);
app.use('/api/kittens', requireAuth, emailRoutes);
app.use('/api/kittens/:kittenId/documents', requireAuth, documentRoutes);
app.use('/api/kittens/:kittenId/updates', requireAuth, updateRoutes);
app.use('/api/kittens/:kittenId/sponsorships', requireAuth, sponsorshipRoutes);
app.use('/api/kittens/:kittenId/protocols', requireAuth, protocolRoutes);
app.use('/api/fosters', requireAuth, fosterRoutes);
app.use('/api/litters', requireAuth, litterRoutes);
app.use('/api/medical', requireAuth, medicalRoutes);
app.use('/api/weights', requireAuth, weightRoutes);
app.use('/api/applications', requireAuth, applicationRoutes);
app.use('/api/contracts', requireAuth, contractRoutes);
app.use('/api/contract-templates', requireAuth, contractTemplateRoutes);
app.use('/api/onboarding', requireAuth, onboardingRoutes);
app.use('/api/content', requireAuth, contentRoutes);
app.use('/api/protocols', requireAuth, protocolLibraryRoutes);
app.use('/api/social-posts', requireAuth, socialPostRoutes);
app.use('/api/wishlists', requireAuth, wishlistRoutes);
app.use('/api/events', requireAuth, eventRoutes);
app.use('/api/transactions', requireAuth, financeRoutes);
app.use('/api/reports', requireAuth, reportsRoutes);
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api', requireAuth, aiRoutes);

const clientDistPath = resolveClientDistPath();
console.log(`[static] Serving SPA from ${clientDistPath}`);
app.use(express.static(clientDistPath));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) { return next(); }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error(err.stack || err.message || err);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Max 5MB.' });
  }

  if (err.code === 'ENOENT') {
    return res.status(404).json({ error: 'Not found' });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({ error: err.message || 'File upload failed' });
  }

  if (err.status === 503 || err.statusCode === 503) {
    return res.status(503).json({ error: err.message || 'Service unavailable' });
  }

  // Prisma Rust-engine panics (e.g. "timer has gone away" on Hostinger) leave
  // the native query engine dead. Do NOT process.exit here — on low-ulimit
  // hosts that causes a Passenger restart loop and perpetual 503s. Return 503
  // and rely on the Rust-free client engine (engineType=client) to avoid the
  // panic class entirely.
  const isPrismaPanic = err?.name === 'PrismaClientRustPanicError'
    || /PrismaClientRustPanicError|timer has gone away|PANIC:/i.test(String(err?.message || err || ''));
  if (isPrismaPanic) {
    console.error('[prisma] Query engine panic — respond 503 without killing the process');
    return res.status(503).json({
      error: 'Database temporarily unavailable. Please wait a few seconds and try again.',
    });
  }

  if (err.code?.startsWith('P')) {
    const hint = err.message?.includes('does not exist')
      ? ' Database schema may be out of date — run: cd server && npx prisma db push'
      : '';
    // Never leak Prisma internals to clients in production (Hostinger).
    const isDev = process.env.NODE_ENV !== 'production';
    return res.status(500).json({
      error: isDev ? `Database error:${hint} ${err.message}` : 'Database error',
    });
  }

  // In development expose the real error message; in production keep it generic
  // but still include a short hint so the frontend can show something useful.
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    error: isDev ? (err.message || 'Internal Server Error') : 'Internal Server Error',
  });
});

export default app;
