/**
 * One-time local setup for testing the signed-PDF email flow (#31) without
 * real SMTP credentials. Requests a disposable Ethereal test inbox and
 * writes the corresponding fields onto the Settings row (id: 1), so the
 * existing email pipeline in emailService.js picks it up automatically -
 * no code changes, no env vars required.
 *
 * Usage (from the server/ directory, against your local/dev DB):
 *   node scripts/setup-test-smtp.js
 *
 * What this touches: only the SMTP-related Settings fields listed below
 * (emailsEnabled, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass,
 * fromEmail, fromName). Nothing else on the Settings row is modified -
 * this uses a partial Prisma update, not a full overwrite.
 *
 * Requires: a working DATABASE_URL (this writes to your real DB via
 * Prisma) and normal internet access (calls Ethereal's public
 * account-creation API - not reachable from network-restricted sandboxes).
 *
 * To go back to real SMTP later, no code changes are needed - just set
 * emailsEnabled/smtpHost/smtpPort/smtpSecure/smtpUser/smtpPass back to
 * production values (via this same Settings row), or set SMTP_HOST /
 * SMTP_USER / SMTP_PASS environment variables, which already take
 * precedence over these Settings values in emailService.js.
 */
import nodemailer from 'nodemailer';
import prisma from '../src/lib/prisma.js';

async function main() {
  console.log('Requesting a disposable Ethereal test inbox...');
  const account = await nodemailer.createTestAccount();

  const testSmtpFields = {
    emailsEnabled: true,
    smtpHost: account.smtp.host,
    smtpPort: account.smtp.port,
    smtpSecure: account.smtp.secure,
    smtpUser: account.user,
    smtpPass: account.pass,
    fromEmail: account.user,
    fromName: 'Pawsitive Transformations (TEST)',
  };

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: testSmtpFields,
    create: { id: 1, ...testSmtpFields },
  });

  console.log('\nTest SMTP configured on the Settings row:');
  console.log(`  emailsEnabled: ${settings.emailsEnabled}`);
  console.log(`  smtpHost:      ${settings.smtpHost}`);
  console.log(`  smtpPort:      ${settings.smtpPort}`);
  console.log(`  smtpSecure:    ${settings.smtpSecure}`);
  console.log(`  smtpUser:      ${settings.smtpUser}`);
  console.log(`  smtpPass:      ${settings.smtpPass}`);
  console.log(`  fromEmail:     ${settings.fromEmail}`);
  console.log('\nEmails sent while these values are active are captured by Ethereal only -');
  console.log('nothing is delivered to a real inbox. You can log in to see all captured');
  console.log('mail at https://ethereal.email/login using the smtpUser/smtpPass above, but');
  console.log('you likely won\'t need to: the app itself surfaces a direct per-message');
  console.log('preview link (via nodemailer.getTestMessageUrl) whenever the "Email Signed');
  console.log('PDF" button on a signed contract succeeds against this test account.');
  console.log('\nTo revert before real deployment: overwrite these same Settings fields with');
  console.log('production SMTP values, or set SMTP_HOST/SMTP_USER/SMTP_PASS env vars, which');
  console.log('already take precedence over these Settings values with zero code changes.');

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Failed to configure test SMTP:', error.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
