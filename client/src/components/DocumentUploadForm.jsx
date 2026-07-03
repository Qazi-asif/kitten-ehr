import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx';

function DocumentUploadForm({ onUpload, uploading }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  function validateAndSetFile(nextFile) {
    if (!nextFile) return;
    if (nextFile.size > MAX_FILE_BYTES) {
      setError('File must be 5MB or smaller.');
      return;
    }
    setError('');
    setFile(nextFile);
  }

  function handleDrag(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
    } else if (event.type === 'dragleave') {
      setDragActive(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    validateAndSetFile(event.dataTransfer.files?.[0]);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!file) {
      setError('Choose a file to upload.');
      return;
    }
    onUpload({ file, docType, description });
    setFile(null);
    setDocType('');
    setDescription('');
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(e) => validateAndSetFile(e.target.files?.[0] ?? null)}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        disabled={uploading}
        className={`w-full rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragActive
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-gray-300 bg-gray-50 hover:border-emerald-500 hover:bg-emerald-50/40'
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <Upload className="mx-auto h-10 w-10 text-emerald-600" />
        <p className="mt-3 text-sm font-semibold text-gray-900">
          Click to Upload or Drag Files Here
        </p>
        <p className="mt-1 text-xs text-gray-500">PDF, Images up to 5MB</p>
        {file && (
          <p className="mt-3 text-sm font-medium text-emerald-700">Selected: {file.name}</p>
        )}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Document Type</span>
          <input
            type="text"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            placeholder="e.g. Vet record, Adoption contract"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Description (optional)</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short note about this file"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={uploading || !file}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Upload Document'}
      </button>
    </form>
  );
}

export default DocumentUploadForm;
