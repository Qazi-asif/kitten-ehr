export async function sendKittenDocumentsEmail(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.id, 10);
    const { to, subject, message, documentIds } = req.body;

    if (Number.isNaN(kittenId)) {
      return res.status(400).json({ error: 'Invalid kitten id' });
    }

    if (!to?.trim()) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    if (!subject?.trim()) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'Select at least one document' });
    }

    const normalizedIds = documentIds.map((id) => Number.parseInt(id, 10)).filter((id) => !Number.isNaN(id));
    if (normalizedIds.length === 0) {
      return res.status(400).json({ error: 'Invalid document selection' });
    }

    console.log('Email mock: Sending to', to.trim(), 'with docs:', normalizedIds);

    res.json({ success: true, message: 'Email simulated successfully' });
  } catch (error) {
    next(error);
  }
}
