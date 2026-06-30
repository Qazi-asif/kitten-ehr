import { Link } from 'react-router-dom';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function placementStatus(placement) {
  if (placement.dischargeDate) {
    return placement.dischargeType || placement.kitten?.status || 'Discharged';
  }
  return placement.kitten?.status || 'Active';
}

function FosterPlacementTable({ placements = [] }) {
  if (placements.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
        No placement history yet. Assign a kitten to start tracking this foster home.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Kitten</th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Intake Date</th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Discharge Date</th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {placements.map((placement) => (
            <tr key={placement.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                <Link to={`/admin/kittens/${placement.kitten.id}`} className="text-brand hover:underline">
                  {placement.kitten.name}
                </Link>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{formatDate(placement.intakeDate)}</td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{formatDate(placement.dischargeDate)}</td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{placementStatus(placement)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FosterPlacementTable;
