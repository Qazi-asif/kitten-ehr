import prisma from '../lib/prisma.js';
import { sendCustomEmail } from '../services/emailService.js';
import { escapeHtml } from '../utils/htmlEscape.js';
import { loadFileBytes } from '../utils/loadFileBytes.js';

function failStatus(result) {
  if (result?.skipped) return 503;
  return 502;
}

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

    const normalizedIds = documentIds
      .map((id) => Number.parseInt(id, 10))
      .filter((id) => !Number.isNaN(id));
    if (normalizedIds.length === 0) {
      return res.status(400).json({ error: 'Invalid document selection' });
    }

    const kitten = await prisma.kitten.findUnique({
      where: { id: kittenId },
      select: { id: true, name: true },
    });
    if (!kitten) {
      return res.status(404).json({ error: 'Kitten not found' });
    }

    const documents = await prisma.document.findMany({
      where: { id: { in: normalizedIds }, kittenId },
      orderBy: { uploadedAt: 'asc' },
    });

    if (documents.length !== normalizedIds.length) {
      return res.status(400).json({ error: 'One or more selected documents were not found for this kitten' });
    }

    const attachments = [];
    for (const document of documents) {
      const loaded = await loadFileBytes(document.fileUrl);
      if (!loaded?.content) {
        return res.status(422).json({
          error: `Could not load file for “${document.fileName}”. The email was not sent.`,
        });
      }
      attachments.push({
        filename: document.fileName || `document-${document.id}`,
        content: loaded.content,
        contentType: loaded.contentType,
      });
    }

    const note = (message || '').trim();
    const fileList = documents
      .map((doc) => `<li>${escapeHtml(doc.fileName || 'Document')}</li>`)
      .join('');
    const innerHtml = `
<p>Records for <strong>${escapeHtml(kitten.name)}</strong> are attached.</p>
${note ? `<p>${escapeHtml(note).replace(/\n/g, '<br>')}</p>` : ''}
<p>Attached files:</p>
<ul>${fileList}</ul>`;

    const result = await sendCustomEmail({
      toEmail: to.trim(),
      subject: subject.trim(),
      html: innerHtml,
      text: [
        `Records for ${kitten.name} are attached.`,
        note,
        `Attached files: ${documents.map((doc) => doc.fileName).join(', ')}`,
      ].filter(Boolean).join('\n\n'),
      attachments,
      templateKey: 'kitten.documents',
      relatedType: 'Kitten',
      relatedId: kitten.id,
    });

    if (!result?.ok) {
      return res.status(failStatus(result)).json({
        error: result?.errorMessage || result?.error || 'Email was not dispatched.',
      });
    }

    return res.json({
      success: true,
      message: `Email dispatched to ${to.trim()}`,
      messageId: result.messageId || '',
    });
  } catch (error) {
    next(error);
  }
}
