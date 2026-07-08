import prisma from '../src/lib/prisma.js';

async function main() {
  try {
    await prisma.applicationUpload.deleteMany({});
    await prisma.application.deleteMany({});
    await prisma.contract.deleteMany({});
    await prisma.onboardingChecklist.deleteMany({});
    await prisma.fosterOnboarding.deleteMany({});
    console.log('Test data cleared successfully!');
  } catch (error) {
    console.error(error);
  }
}

main();
