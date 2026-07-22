import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { changePassword, getMe, login } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
  // Count only auth failures (4xx). Successful logins and infrastructure
  // errors (5xx, e.g. Prisma engine panic) must not burn the login quota —
  // otherwise a brief DB outage locks everyone out with 429.
  skipSuccessfulRequests: true,
  requestWasSuccessful: (_req, res) => res.statusCode < 400 || res.statusCode >= 500,
});

router.post('/login', loginLimiter, login);
router.get('/me', requireAuth, getMe);
router.post('/change-password', requireAuth, changePassword);

export default router;
