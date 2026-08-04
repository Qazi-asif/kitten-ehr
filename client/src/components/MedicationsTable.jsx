import { formatPacificDisplay } from '../utils/pacificDate';

function formatDate(value) {
  return formatPacificDisplay(value) || '—';
}

function MedicationsTable({ medications, canManage = false, onEdit, onDelete }) {
  const records = medications ?? [];

  if (records.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-500">No medications recorded yet.</p>;
  }

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Name</th>
          <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
          <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Dose</th>
          <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Start Date</th>
          {canManage && (
            <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {records.map((med) => (
          <tr key={med.id}>
            <td className="px-4 py-2 text-sm text-gray-900">{med.name}</td>
            <td className="px-4 py-2 text-sm text-gray-600">{med.status}</td>
            <td className="px-4 py-2 text-sm text-gray-600">{med.dose || '—'}</td>
            <td className="px-4 py-2 text-sm text-gray-600">{formatDate(med.startDate)}</td>
            {canManage && (
              <td className="px-4 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit?.(med)}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete?.(med)}
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

export default MedicationsTable;
