import express from 'express';
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
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import updateRoutes from './routes/updateRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import { requireAuth } from './middleware/authMiddleware.js';
import { createOriginValidator } from './utils/corsOrigins.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;
const isOriginAllowed = createOriginValidator();

app.use(helmet());

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

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const applicationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many application submissions. Please try again later.' },
});

app.use(globalLimiter);
app.use('/api/public/applications', applicationLimiter);

app.use(express.json({ limit: '6mb' }));

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
app.use('/api/settings', settingsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/kittens', requireAuth, kittenRoutes);
app.use('/api/kittens/:kittenId/documents', requireAuth, documentRoutes);
app.use('/api/kittens/:kittenId/updates', requireAuth, updateRoutes);
app.use('/api/kittens/:kittenId/sponsorships', requireAuth, sponsorshipRoutes);
app.use('/api/fosters', requireAuth, fosterRoutes);
app.use('/api/litters', requireAuth, litterRoutes);
app.use('/api/medical', requireAuth, medicalRoutes);
app.use('/api/weights', requireAuth, weightRoutes);
app.use('/api/applications', requireAuth, applicationRoutes);
app.use('/api/content', requireAuth, contentRoutes);
app.use('/api/events', requireAuth, eventRoutes);
app.use('/api/transactions', requireAuth, financeRoutes);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    vercel: Boolean(process.env.VERCEL),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
  });
});

app.use((err, _req, res, _next) => {
  console.error(err.stack || err.message || err);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
