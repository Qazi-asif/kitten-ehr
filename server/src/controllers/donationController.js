import prisma from '../lib/prisma.js';
import { sendDonationReceivedEmails } from '../services/emailService.js';
import { createDonationSchema, formatZodError } from '../validations/donationValidation.js';

export async function createPublicDonation(req, res, next) {
  try {
    const parsed = createDonationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const { donorName, donorEmail, amount, message } = parsed.data;

    const transaction = await prisma.transaction.create({
      data: {
        type: 'INCOME',
        category: 'Donation',
        amount,
        donorName,
        donorEmail,
        description: message || `Online donation from ${donorName}`,
        date: new Date(),
      },
    });

    sendDonationReceivedEmails({ transaction, donorName, donorEmail }).catch((error) => {
      console.error('Donation email trigger failed:', error.message);
    });

    res.status(201).json({
      message: 'Thank you for your donation!',
      transactionId: transaction.id,
    });
  } catch (error) {
    next(error);
  }
}
