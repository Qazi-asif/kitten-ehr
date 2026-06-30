import prisma from '../lib/prisma.js';

function getPeriodStarts(now = new Date()) {
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  return { weekStart, monthStart, yearStart };
}

async function sumAmount(type, dateFrom) {
  const result = await prisma.transaction.aggregate({
    where: {
      type,
      date: { gte: dateFrom },
    },
    _sum: { amount: true },
  });

  return result._sum.amount || 0;
}

export async function getDashboardFinanceStats(_req, res, next) {
  try {
    const { weekStart, monthStart, yearStart } = getPeriodStarts();

    const [incomeWeek, incomeMonth, incomeYear, expenseWeek, expenseMonth, expenseYear] =
      await Promise.all([
        sumAmount('INCOME', weekStart),
        sumAmount('INCOME', monthStart),
        sumAmount('INCOME', yearStart),
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

    if (type) where.type = type;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
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
        date: new Date(date),
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

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Transaction not found' });

    await prisma.transaction.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
