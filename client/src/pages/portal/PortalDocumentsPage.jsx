import { useCallback, useEffect, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import PortalNav from '../../components/portal/PortalNav';
import { fetchMyKittenDocuments, fetchMyPlacements, uploadMyKittenDocument } from '../../services/portalDataApi';
import { formatPacificDisplay } from '../../utils/pacificDate.js';

const DOC_TYPE_OPTIONS = ['Photo Update', 'Vet Record', 'Other'];

function formatDate(value) {
  if (!value) return '—';
  return formatPacificDisplay(value, { withTime: true });
}

function PortalDocumentsPage() {
  const [currentKittens, setCurrentKittens] = useState([]);
  const [selectedKittenId, setSelectedKittenId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loadingKittens, setLoadingKittens] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState(DOC_TYPE_OPTIONS[0]);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadKittens = useCallback(async () => {
    setLoadingKittens(true);
    setError('');
    try {
      const placements = await fetchMyPlacements();
      const current = (Array.isArray(placements) ? placements : [])
        .filter((p) => !p.dischargeDate && p.kitten)
        .map((p) => p.kitten);
      setCurrentKittens(current);
      setSelectedKittenId((prev) => prev || (current[0] ? String(current[0].id) : ''));
    } catch (err) {
      setError(err.message || 'Failed to load your kittens.');
    } finally {
      setLoadingKittens(false);
    }
  }, []);

  const loadDocuments = useCallback(async (kittenId) => {
    if (!kittenId) {
      setDocuments([]);
      return;
    }
    setLoadingDocuments(true);
    setError('');
    try {
      const data = await fetchMyKittenDocuments(kittenId);
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load documents.');
    } finally {
      setLoadingDocuments(false);
    }
  }, []);

  useEffect(() => {
    loadKittens();
  }, [loadKittens]);

  useEffect(() => {
    loadDocuments(selectedKittenId);
  }, [selectedKittenId, loadDocuments]);

  async function handleUpload(event) {
    event.preventDefault();
    if (!file) {
      setError('Please choose a file to upload.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    try {
      await uploadMyKittenDocument(selectedKittenId, { file, docType, description });
      setFile(null);
      setDescription('');
      event.target.reset();
      await loadDocuments(selectedKittenId);
      setSuccess('Document uploaded.');
    } catch (err) {
      setError(err.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-muted">
      <PortalNav />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload photos, vet records, or other files for kittens currently in your care.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {loadingKittens ? (
          <p className="mt-6 text-sm text-slate-500">Loading...</p>
        ) : currentKittens.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">
            You don't have any kittens currently placed with you.
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            <label className="block max-w-xs">
              <span className="mb-1 block text-sm font-medium text-slate-700">Kitten</span>
              <select
                value={selectedKittenId}
                onChange={(e) => setSelectedKittenId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                {currentKittens.map((kitten) => (
                  <option key={kitten.id} value={kitten.id}>
                    {kitten.name}
                  </option>
                ))}
              </select>
            </label>

            <form onSubmit={handleUpload} className="space-y-4 rounded-xl border border-dashed border-slate-300 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Upload a Document</p>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">File</span>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,image/heif,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-700"
                />
              </label>
              <label className="block max-w-xs">
                <span className="mb-1 block text-sm font-medium text-slate-700">Type</span>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  {DOC_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Description (optional)</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </form>

            <section>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Your Uploads for This Kitten</h2>
              <div className="mt-3 space-y-2">
                {loadingDocuments ? (
                  <p className="text-sm text-slate-500">Loading...</p>
                ) : documents.length === 0 ? (
                  <p className="text-sm text-slate-500">No documents uploaded yet.</p>
                ) : (
                  documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{doc.fileName}</p>
                        <p className="text-xs text-slate-500">
                          {doc.docType || 'Document'} · {formatDate(doc.uploadedAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default PortalDocumentsPage;
