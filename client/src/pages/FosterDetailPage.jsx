import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchFosterById } from '../services/api';

const statusBadgeClass = {
  'In Foster Care': 'bg-emerald-100 text-emerald-800',
  'Available for Adoption': 'bg-blue-100 text-blue-800',
  Adopted: 'bg-purple-100 text-purple-800',
  'Medical Hold': 'bg-amber-100 text-amber-800',
};

function StatusBadge({ status }) {
  const badgeClass = statusBadgeClass[status] ?? 'bg-gray-100 text-gray-700';

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
    >
      {status}
    </span>
  );
}

function FosterDetailPage() {
  const { id } = useParams();
  const [foster, setFoster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetchFosterById(id)
      .then((data) => {
        setFoster(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <p className="text-gray-500">Loading foster...</p>;
  }

  if (error) {
    return (
      <div>
        <Link to="/admin/fosters" className="text-sm font-medium text-emerald-700 hover:text-emerald-900">
          ← Back to fosters
        </Link>
        <p className="mt-4 text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/admin/fosters"
        className="inline-flex items-center text-sm font-medium text-emerald-700 hover:text-emerald-900"
      >
        ← Back to fosters
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-gray-900">{foster.name}</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Phone</p>
          <p className="mt-1 font-semibold text-gray-900">{foster.phone}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Email</p>
          <p className="mt-1 font-semibold text-gray-900">{foster.email}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Experience</p>
          <p className="mt-1 font-semibold text-gray-900">{foster.experienceLevel || '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Emergency Contact</p>
          <p className="mt-1 font-semibold text-gray-900">{foster.emergencyContact || '—'}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-500">Address</p>
        <p className="mt-1 font-semibold text-gray-900">{foster.address}</p>
      </div>

      {foster.capabilityFlags && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Capabilities</p>
          <p className="mt-1 text-gray-900">{foster.capabilityFlags.replace(/,/g, ', ')}</p>
        </div>
      )}

      {foster.notes && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Notes</h2>
          <p className="text-gray-600">{foster.notes}</p>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Kittens in foster ({foster.currentKittens.length})
          </h2>
        </div>

        {foster.currentKittens.length === 0 ? (
          <p className="px-6 py-8 text-center text-gray-500">No kittens assigned yet.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Breed</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Color</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {foster.currentKittens.map((kitten, index) => (
                <tr
                  key={kitten.id}
                  className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100'}
                >
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    <Link
                      to={`/admin/kittens/${kitten.id}`}
                      className="text-emerald-700 hover:text-emerald-900 hover:underline"
                    >
                      {kitten.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <StatusBadge status={kitten.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {kitten.breed}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {kitten.color || '—'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <Link
                      to={`/admin/kittens/${kitten.id}`}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      View
                    </Link>
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

export default FosterDetailPage;
