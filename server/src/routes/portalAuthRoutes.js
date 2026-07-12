import { Router } from 'express';
import { setPassword } from '../controllers/portalAuthController.js';

// Deliberately unauthenticated - mounted in app.js without requirePortalAuth,
// and must be registered before the guarded /api/portal mount so this
// sub-path resolves here first. The token in the request body is the
// credential; there is no session to check yet.
const router = Router();

router.post('/set-password', setPassword);

export default router;
