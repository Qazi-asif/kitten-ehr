import { useState } from 'react';
import { Download, Eye, Trash2 } from 'lucide-react';
import { downloadKittenDocumentFile, getFileUrl, openKittenDocumentFile } from '../services/api';
import { formatPacificDisplay } from '../utils/pacificDate';

// Anonymous /uploads is limited to kitten *image* files only (see server/src/app.js) -
// PDFs and other non-image docs 401 unless fetched through the authenticated
// document stream route. Keep this in sync with that server-side allowlist.
const PUBLIC_UPLOAD_IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;

function isImageDocument(doc) {
  if (doc.fileUrl?.startsWith('data:image/')) return true;
  return PUBLIC_UPLOAD_IMAGE_EXT.test(doc.fileUrl || '');
}

function DocumentsList({ kittenId, documents, onDelete }) {
  const [openingId, setOpeningId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState('');

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
        <p className="text-sm text-gray-500">No documents uploaded yet.</p>
        <p className="mt-1 text-xs text-gray-400">Upload files above to get started.</p>
      </div>
    );
  }

  async function handleView(doc) {
    setError('');
    if (isImageDocument(doc)) {
      window.open(getFileUrl(doc.fileUrl), '_blank', 'noopener,noreferrer');
      return;
    }
    setOpeningId(doc.id);
    try {
      await openKittenDocumentFile(kittenId, doc.id);
    } catch (err) {
      setError(err.message || 'Failed to open document.');
    } finally {
      setOpeningId(null);
    }
  }

  async function handleDownload(doc) {
    if (isImageDocument(doc)) return;
    setError('');
    setDownloadingId(doc.id);
    try {
      await downloadKittenDocumentFile(kittenId, doc.id, doc.fileName);
    } catch (err) {
      setError(err.message || 'Failed to download document.');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">File Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Uploaded</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {documents.map((doc) => {
              const isImage = isImageDocument(doc);

              return (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{doc.fileName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{doc.docType || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{doc.description || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatPacificDisplay(doc.uploadedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleView(doc)}
                        disabled={openingId === doc.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                        title="View document"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {openingId === doc.id ? 'Opening...' : 'View'}
                      </button>
                      {isImage ? (
                        <a
                          href={getFileUrl(doc.fileUrl)}
                          download={doc.fileName}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                          title="Download document"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDownload(doc)}
                          disabled={downloadingId === doc.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Download document"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {downloadingId === doc.id ? 'Downloading...' : 'Download'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDelete(doc.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                        title="Delete document"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DocumentsList;
