import { useRef, useState } from 'react';
import { Eye, Trash2, Upload } from 'lucide-react';
import { openApplicationUploadFile } from '../../services/api';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png,.webp,.gif';

const FOSTER_DOC_LABELS = [
  'Foster Agreement',
  'Home Inspection',
  'Reference Check',
  'Other',
];

const ADOPTION_DOC_LABELS = [
  'Adoption Agreement',
  'Veterinary Records',
  'Identification',
  'Other',
];

function ApplicationDocumentsSection({
  applicationId,
  uploads = [],
  applicationType,
  onUpload,
  onDelete,
  uploading = false,
  deletingId = null,
}) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [docLabel, setDocLabel] = useState('');
  const [error, setError] = useState('');
  const [openingId, setOpeningId] = useState(null);

  const labelOptions = applicationType === 'Foster' ? FOSTER_DOC_LABELS : ADOPTION_DOC_LABELS;

  function validateAndSetFile(nextFile) {
    if (!nextFile) return;
    if (nextFile.size > MAX_FILE_BYTES) {
      setError('File must be 5MB or smaller.');
      return;
    }
    setError('');
    setFile(nextFile);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) {
      setError('Choose a file to upload.');
      return;
    }
    if (!docLabel) {
      setError('Select a document type.');
      return;
    }

    try {
      await onUpload({ file, docLabel });
      setFile(null);
      setDocLabel('');
      setError('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (uploadError) {
      setError(uploadError.message || 'Upload failed.');
    }
  }

  async function handleView(uploadId) {
    if (!applicationId) {
      setError('Missing application id.');
      return;
    }
    setOpeningId(uploadId);
    setError('');
    try {
      await openApplicationUploadFile(applicationId, uploadId);
    } catch (viewError) {
      setError(viewError.message || 'Failed to open document.');
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Documents</h3>
      <p className="mt-1 text-sm text-gray-500">
        Attach signed agreements and supporting files to this application.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={(e) => validateAndSetFile(e.target.files?.[0] ?? null)}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            Choose File
          </button>
          {file ? <span className="text-sm text-gray-700">{file.name}</span> : null}
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Document Type</span>
          <select
            value={docLabel}
            onChange={(e) => setDocLabel(e.target.value)}
            disabled={uploading}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-60"
          >
            <option value="">Select document type</option>
            {labelOptions.map((label) => (
              <option key={label} value={label}>{label}</option>
            ))}
          </select>
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={uploading || !file || !docLabel}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {uploading ? 'Uploading...' : 'Upload Document'}
        </button>
      </form>

      {uploads.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
          No documents uploaded yet.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white">
          {uploads.map((upload) => {
            const displayName = upload.fileName || upload.docLabel || 'Document';

            return (
              <li key={upload.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-500">
                    {upload.docLabel || upload.fileType || 'File'}
                    {' · '}
                    {new Date(upload.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleView(upload.id)}
                    disabled={openingId === upload.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {openingId === upload.id ? 'Opening...' : 'View'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(upload.id)}
                    disabled={deletingId === upload.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deletingId === upload.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default ApplicationDocumentsSection;
