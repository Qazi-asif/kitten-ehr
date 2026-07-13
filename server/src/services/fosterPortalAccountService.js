import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { hashPassword } from '../utils/authUtils.js';
import { splitFullName } from '../utils/personName.js';
import { generatePasswordResetToken } from '../utils/passwordResetTokens.js';
import { getClientIp } from '../utils/requestIp.js';
import { sendTemplatedEmail } from './emailService.js';
import { EMAIL_TEMPLATE_KEYS } from '../constants/emailTemplates.js';

// Creates a limited-access portal User account for a just-created Foster,
// plus a SETUP PasswordResetToken, and fires the set-password email.
// Deliberately NOT wrapped in the same transaction as Foster.create (the
// caller creates the Foster first, on its own) - a problem here (no
// portal role configured, duplicate email) must never roll back or block
// the Foster record itself, which is the load-bearing piece of data. This
// function never throws; it always returns a result object describing
// what happened, so the caller can merge it into the create-Foster
// response without the whole request failing over a portal-account issue.
export async function provisionFosterPortalAccount(foster, req) {
  const email = (foster.email || '').trim().toLowerCase();

  try {
    const portalRole = await prisma.role.findFirst({ where: { isPortalRole: true } });
    if (!portalRole) {
      return {
        ok: false,
        reason:
          'No Foster Portal role is configured. Create one in Settings -> Roles with the portal-role flag set before enabling portal accounts.',
      };
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return {
        ok: false,
        reason: `An account already exists for ${email} - a portal account was not created automatically.`,
      };
    }

    const { firstName, lastName } = splitFullName(foster.name);
    // Never transmitted or logged anywhere - the account is unusable via
    // normal login until the emailed set-password token overwrites this.
    const placeholderPassword = crypto.randomBytes(32).toString('hex');
    const createdIp = getClientIp(req);

    const { user, rawToken } = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash: await hashPassword(placeholderPassword),
          firstName: firstName || foster.name,
          lastName,
          roleId: portalRole.id,
          fosterId: foster.id,
          isActive: true,
        },
      });

      const token = generatePasswordResetToken();

      await tx.passwordResetToken.create({
        data: {
          userId: createdUser.id,
          tokenHash: token.tokenHash,
          purpose: 'SETUP',
          expiresAt: token.expiresAt,
          createdIp,
        },
      });

      return { user: createdUser, rawToken: token.rawToken };
    });

    const baseUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');
    const setPasswordUrl = `${baseUrl}/portal/set-password?token=${rawToken}`;

    // Fire-and-forget, after the transaction has committed - matches the
    // existing pattern (sendApplicationReceivedEmails) of not blocking the
    // response on email delivery. Failures land in EmailLog for staff to
    // find later, same as every other email in the app.
    sendTemplatedEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.FOSTER_PORTAL_SET_PASSWORD,
      toEmail: email,
      variables: {
        fosterName: foster.name,
        setPasswordUrl,
      },
      relatedType: 'Foster',
      relatedId: foster.id,
    }).catch((error) => {
      console.error('Foster portal set-password email failed:', error.message);
    });

    return { ok: true, userId: user.id };
  } catch (error) {
    if (error.code === 'P2002') {
      return {
        ok: false,
        reason: `An account already exists for ${email} - a portal account was not created automatically.`,
      };
    }
    console.error('Foster portal account provisioning failed:', error);
    return { ok: false, reason: 'Portal account creation failed unexpectedly.' };
  }
}

// Reissues a SETUP link for a foster's existing portal account - covers the
// 72-hour expiry window lapsing, or the original email failing to deliver.
// Reuses the exact same token-generation and email-sending logic as
// provisionFosterPortalAccount above, applied to an already-existing User
// row instead of creating a new one. Any previously-issued, still-unused
// tokens for this user are invalidated (usedAt set) in the same transaction
// as the new token is created, so only the newest link is ever redeemable -
// setPassword already rejects a token with usedAt set ("This link has
// already been used"), so this needs no new schema or new check there.
export async function resendFosterPortalSetupLink(foster, req) {
  const email = (foster.email || '').trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { fosterId: foster.id },
      include: { role: true },
    });

    if (!user) {
      return { ok: false, reason: 'No portal account exists for this foster yet.' };
    }
    if (!user.role.isPortalRole) {
      return { ok: false, reason: 'The linked account is not a Foster Portal account.' };
    }
    if (!user.isActive) {
      return { ok: false, reason: 'The linked portal account is inactive.' };
    }

    const createdIp = getClientIp(req);

    const rawToken = await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      const token = generatePasswordResetToken();

      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: token.tokenHash,
          purpose: 'SETUP',
          expiresAt: token.expiresAt,
          createdIp,
        },
      });

      return token.rawToken;
    });

    const baseUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');
    const setPasswordUrl = `${baseUrl}/portal/set-password?token=${rawToken}`;

    // Fire-and-forget, same as provisionFosterPortalAccount - failures land
    // in EmailLog for staff to find later rather than blocking the response.
    sendTemplatedEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.FOSTER_PORTAL_SET_PASSWORD,
      toEmail: email,
      variables: {
        fosterName: foster.name,
        setPasswordUrl,
      },
      relatedType: 'Foster',
      relatedId: foster.id,
    }).catch((error) => {
      console.error('Foster portal resend-setup email failed:', error.message);
    });

    return { ok: true };
  } catch (error) {
    console.error('Foster portal setup-link resend failed:', error);
    return { ok: false, reason: 'Failed to resend the set-password link unexpectedly.' };
  }
}
