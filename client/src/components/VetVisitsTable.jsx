function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function VetVisitsTable({ vetAppointments }) {
  const records = vetAppointments ?? [];

  if (records.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-500">No vet visits recorded yet.</p>;
  }

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
          <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Clinic</th>
          <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Vet</th>
          <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Reason</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {records.map((appt) => (
          <tr key={appt.id}>
            <td className="px-4 py-2 text-sm text-gray-600">{formatDate(appt.date)}</td>
            <td className="px-4 py-2 text-sm text-gray-900">{appt.clinic || '—'}</td>
            <td className="px-4 py-2 text-sm text-gray-600">{appt.vetName || '—'}</td>
            <td className="px-4 py-2 text-sm text-gray-600">{appt.reason || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default VetVisitsTable;
