import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';

/**
 * Targeted QA / load-test data purge. Does NOT wipe real production cats.
 *
 * Matches:
 *   - emails @loadtest.kitten-ehr.invalid
 *   - names containing "Load Test", "Mobile QA Smoke", "QA Smoke", "LoadTest"
 *   - event titles matching those patterns
 *
 * Safety: DRY_RUN=1 by default. Set DRY_RUN=0 to delete.
 *
 * Usage:
 *   node scripts/purge-qa-test-data.mjs
 *   DRY_RUN=0 node scripts/purge-qa-test-data.mjs
 */

const DRY_RUN = process.env.DRY_RUN !== '0';

const QA_EMAIL_DOMAIN = 'loadtest.kitten-ehr.invalid';
const QA_NAME_PATTERNS = ['Load Test', 'Mobile QA Smoke', 'QA Smoke', 'LoadTest'];

function nameOrClause(field = 'name') {
  return QA_NAME_PATTERNS.map((pattern) => ({
    [field]: { contains: pattern, mode: 'insensitive' },
  }));
}

function emailIsQa(email) {
  return typeof email === 'string' && email.toLowerCase().endsWith(`@${QA_EMAIL_DOMAIN}`);
}

async function run() {
  console.log('=== QA / load-test data purge ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no deletes). Set DRY_RUN=0 to apply.' : 'LIVE DELETE'}`);
  console.log(`Email domain: @${QA_EMAIL_DOMAIN}`);
  console.log(`Name patterns: ${QA_NAME_PATTERNS.join(', ')}\n`);

  const applicationWhere = {
    OR: [
      { formData: { contains: QA_EMAIL_DOMAIN, mode: 'insensitive' } },
      { kittenOfInterest: { contains: 'Load Test', mode: 'insensitive' } },
      { kittenOfInterest: { contains: 'QA Smoke', mode: 'insensitive' } },
      { kittenOfInterest: { contains: 'Mobile QA', mode: 'insensitive' } },
    ],
  };

  const fosterWhere = {
    OR: [
      { email: { endsWith: `@${QA_EMAIL_DOMAIN}`, mode: 'insensitive' } },
      ...nameOrClause('name'),
    ],
  };

  const kittenWhere = {
    OR: nameOrClause('name'),
  };

  const litterWhere = {
    OR: nameOrClause('name'),
  };

  const eventWhere = {
    OR: [
      ...nameOrClause('title'),
      { description: { contains: 'Load Test', mode: 'insensitive' } },
      { description: { contains: 'QA Smoke', mode: 'insensitive' } },
    ],
  };

  const [applications, fosters, kittens, litters, events] = await Promise.all([
    prisma.application.findMany({
      where: applicationWhere,
      select: { id: true, type: true, kittenOfInterest: true, formData: true },
    }),
    prisma.foster.findMany({
      where: fosterWhere,
      select: { id: true, name: true, email: true },
    }),
    prisma.kitten.findMany({
      where: kittenWhere,
      select: { id: true, name: true, status: true },
    }),
    prisma.litter.findMany({
      where: litterWhere,
      select: { id: true, name: true },
    }),
    prisma.event.findMany({
      where: eventWhere,
      select: { id: true, title: true, date: true },
    }),
  ]);

  // Extra safety: drop any kitten that does not look like QA from a fuzzy match
  // that somehow slipped through (e.g. real cat named oddly). Require a pattern hit.
  const safeKittens = kittens.filter((k) =>
    QA_NAME_PATTERNS.some((p) => k.name.toLowerCase().includes(p.toLowerCase())),
  );
  const safeFosters = fosters.filter(
    (f) =>
      emailIsQa(f.email)
      || QA_NAME_PATTERNS.some((p) => f.name.toLowerCase().includes(p.toLowerCase())),
  );

  console.log(`Applications matched: ${applications.length}`);
  applications.slice(0, 10).forEach((a) => {
    let email = '';
    try {
      const parsed = typeof a.formData === 'string' ? JSON.parse(a.formData || '{}') : (a.formData || {});
      email = parsed.email || parsed.Email || '';
    } catch {
      email = '';
    }
    console.log(`  app #${a.id} ${a.type} interest=${a.kittenOfInterest || '—'} email=${email}`);
  });
  if (applications.length > 10) console.log(`  ... +${applications.length - 10} more`);

  console.log(`\nFosters matched: ${safeFosters.length}`);
  safeFosters.forEach((f) => console.log(`  foster #${f.id} ${f.name} <${f.email}>`));

  console.log(`\nKittens matched: ${safeKittens.length}`);
  safeKittens.forEach((k) => console.log(`  kitten #${k.id} ${k.name} [${k.status}]`));

  console.log(`\nLitters matched: ${litters.length}`);
  litters.forEach((l) => console.log(`  litter #${l.id} ${l.name}`));

  console.log(`\nEvents matched: ${events.length}`);
  events.forEach((e) => console.log(`  event #${e.id} ${e.title}`));

  if (DRY_RUN) {
    console.log('\nDry run complete. No rows deleted.');
    await prisma.$disconnect();
    return;
  }

  const kittenIds = safeKittens.map((k) => k.id);
  const fosterIds = safeFosters.map((f) => f.id);
  const litterIds = litters.map((l) => l.id);
  const applicationIds = applications.map((a) => a.id);
  const eventIds = events.map((e) => e.id);

  const results = [];
  await prisma.$transaction(async (tx) => {
    async function step(label, fn) {
      const { count } = await fn();
      results.push({ label, count });
      console.log(`  ${label.padEnd(40)} deleted: ${count}`);
    }

    if (kittenIds.length) {
      await step('ProtocolDose (by kitten)', () =>
        tx.protocolDose.deleteMany({ where: { activeProtocol: { kittenId: { in: kittenIds } } } }));
      await step('ActiveProtocol', () =>
        tx.activeProtocol.deleteMany({ where: { kittenId: { in: kittenIds } } }));
      await step('Document', () =>
        tx.document.deleteMany({ where: { kittenId: { in: kittenIds } } }));
      await step('WeightLog', () =>
        tx.weightLog.deleteMany({ where: { kittenId: { in: kittenIds } } }));
      await step('Vaccine', () =>
        tx.vaccine.deleteMany({ where: { kittenId: { in: kittenIds } } }));
      await step('Medication', () =>
        tx.medication.deleteMany({ where: { kittenId: { in: kittenIds } } }));
      await step('VetAppointment', () =>
        tx.vetAppointment.deleteMany({ where: { kittenId: { in: kittenIds } } }));
      await step('Update', () =>
        tx.update.deleteMany({ where: { kittenId: { in: kittenIds } } }));
      await step('Sponsorship', () =>
        tx.sponsorship.deleteMany({ where: { kittenId: { in: kittenIds } } }));
      await step('Wishlist (kitten)', () =>
        tx.wishlist.deleteMany({ where: { ownerType: 'KITTEN', ownerId: { in: kittenIds } } }));
      await step('SocialPost', () =>
        tx.socialPost.deleteMany({ where: { kittenId: { in: kittenIds } } }));
      await step('Placement', () =>
        tx.placement.deleteMany({ where: { kittenId: { in: kittenIds } } }));
      await step('EventCats', () =>
        tx.eventCats.deleteMany({ where: { kittenId: { in: kittenIds } } }));
      await step('Contract (kitten)', () =>
        tx.contract.deleteMany({ where: { kittenId: { in: kittenIds } } }));
    }

    if (fosterIds.length) {
      await step('Wishlist (foster)', () =>
        tx.wishlist.deleteMany({ where: { ownerType: 'FOSTER', ownerId: { in: fosterIds } } }));
      await step('Placement (foster)', () =>
        tx.placement.deleteMany({ where: { fosterId: { in: fosterIds } } }));
      await step('Contract (foster)', () =>
        tx.contract.deleteMany({ where: { fosterId: { in: fosterIds } } }));
      await step('Kitten.currentFosterId clear', async () => {
        const { count } = await tx.kitten.updateMany({
          where: { currentFosterId: { in: fosterIds } },
          data: { currentFosterId: null },
        });
        return { count };
      });
      await step('User.fosterId clear', async () => {
        const { count } = await tx.user.updateMany({
          where: { fosterId: { in: fosterIds } },
          data: { fosterId: null },
        });
        return { count };
      });
    }

    // QA onboarding rows keyed by loadtest email (no fosterId FK on FosterOnboarding).
    await step('FosterOnboarding (loadtest email)', () =>
      tx.fosterOnboarding.deleteMany({
        where: { applicantEmail: { endsWith: `@${QA_EMAIL_DOMAIN}`, mode: 'insensitive' } },
      }));


    if (applicationIds.length) {
      await step('ApplicationUpload', () =>
        tx.applicationUpload.deleteMany({ where: { applicationId: { in: applicationIds } } }));
      await step('Contract (application)', () =>
        tx.contract.deleteMany({ where: { applicationId: { in: applicationIds } } }));
      await step('Application', () =>
        tx.application.deleteMany({ where: { id: { in: applicationIds } } }));
    }

    if (kittenIds.length) {
      await step('Kitten', () => tx.kitten.deleteMany({ where: { id: { in: kittenIds } } }));
    }
    if (fosterIds.length) {
      await step('Foster', () => tx.foster.deleteMany({ where: { id: { in: fosterIds } } }));
    }
    if (litterIds.length) {
      await step('Litter', () => tx.litter.deleteMany({ where: { id: { in: litterIds } } }));
    }
    if (eventIds.length) {
      await step('EventRSVP', () =>
        tx.eventRSVP.deleteMany({ where: { eventId: { in: eventIds } } }));
      await step('EventCats (event)', () =>
        tx.eventCats.deleteMany({ where: { eventId: { in: eventIds } } }));
      await step('Event', () => tx.event.deleteMany({ where: { id: { in: eventIds } } }));
    }
  }, { timeout: 120_000, maxWait: 10_000 });

  console.log('\nPurge complete.');
  await prisma.$disconnect();
}

run().catch(async (error) => {
  console.error('Purge failed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
