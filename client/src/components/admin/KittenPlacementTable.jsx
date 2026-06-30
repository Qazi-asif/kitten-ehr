import { Link } from 'react-router-dom';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function placementStatus(placement) {
  if (placement.dischargeDate) {
    return placement.dischargeType || placement.kitten?.status || 'Discharged';
  }
  return 'Active';
}

function KittenPlacementTable({ placements = [] }) {
  if (placements.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
        No foster placement history recorded for this kitten yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Foster Home</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Intake Date</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Discharge Date</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {placements.map((placement) => (
            <tr key={placement.id}>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                <Link to={`/admin/fosters/${placement.foster.id}`} className="text-emerald-700 hover:underline">
                  {placement.foster.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{formatDate(placement.intakeDate)}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{formatDate(placement.dischargeDate)}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{placementStatus(placement)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default KittenPlacementTable;
