import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { setPassword } from '../controllers/portalAuthController.js';

// Deliberately unauthenticated - mounted in app.js without requirePortalAuth,
// and must be registered before the guarded /api/portal mount so this
// sub-path resolves here first. The token in the request body is the
// credential; there is no session to check yet.
const router = Router();

// Same shape as authRoutes.js's loginLimiter - the token here is a bearer
// credential carried in the URL, so it deserves the same brute-force
// protection as a password.
const setPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

router.post('/set-password', setPasswordLimiter, setPassword);

export default router;
