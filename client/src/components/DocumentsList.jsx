import { getFileUrl } from '../services/api';

function DocumentsList({ documents, onDelete }) {
  if (documents.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-500">No documents uploaded yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">File Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Type</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Description</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Uploaded</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{doc.fileName}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{doc.docType || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{doc.description || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {new Date(doc.uploadedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-sm">
                <a
                  href={getFileUrl(doc.fileUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="mr-3 font-medium text-emerald-700 hover:underline"
                >
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => onDelete(doc.id)}
                  className="font-medium text-red-600 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DocumentsList;
