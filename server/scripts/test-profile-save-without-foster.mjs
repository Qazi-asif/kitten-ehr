import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';
import { updateKittenSchema } from '../src/validations/kittenValidation.js';

const kittenId = 25;
const stamp = `profile-save-test ${new Date().toISOString()}`;

const payload = { notes: stamp };
const parsed = updateKittenSchema.safeParse(payload);
const rejected = updateKittenSchema.safeParse({ notes: stamp, currentFosterId: 9 });

console.log('=== Schema: save without currentFosterId ===');
console.log('success:', parsed.success);
if (!parsed.success) {
  console.log('errors:', parsed.error.issues);
  process.exit(1);
}

console.log('\n=== Schema: save WITH currentFosterId (should fail) ===');
console.log('success:', rejected.success);
if (rejected.success) {
  console.log('FAIL: currentFosterId should be rejected');
  process.exit(1);
}
console.log('rejected as expected:', rejected.error.issues.map((i) => i.message).join('; '));

const before = await prisma.kitten.findUnique({
  where: { id: kittenId },
  select: { id: true, name: true, notes: true },
});

const updated = await prisma.kitten.update({
  where: { id: kittenId },
  data: parsed.data,
  select: { id: true, name: true, notes: true },
});

console.log('\n=== Live DB update (kitten 25 / Scrabble) ===');
console.log('before notes:', before.notes);
console.log('after notes:', updated.notes);
console.log('save succeeded:', updated.notes === stamp);

await prisma.$disconnect();
