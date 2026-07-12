import prisma from '../lib/prisma.js';
import { hashPassword } from '../utils/authUtils.js';
import { validatePasswordStrength } from '../utils/passwordPolicy.js';
import { clearCachedAuth } from '../utils/authCache.js';
import { getClientIp } from '../utils/requestIp.js';
import { hashToken } from '../utils/passwordResetTokens.js';

// Redeems a PasswordResetToken (SETUP or RESET purpose) for a Foster Portal
// account. Deliberately unauthenticated - the raw token from the emailed
// link is itself the one-time credential, since the person doesn't have a
// session yet. Single-use: usedAt is checked before redemption and set in
// the same transaction as the password change, so a successful redemption
// can't be replayed.
export async function setPassword(req, res, next) {
  try {
    const { token, password } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'A valid token is required' });
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const tokenHash = hashToken(token);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || !record.user) {
      return res.status(400).json({ error: 'Invalid or expired link' });
    }

    if (record.usedAt) {
      return res.status(400).json({ error: 'This link has already been used' });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This link has expired' });
    }

    if (!record.user.isActive) {
      return res.status(400).json({ error: 'This account is no longer active' });
    }

    const passwordHash = await hashPassword(password);
    const usedIp = getClientIp(req);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date(), usedIp },
      }),
    ]);

    // The user's passwordHash just changed; any cached auth entry for them
    // is now stale (harmless here since they had no valid session yet, but
    // consistent with the invalidate-on-credential-change discipline used
    // elsewhere).
    clearCachedAuth(record.userId);

    return res.json({ message: 'Password set successfully' });
  } catch (error) {
    next(error);
  }
}
