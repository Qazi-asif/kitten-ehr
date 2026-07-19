import './loadEnv.js';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
import { requireAuth, requirePortalAuth } from './middleware/authMiddleware.js';
import { getUploadRoot } from './utils/fileStorage.js';
import { createOriginValidator } from './utils/corsOrigins.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;
const isOriginAllowed = createOriginValidator();

// Hostinger's Node hosting sits behind one reverse proxy hop (Passenger).
// Without this, req.ip resolves to the proxy's address for every request,
// which silently breaks per-visitor rate limiting (everyone shares one
// bucket) - not just a nicety, it's load-bearing for the limiters below.
app.set('trust proxy', 1);

app.use(helmet());
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
// burn a slot from the tight 100/window budget even though the request that
// triggered it was correctly exempted.
const isPublicRead = (req) => req.method === 'GET'
  && (req.path.startsWith('/api/public') || req.path.startsWith('/uploads'));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
  skip: (req) => req.headers.authorization?.startsWith('Bearer ') || isPublicRead(req),
});

// Sized for realistic browsing, not just a single page load: loading
// /available (list + one photo request per card) then clicking into ~10-15
// kitten detail pages (each firing its own kitten/photo/updates/wishlist
// fetches plus a settings refetch on every route change) realistically adds
// up to roughly 80-100 requests for one very engaged visitor. 400 leaves
// ~4x headroom over that - generous for shared-IP traffic, while still
// bounding a runaway scraper.
const publicReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
  skip: (req) => req.method !== 'GET',
});

const applicationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many application submissions. Please try again later.' },
});

const donationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many donation submissions. Please try again later.' },
});

app.use(globalLimiter);
app.use('/api/public', publicReadLimiter);
app.use('/uploads', publicReadLimiter);
app.use('/api/public/applications', applicationLimiter);
app.use('/api/public/donations', donationLimiter);

app.use(express.json({ limit: '10mb' }));

app.use('/uploads', express.static(getUploadRoot(), { fallthrough: true }));

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
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api', requireAuth, aiRoutes);

const clientDistPath = path.join(__dirname, '../../client/dist');
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

  if (err.name === 'MulterError') {
    return res.status(400).json({ error: err.message || 'File upload failed' });
  }

  if (err.code?.startsWith('P')) {
    const hint = err.message?.includes('does not exist')
      ? ' Database schema may be out of date — run: cd server && npx prisma db push'
      : '';
    return res.status(500).json({ error: `Database error:${hint} ${err.message}` });
  }

  // In development expose the real error message; in production keep it generic
  // but still include a short hint so the frontend can show something useful.
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    error: isDev ? (err.message || 'Internal Server Error') : 'Internal Server Error',
  });
});

export default app;
