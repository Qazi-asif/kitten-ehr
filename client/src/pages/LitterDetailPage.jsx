import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchLitterById } from '../services/api';

const statusBadgeClass = {
  'In Foster Care': 'bg-emerald-100 text-emerald-800',
  'Available for Adoption': 'bg-blue-100 text-blue-800',
  Adopted: 'bg-purple-100 text-purple-800',
  Transferred: 'bg-gray-100 text-gray-700',
  Deceased: 'bg-red-100 text-red-800',
};

function StatusBadge({ status }) {
  const badgeClass = statusBadgeClass[status] ?? 'bg-gray-100 text-gray-700';
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}>{status}</span>;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function LitterDetailPage() {
  const { id } = useParams();
  const [litter, setLitter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLitterById(id)
      .then((data) => { setLitter(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [id]);

  if (loading) return <p className="text-gray-500">Loading litter...</p>;

  if (error) {
    return (
      <div>
        <Link to="/admin/litters" className="text-sm font-medium text-emerald-700 hover:text-emerald-900">← Back to litters</Link>
        <p className="mt-4 text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <Link to="/admin/litters" className="inline-flex items-center text-sm font-medium text-emerald-700 hover:text-emerald-900">← Back to litters</Link>
      <h1 className="mt-4 text-3xl font-bold text-gray-900">{litter.name}</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Intake Date</p>
          <p className="mt-1 font-semibold text-gray-900">{formatDate(litter.intakeDate)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Linked Kittens</p>
          <p className="mt-1 font-semibold text-gray-900">{litter.kittens.length}</p>
        </div>
      </div>

      {litter.notes && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Notes</h2>
          <p className="text-gray-600">{litter.notes}</p>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Kittens in this litter</h2>
        </div>
        {litter.kittens.length === 0 ? (
          <p className="px-6 py-8 text-center text-gray-500">No kittens linked yet.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Breed</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Foster</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {litter.kittens.map((kitten) => (
                <tr key={kitten.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium">
                    <Link to={`/admin/kittens/${kitten.id}`} className="text-emerald-700 hover:underline">{kitten.name}</Link>
                  </td>
                  <td className="px-6 py-4 text-sm"><StatusBadge status={kitten.status} /></td>
                  <td className="px-6 py-4 text-sm text-gray-600">{kitten.breed}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{kitten.currentFoster?.name ?? '—'}</td>
                  <td className="px-6 py-4 text-sm">
                    <Link to={`/admin/kittens/${kitten.id}`} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default LitterDetailPage;
