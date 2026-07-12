import crypto from 'crypto';

const TOKEN_BYTES = 32;
const SETUP_EXPIRY_HOURS = 72;

// Tokens are high-entropy random values we generate (not a low-entropy
// secret like a password), so a fast SHA-256 digest is the right primitive
// here - bcrypt's cost factor exists to slow down brute-forcing a guessable
// secret, which doesn't apply to a 256-bit random token. Shared by token
// issuance (this file) and token redemption (portalAuthController.js) so
// both sides hash the same way, rather than two copies that could drift.
export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// Generates a fresh raw token plus its stored hash and default expiry.
// Callers persist { tokenHash, expiresAt } to PasswordResetToken and email
// the rawToken - the raw value is never written to the database, only the
// hash, so a DB read alone can never produce a usable token.
export function generatePasswordResetToken({ hours = SETUP_EXPIRY_HOURS } = {}) {
  const rawToken = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
  return {
    rawToken,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
  };
}
