import { PrismaClient } from '../src/generated/prisma/index.js';
import bcrypt from 'bcryptjs';
import { DEFAULT_ROLES, PERMISSIONS } from '../src/constants/permissions.js';
import { DEFAULT_EMAIL_TEMPLATES } from '../src/constants/emailTemplates.js';

const prisma = new PrismaClient();

async function seedAuth() {
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();

  await prisma.permission.createMany({
    data: PERMISSIONS.map(({ key, label, module }) => ({ key, label, module })),
  });

  const permissionRecords = await prisma.permission.findMany();
  const permissionByKey = Object.fromEntries(permissionRecords.map((p) => [p.key, p.id]));

  for (const roleDef of DEFAULT_ROLES) {
    const role = await prisma.role.create({
      data: {
        name: roleDef.name,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
      },
    });

    await prisma.rolePermission.createMany({
      data: roleDef.permissions.map((key) => ({
        roleId: role.id,
        permissionId: permissionByKey[key],
      })),
    });
  }

  const superAdminRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });

  await prisma.user.create({
    data: {
      email: 'admin@pawsitivetransformations.org',
      passwordHash: await bcrypt.hash('Admin123!', 12),
      firstName: 'Ashley',
      lastName: 'Martinez',
      roleId: superAdminRole.id,
      isActive: true,
    },
  });

  console.log('Seeded roles, permissions, and admin user (admin@pawsitivetransformations.org / Admin123!)');
}

async function seedSettings() {
  await prisma.settings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      orgName: 'Pawsitive Transformations',
      missionStatement:
        'Pawsitive Transformations rescues, fosters, and finds loving homes for kittens in need across our community.',
      defaultDonationAmount: 50,
      amazonWishlistUrl: '',
      chewyWishlistUrl: '',
      facebookUrl: '',
      instagramUrl: '',
    },
    update: {},
  });
}

async function seedEmailTemplates() {
  for (const template of DEFAULT_EMAIL_TEMPLATES) {
    await prisma.emailTemplate.upsert({
      where: { key: template.key },
      create: template,
      update: {
        name: template.name,
        category: template.category,
        description: template.description,
        isSystem: template.isSystem,
      },
    });
  }
  console.log(`Seeded ${DEFAULT_EMAIL_TEMPLATES.length} email templates`);
}

