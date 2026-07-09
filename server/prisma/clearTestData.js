import prisma from '../src/lib/prisma.js';

async function safeDelete(label, action) {
  try {
    await action();
  } catch (error) {
    if (error.code === 'P2021') {
      console.log(`Skipped ${label} (table not present)`);
      return;
    }
    throw error;
  }
}

async function safeDeleteModel(label, delegate) {
  if (!delegate?.deleteMany) {
    console.log(`Skipped ${label} (model not in Prisma client)`);
    return;
  }
  await safeDelete(label, () => delegate.deleteMany({}));
}

async function main() {
  try {
    await safeDelete('protocol doses', () => prisma.protocolDose.deleteMany({}));
    await safeDelete('active protocols', () => prisma.activeProtocol.deleteMany({}));
    await prisma.onboardingChecklist.deleteMany({});
    await prisma.fosterOnboarding.deleteMany({});
    await prisma.applicationUpload.deleteMany({});
    await prisma.application.deleteMany({});
    await prisma.contract.deleteMany({});
    await prisma.contentCompletion.deleteMany({});
    await safeDelete('event RSVPs', () => prisma.eventRSVP.deleteMany({}));
    await safeDelete('event cats', () => prisma.eventCats.deleteMany({}));
    await prisma.emailLog.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.sponsorship.deleteMany({});
    await prisma.update.deleteMany({});
    await prisma.weightLog.deleteMany({});
    await prisma.vaccine.deleteMany({});
    await prisma.medication.deleteMany({});
    await prisma.vetAppointment.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.placement.deleteMany({});
    await prisma.kitten.deleteMany({});
    await prisma.litter.deleteMany({});
    await prisma.foster.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.content.deleteMany({});
    await safeDeleteModel('social posts', prisma.socialPost);
    await safeDeleteModel('wishlists', prisma.wishlist);
    await safeDelete('protocol drugs', () => prisma.protocolDrug.deleteMany({}));
    await safeDelete('protocols', () => prisma.protocol.deleteMany({}));
    console.log('All sample data cleared successfully!');
    console.log('Preserved: admin users, roles, settings, and email templates.');
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
