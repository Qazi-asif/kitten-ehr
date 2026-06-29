import { useState } from 'react';

function DocumentUploadForm({ onUpload, uploading }) {
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('');
  const [description, setDescription] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    if (!file) return;
    onUpload({ file, docType, description });
    setFile(null);
    setDocType('');
    setDescription('');
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Upload Document</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="mb-1 block text-xs font-medium text-gray-700">File</span>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required className="w-full text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Document Type</span>
          <input type="text" value={docType} onChange={(e) => setDocType(e.target.value)} placeholder="e.g. Vet record" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Description</span>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
      </div>
      <button type="submit" disabled={uploading} className="mt-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </form>
  );
}

export default DocumentUploadForm;
