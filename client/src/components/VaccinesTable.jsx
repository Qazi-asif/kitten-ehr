import { formatPacificDisplay } from '../utils/pacificDate';

function formatDate(value) {
  return formatPacificDisplay(value) || '—';
}

function VaccinesTable({ vaccines, canManage = false, onEdit, onDelete }) {
  const records = vaccines ?? [];

  if (records.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-500">No vaccinations recorded yet.</p>;
  }

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
          <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Type</th>
          <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Notes</th>
          {canManage && (
            <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {records.map((record) => (
          <tr key={record.id}>
            <td className="px-4 py-2 text-sm text-gray-600">{formatDate(record.dateGiven)}</td>
            <td className="px-4 py-2 text-sm">
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">{record.type}</span>
            </td>
            <td className="px-4 py-2 text-sm text-gray-500">{record.notes || '—'}</td>
            {canManage && (
              <td className="px-4 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit?.(record)}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete?.(record)}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default VaccinesTable;
