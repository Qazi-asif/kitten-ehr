import prisma from '../lib/prisma.js';

export async function getMedicalByKittenId(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);

    const [kitten, vaccines, medications, vetAppointments] = await Promise.all([
      prisma.kitten.findUnique({ where: { id: kittenId }, select: { id: true } }),
      prisma.vaccine.findMany({ where: { kittenId }, orderBy: { dateGiven: 'desc' } }),
      prisma.medication.findMany({ where: { kittenId }, orderBy: { startDate: 'desc' } }),
      prisma.vetAppointment.findMany({ where: { kittenId }, orderBy: { date: 'desc' } }),
    ]);

    if (!kitten) {
      return res.status(404).json({ error: 'Kitten not found' });
    }

    res.json({ vaccines, medications, vetAppointments });
  } catch (error) {
    next(error);
  }
}

export async function createVaccine(req, res, next) {
  try {
    const {
      kittenId,
      type,
      dateGiven,
      nextDueDate,
      lotNumber,
      manufacturer,
      administeredBy,
      notes,
    } = req.body;

    if (!kittenId || !type || !dateGiven) {
      return res.status(400).json({ error: 'kittenId, type, and dateGiven are required' });
    }

    const parsedKittenId = Number.parseInt(kittenId, 10);
    const kitten = await prisma.kitten.findUnique({ where: { id: parsedKittenId } });
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const vaccine = await prisma.vaccine.create({
      data: {
        kittenId: parsedKittenId,
        type,
        dateGiven: new Date(dateGiven),
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        lotNumber: lotNumber ?? '',
        manufacturer: manufacturer ?? '',
        administeredBy: administeredBy ?? '',
        notes: notes ?? '',
      },
    });

    res.status(201).json(vaccine);
  } catch (error) {
    next(error);
  }
}

export async function createVetAppointment(req, res, next) {
  try {
    const {
      kittenId,
      date,
      clinic,
      vetName,
      reason,
      apptType,
      diagnosis,
      treatment,
      followUpDate,
      notes,
    } = req.body;

    if (!kittenId || !date) {
      return res.status(400).json({ error: 'kittenId and date are required' });
    }

    const parsedKittenId = Number.parseInt(kittenId, 10);
    const kitten = await prisma.kitten.findUnique({ where: { id: parsedKittenId } });
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const appointment = await prisma.vetAppointment.create({
      data: {
        kittenId: parsedKittenId,
        date: new Date(date),
        clinic: clinic ?? '',
        vetName: vetName ?? '',
        reason: reason ?? '',
        apptType: apptType ?? '',
        diagnosis: diagnosis ?? '',
        treatment: treatment ?? '',
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        notes: notes ?? '',
      },
    });

    res.status(201).json(appointment);
  } catch (error) {
    next(error);
  }
}

export async function createMedication(req, res, next) {
  try {
    const {
      kittenId,
      name,
      dose,
      frequency,
      route,
      condition,
      startDate,
      endDate,
      status,
      notes,
    } = req.body;

    if (!kittenId || !name || !startDate) {
      return res.status(400).json({ error: 'kittenId, name, and startDate are required' });
    }

    const parsedKittenId = Number.parseInt(kittenId, 10);
    const kitten = await prisma.kitten.findUnique({ where: { id: parsedKittenId } });
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const medication = await prisma.medication.create({
      data: {
        kittenId: parsedKittenId,
        name,
        dose: dose ?? '',
        frequency: frequency ?? '',
        route: route ?? '',
        condition: condition ?? '',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: status ?? 'Active',
        notes: notes ?? '',
      },
    });

    res.status(201).json(medication);
  } catch (error) {
    next(error);
  }
}

export async function createMedicalRecord(req, res, next) {
  return createVaccine(req, res, next);
}

export async function updateVaccine(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const existing = await prisma.vaccine.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Vaccine not found' });

    const {
      type, dateGiven, nextDueDate, lotNumber, manufacturer, administeredBy, notes,
    } = req.body;

    const vaccine = await prisma.vaccine.update({
      where: { id },
      data: {
        ...(type != null ? { type } : {}),
        ...(dateGiven != null ? { dateGiven: new Date(dateGiven) } : {}),
        ...(nextDueDate !== undefined ? { nextDueDate: nextDueDate ? new Date(nextDueDate) : null } : {}),
        ...(lotNumber != null ? { lotNumber } : {}),
        ...(manufacturer != null ? { manufacturer } : {}),
        ...(administeredBy != null ? { administeredBy } : {}),
        ...(notes != null ? { notes } : {}),
      },
    });
    res.json(vaccine);
  } catch (error) {
    next(error);
  }
}

export async function deleteVaccine(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const existing = await prisma.vaccine.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Vaccine not found' });
    await prisma.vaccine.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function updateMedication(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const existing = await prisma.medication.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Medication not found' });

    const {
      name, dose, frequency, route, condition, startDate, endDate, status, notes,
    } = req.body;

    const medication = await prisma.medication.update({
      where: { id },
      data: {
        ...(name != null ? { name } : {}),
        ...(dose != null ? { dose } : {}),
        ...(frequency != null ? { frequency } : {}),
        ...(route != null ? { route } : {}),
        ...(condition != null ? { condition } : {}),
        ...(startDate != null ? { startDate: new Date(startDate) } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
        ...(status != null ? { status } : {}),
        ...(notes != null ? { notes } : {}),
      },
    });
    res.json(medication);
  } catch (error) {
    next(error);
  }
}

export async function deleteMedication(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const existing = await prisma.medication.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Medication not found' });
    await prisma.medication.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function updateVetAppointment(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const existing = await prisma.vetAppointment.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Vet appointment not found' });

    const {
      date, clinic, vetName, reason, apptType, diagnosis, treatment, followUpDate, notes,
    } = req.body;

    const appointment = await prisma.vetAppointment.update({
      where: { id },
      data: {
        ...(date != null ? { date: new Date(date) } : {}),
        ...(clinic != null ? { clinic } : {}),
        ...(vetName != null ? { vetName } : {}),
        ...(reason != null ? { reason } : {}),
        ...(apptType != null ? { apptType } : {}),
        ...(diagnosis != null ? { diagnosis } : {}),
        ...(treatment != null ? { treatment } : {}),
        ...(followUpDate !== undefined ? { followUpDate: followUpDate ? new Date(followUpDate) : null } : {}),
        ...(notes != null ? { notes } : {}),
      },
    });
    res.json(appointment);
  } catch (error) {
    next(error);
  }
}

export async function deleteVetAppointment(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const existing = await prisma.vetAppointment.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Vet appointment not found' });
    await prisma.vetAppointment.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
