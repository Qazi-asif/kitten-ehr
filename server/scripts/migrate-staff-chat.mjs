/**
 * One-shot: create All Staff group and attach legacy channelId=general messages.
 * Safe to re-run.
 */
import prisma from '../src/lib/prisma.js';
import { ensureAllStaffConversation } from '../src/controllers/staffChatController.js';

const allStaff = await ensureAllStaffConversation();

const legacy = await prisma.staffChatMessage.findMany({
  where: { conversationId: null },
  orderBy: { createdAt: 'asc' },
});

if (legacy.length) {
  for (const msg of legacy) {
    await prisma.staffChatMessage.update({
      where: { id: msg.id },
      data: { conversationId: allStaff.id, channelId: null },
    });
  }
  console.log(`Migrated ${legacy.length} legacy messages → All Staff (${allStaff.id})`);
} else {
  console.log('No legacy messages to migrate');
}

await prisma.$disconnect();
