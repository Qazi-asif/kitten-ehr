import prisma from '../lib/prisma.js';

function getPeriodStarts(now = new Date()) {
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  return { weekStart, monthStart, yearStart };
}

function parseDateOnly(value, endOfDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;

  if (endOfDay) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);

  return date;
}

function parseTransactionDate(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function sumAmount(type, dateFrom, category) {
  const where = { type, date: { gte: dateFrom } };
  if (category) where.category = category;

  const result = await prisma.transaction.aggregate({
    where,
    _sum: { amount: true },
  });

  return result._sum.amount || 0;
}

export async function getDashboardFinanceStats(_req, res, next) {
  try {
    const { weekStart, monthStart, yearStart } = getPeriodStarts();

    const [
      incomeWeek,
      incomeMonth,
      incomeYear,
      donationsMonth,
      expenseWeek,
      expenseMonth,
      expenseYear,
    ] = await Promise.all([
      sumAmount('INCOME', weekStart),
      sumAmount('INCOME', monthStart),
      sumAmount('INCOME', yearStart),
      sumAmount('INCOME', monthStart, 'Donation'),
      sumAmount('EXPENSE', weekStart),
      sumAmount('EXPENSE', monthStart),
      sumAmount('EXPENSE', yearStart),
    ]);

    res.json({
      income: {
        week: incomeWeek,
        month: incomeMonth,
        year: incomeYear,
      },
      donations: {
        month: donationsMonth,
      },
      expenses: {
        week: expenseWeek,
        month: expenseMonth,
        year: expenseYear,
      },
      netProfitMonth: incomeMonth - expenseMonth,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllTransactions(req, res, next) {
  try {
    const { type, startDate, endDate } = req.query;
    const where = {};

    if (type) {
      if (!['INCOME', 'EXPENSE'].includes(type)) {
        return res.status(400).json({ error: 'type must be INCOME or EXPENSE' });
      }
      where.type = type;
    }

    if (startDate || endDate) {
      where.date = {};

      if (startDate) {
        const parsedStart = parseDateOnly(startDate);
        if (!parsedStart) return res.status(400).json({ error: 'Invalid startDate' });
        where.date.gte = parsedStart;
      }

      if (endDate) {
        const parsedEnd = parseDateOnly(endDate, true);
        if (!parsedEnd) return res.status(400).json({ error: 'Invalid endDate' });
        where.date.lte = parsedEnd;
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        kitten: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });

    res.json(transactions);
  } catch (error) {
    next(error);
  }
}

export async function createTransaction(req, res, next) {
  try {
    const { type, category, amount, description, date, kittenId } = req.body;

    if (!type || !category || amount == null || !date) {
      return res.status(400).json({ error: 'type, category, amount, and date are required' });
    }

    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return res.status(400).json({ error: 'type must be INCOME or EXPENSE' });
    }

    const parsedAmount = Number.parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const parsedDate = parseTransactionDate(date);
    if (!parsedDate) return res.status(400).json({ error: 'Invalid date' });

    let parsedKittenId = null;
    if (kittenId) {
      parsedKittenId = Number.parseInt(kittenId, 10);
      const kitten = await prisma.kitten.findUnique({ where: { id: parsedKittenId } });
      if (!kitten) return res.status(400).json({ error: 'Kitten not found' });
    }

    const transaction = await prisma.transaction.create({
      data: {
        type,
        category,
        amount: parsedAmount,
        description: description ?? '',
        date: parsedDate,
        kittenId: parsedKittenId,
      },
      include: {
        kitten: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
}

export async function deleteTransaction(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid transaction id' });

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Transaction not found' });

    await prisma.transaction.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