async function main() {
  await seedAuth();
  await seedSettings();
  await seedEmailTemplates();
  await prisma.weightLog.deleteMany();
  await prisma.vaccine.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.vetAppointment.deleteMany();
  await prisma.document.deleteMany();
  await prisma.placement.deleteMany();
  await prisma.kitten.deleteMany();
  await prisma.litter.deleteMany();
  await prisma.foster.deleteMany();
  await prisma.application.deleteMany();
  await prisma.content.deleteMany();
  await prisma.event.deleteMany();
  await prisma.transaction.deleteMany();

  const jane = await prisma.foster.create({
    data: {
      name: 'Jane Smith',
      phone: '555-0100',
      email: 'jane@example.com',
      address: '123 Oak Street',
      emergencyContact: '555-0101',
      experienceLevel: 'Advanced',
      capabilityFlags: 'bottle_babies,medical_cases,large_capacity',
      maxKittens: 4,
      notes: 'Spare bathroom available for kittens',
    },
  });

  const mike = await prisma.foster.create({
    data: {
      name: 'Mike Torres',
      phone: '555-0200',
      email: 'mike@example.com',
      address: '456 Pine Avenue',
      emergencyContact: '555-0201',
      experienceLevel: 'Intermediate',
      capabilityFlags: 'bottle_babies',
      maxKittens: 2,
      notes: 'Experienced bottle feeder',
    },
  });

  const springAlley = await prisma.litter.create({
    data: {
      name: 'Spring Alley Litter',
      intakeDate: new Date('2026-03-01'),
      notes: 'All need bottle feeding',
    },
  });

  const parkingLot = await prisma.litter.create({
    data: {
      name: 'Parking Lot Rescue',
      intakeDate: new Date('2026-02-14'),
      notes: 'Mom not trapped yet',
    },
  });

  const biscuit = await prisma.kitten.create({
    data: {
      name: 'Biscuit',
      status: 'Available for Adoption',
      breed: 'Domestic Shorthair',
      color: 'Brown Tabby',
      sex: 'Female',
      fixedStatus: 'Spayed/Neutered',
      dateOfBirth: new Date('2026-01-15'),
      litterId: springAlley.id,
      currentFosterId: jane.id,
      rescueStory: 'Found in an alley with siblings. Sweet, playful, and ready for a forever home.',
      intakeDate: new Date('2026-02-01'),
      intakeSource: 'Shelter transfer',
      primaryPhotoUrl: '/uploads/biscuit.jpg',
      isListedOnWebsite: true,
      websiteFeaturedComment: 'Sweet tabby girl who loves chin scratches and sunny naps.',
    },
  });

  const gravy = await prisma.kitten.create({
    data: {
      name: 'Gravy',
      status: 'Available for Adoption',
      breed: 'Russian Blue Mix',
      color: 'Grey',
      sex: 'Male',
      fixedStatus: 'Spayed/Neutered',
      dateOfBirth: new Date('2026-01-01'),
      litterId: springAlley.id,
      currentFosterId: jane.id,
      rescueStory: 'Calm and curious grey kitten who loves sunny windowsills.',
      primaryPhotoUrl: '/uploads/gravy.jpg',
      isListedOnWebsite: true,
      websiteFeaturedComment: 'Gentle grey boy with curious eyes and a calm purr.',
    },
  });

  const nugget = await prisma.kitten.create({
    data: {
      name: 'Nugget',
      status: 'Available for Adoption',
      breed: 'Domestic Shorthair',
      color: 'Orange Tabby',
      sex: 'Male',
      fixedStatus: 'Spayed/Neutered',
      dateOfBirth: new Date('2026-01-20'),
      litterId: parkingLot.id,
      currentFosterId: mike.id,
      rescueStory: 'Tiny orange firecracker with a big personality.',
      primaryPhotoUrl: '/uploads/nugget.jpg',
      isListedOnWebsite: true,
      websiteFeaturedComment: 'Tiny orange firecracker full of zoomies and cuddles.',
    },
  });

  await prisma.placement.createMany({
    data: [
      { kittenId: biscuit.id, fosterId: jane.id, intakeDate: new Date('2026-02-01') },
      { kittenId: gravy.id, fosterId: jane.id, intakeDate: new Date('2026-02-05') },
      { kittenId: nugget.id, fosterId: mike.id, intakeDate: new Date('2026-01-20') },
    ],
  });

  await prisma.vaccine.createMany({
    data: [
      {
        kittenId: biscuit.id,
        type: 'FVRCP',
        dateGiven: new Date('2026-02-20'),
        nextDueDate: new Date('2026-03-20'),
        administeredBy: 'Dr. Nguyen',
        notes: 'No adverse reaction',
      },
    ],
  });

  await prisma.medication.create({
    data: {
      kittenId: biscuit.id,
      name: 'Panacur',
      dose: '0.5ml',
      frequency: 'Daily',
      route: 'Oral',
      condition: 'Deworming',
      startDate: new Date('2026-02-15'),
      endDate: new Date('2026-02-20'),
      status: 'Completed',
    },
  });

  await prisma.weightLog.createMany({
    data: [
      { kittenId: biscuit.id, date: new Date('2026-02-10'), weightGrams: 380, weightOz: 13.4, loggedBy: 'Jane Smith' },
      { kittenId: biscuit.id, date: new Date('2026-02-24'), weightGrams: 450, weightOz: 15.9, loggedBy: 'Jane Smith', notes: 'Gaining well' },
      { kittenId: biscuit.id, date: new Date('2026-03-10'), weightGrams: 520, weightOz: 18.3, loggedBy: 'Jane Smith' },
    ],
  });

  await prisma.application.create({
    data: {
      type: 'Adoption',
      status: 'Under Review',
      formData: JSON.stringify({ applicant: 'Alex Johnson', kitten: 'Gravy' }),
    },
  });

  await prisma.content.createMany({
    data: [
      {
        title: 'Bottle Feeding Basics',
        slug: 'bottle-feeding-basics',
        category: 'Kitten Care',
        body: 'Neonatal kittens need formula every 2-3 hours. Always use kitten-specific formula and warm it to body temperature. Hold the kitten belly-down and allow them to latch at their own pace.',
      },
      {
        title: 'Preparing Your Home for Adoption',
        slug: 'preparing-your-home',
        category: 'Adoption',
        body: 'Before bringing a kitten home, kitten-proof your space. Remove small objects, secure cords, and set up a quiet room with food, water, litter, and a cozy bed.',
      },
      {
        title: 'What to Expect as a Foster',
        slug: 'foster-expectations',
        category: 'Fostering',
        body: 'Fostering saves lives. We provide supplies, medical care, and support. You provide a safe home, daily care, and updates on your foster kitten\'s progress.',
      },
    ],
  });

  await prisma.event.createMany({
    data: [
      {
        title: 'Spring Adoption Fair',
        date: new Date('2026-07-15T11:00:00'),
        location: 'Community Pet Supply Store',
        description: 'Meet adoptable kittens and talk with our foster team.',
        isPublic: true,
      },
      {
        title: 'Foster Orientation',
        date: new Date('2026-07-22T18:30:00'),
        location: 'Pawsitive HQ',
        description: 'Learn how to become a bottle-baby foster.',
        isPublic: true,
      },
      {
        title: 'Staff Medical Review',
        date: new Date('2026-07-10T09:00:00'),
        location: 'Internal',
        description: 'Weekly kitten medical check-in.',
        isPublic: false,
      },
    ],
  });

  await prisma.transaction.createMany({
    data: [
      {
        type: 'INCOME',
        category: 'Donation',
        amount: 250,
        description: 'Monthly supporter gift',
        date: new Date('2026-06-28'),
      },
      {
        type: 'EXPENSE',
        category: 'Vet Bill',
        amount: 185,
        description: 'FVRCP booster + exam',
        date: new Date('2026-06-26'),
        kittenId: biscuit.id,
      },
      {
        type: 'INCOME',
        category: 'Sponsorship',
        amount: 500,
        description: 'Named sponsor for June',
        date: new Date('2026-06-24'),
        kittenId: gravy.id,
      },
      {
        type: 'EXPENSE',
        category: 'Food',
        amount: 94.5,
        description: 'Kitten kibble bulk order',
        date: new Date('2026-06-22'),
      },
      {
        type: 'EXPENSE',
        category: 'Supplies',
        amount: 62,
        description: 'Litter, toys, carriers',
        date: new Date('2026-06-20'),
      },
    ],
  });

  console.log('Seeded complete MVP dataset.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
