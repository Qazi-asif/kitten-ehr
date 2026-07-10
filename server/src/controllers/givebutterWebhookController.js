import prisma from '../lib/prisma.js';
import {
  normalizeTransactionPayload,
  resolveKittenContext,
  verifyGivebutterWebhook,
} from '../utils/givebutter.js';
import {
  sendDonationReceivedEmails,
  sendSponsorshipReceivedEmails,
} from '../services/emailService.js';

function donorDisplayName(txn) {
  const fullName = [txn.firstName, txn.lastName].filter(Boolean).join(' ').trim();
  return fullName || 'Supporter';
}

async function findKitten({ kittenId, kittenName }) {
  if (kittenId) {
    const byId = await prisma.kitten.findUnique({ where: { id: kittenId } });
    if (byId) return byId;
  }

  if (kittenName) {
    return prisma.kitten.findFirst({
      where: {
        name: { equals: kittenName, mode: 'insensitive' },
      },
    });
  }

  return null;
}

export async function processGivebutterTransaction(payload) {
  const txn = normalizeTransactionPayload(payload);
  if (!txn.externalId || txn.amount <= 0) {
    return { ok: false, skipped: true, reason: 'missing_transaction_data' };
  }

  const existing = await prisma.transaction.findUnique({
    where: { externalId: txn.externalId },
  });
  if (existing) {
    return { ok: true, duplicate: true, transactionId: existing.id };
  }

  const kittenContext = resolveKittenContext(txn);
  const kitten = kittenContext.isSponsorship
    ? await findKitten(kittenContext)
    : null;

  const donorName = donorDisplayName(txn);
  const description = kitten
    ? `Givebutter sponsorship for ${kitten.name} (${kittenContext.tier})`
    : `Givebutter donation from ${donorName}`;

  const transaction = await prisma.transaction.create({
    data: {
      type: 'INCOME',
      category: kitten ? 'Sponsorship' : 'Donation',
      amount: txn.amount,
      donorName,
      donorEmail: txn.email,
      externalId: txn.externalId,
      description,
      date: txn.transactedAt ? new Date(txn.transactedAt) : new Date(),
      kittenId: kitten?.id ?? null,
    },
  });

  if (kitten) {
    await prisma.sponsorship.create({
      data: {
        kittenId: kitten.id,
        sponsorName: donorName,
        amount: txn.amount,
        tier: kittenContext.tier,
      },
    });

    if (txn.email) {
      sendSponsorshipReceivedEmails({
        transaction,
        donorName,
        donorEmail: txn.email,
        kittenName: kitten.name,
        tier: kittenContext.tier,
      }).catch((error) => {
        console.error('Sponsorship email trigger failed:', error.message);
      });
    }
  } else if (txn.email) {
    sendDonationReceivedEmails({
      transaction,
      donorName,
      donorEmail: txn.email,
    }).catch((error) => {
      console.error('Donation email trigger failed:', error.message);
    });
  }

  return { ok: true, transactionId: transaction.id, sponsorship: Boolean(kitten) };
}

export async function handleGivebutterWebhook(req, res, next) {
  try {
    if (!verifyGivebutterWebhook(req)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const eventName = String(req.body?.event || req.body?.type || '').toLowerCase();
    if (eventName && eventName !== 'transaction.succeeded') {
      return res.json({ ok: true, ignored: true, event: eventName });
    }

    const result = await processGivebutterTransaction(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
