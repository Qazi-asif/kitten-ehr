function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function WeightLogsTable({ logs, canManage = false, onEdit, onDelete }) {
  if (logs.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-500">No weight logs yet.</p>;
  }

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date &amp; Time</th>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Weight (g)</th>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Weight (oz)</th>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Change</th>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Logged By</th>
          {canManage && (
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 bg-white">
        {logs.map((log, index) => {
          const previous = logs[index + 1];
          const change = previous ? log.weightGrams - previous.weightGrams : null;

          return (
            <tr key={log.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{formatDateTime(log.date)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-gray-900">{Math.round(log.weightGrams)}g</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{log.weightOz.toFixed(1)}oz</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                {change === null ? '—' : (
                  <span className={change >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                    {change >= 0 ? '+' : ''}{Math.round(change)}g
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{log.loggedBy || '—'}</td>
              {canManage && (
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit?.(log)}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(log)}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default WeightLogsTable;
