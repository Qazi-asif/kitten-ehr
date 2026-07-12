import { useEffect, useState } from 'react';
import { Mail, X } from 'lucide-react';
import { sendKittenDocumentsEmail } from '../../services/api';

function EmailDocumentsModal({ open, onClose, kittenId, documents, onSuccess }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTo('');
    setSubject('');
    setMessage('');
    setSelectedIds(documents.map((doc) => doc.id));
    setError('');
  }, [open, documents]);

  function toggleDocument(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id],
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!to.trim()) {
      setError('Recipient email is required.');
      return;
    }

    if (!subject.trim()) {
      setError('Subject is required.');
      return;
    }

    if (selectedIds.length === 0) {
      setError('Select at least one document.');
      return;
    }

    setSending(true);
    try {
      await sendKittenDocumentsEmail(kittenId, {
        to: to.trim(),
        subject: subject.trim(),
        message: message.trim(),
        documentIds: selectedIds,
      });
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Could not send email.');
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">Email Documents</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recipient Email</span>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Kitten medical records"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Message (optional)</span>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a short note for the recipient..."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <fieldset className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Attach Documents
            </legend>
            {documents.length === 0 ? (
              <p className="text-sm text-slate-500">No documents available to send.</p>
            ) : (
              <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-start gap-3 rounded-lg bg-white px-3 py-2">
                    <input
                      id={`email-doc-${doc.id}`}
                      type="checkbox"
                      checked={selectedIds.includes(doc.id)}
                      onChange={() => toggleDocument(doc.id)}
                      className="mt-0.5"
                    />
                    <label htmlFor={`email-doc-${doc.id}`} className="min-w-0 flex-1 cursor-pointer">
                      <span className="block truncate text-sm font-medium text-slate-900">{doc.fileName}</span>
                      <span className="block text-xs text-slate-500">{doc.docType || 'Document'}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || documents.length === 0}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmailDocumentsModal;
