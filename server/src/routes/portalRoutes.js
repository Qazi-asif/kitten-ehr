import { Router } from 'express';

// Foster Portal data routes. Mounted behind requirePortalAuth in app.js, so
// every handler here can trust req.user.fosterId is present and belongs to
// a real, active portal account. No routes yet - own-profile, own-kittens,
// own-placements, and document upload/list land here in the next build
// step. Every handler added must filter exclusively by req.user.fosterId,
// never a client-supplied foster/placement/kitten id, per the approved
// data-scoping plan.
const router = Router();

export default router;
