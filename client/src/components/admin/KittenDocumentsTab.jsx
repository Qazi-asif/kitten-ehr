import { useState } from 'react';
import { Mail } from 'lucide-react';
import DocumentUploadForm from '../DocumentUploadForm';
import DocumentsList from '../DocumentsList';
import EmailDocumentsModal from './EmailDocumentsModal';

function KittenDocumentsTab({ kittenId, documents, onUpload, uploading, onDelete }) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  function handleEmailSuccess() {
    setSuccessMessage('Documents sent successfully!');
    setEmailOpen(false);
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {successMessage}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">Document Library</h3>
          <p className="mt-1 text-sm text-gray-500">
            Upload, view, download, or email kitten records and files.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSuccessMessage('');
            setEmailOpen(true);
          }}
          disabled={documents.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Mail className="h-4 w-4" />
          Email Documents
        </button>
      </div>

      <DocumentUploadForm onUpload={onUpload} uploading={uploading} />

      <DocumentsList documents={documents} onDelete={onDelete} />

      <EmailDocumentsModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        kittenId={kittenId}
        documents={documents}
        onSuccess={handleEmailSuccess}
      />
    </div>
  );
}

export default KittenDocumentsTab;
