import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createLitter, fetchLitters } from '../services/api';
import LitterForm from '../components/LitterForm';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function LitterListPage() {
  const [litters, setLitters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadLitters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLitters();
      setLitters(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLitters();
  }, [loadLitters]);

  async function handleCreateLitter(litterData) {
    await createLitter(litterData);
    await loadLitters();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Litters</h1>
      <LitterForm onSubmit={handleCreateLitter} />

      {loading && <p className="text-gray-500">Loading litters...</p>}
      {!loading && error && <p className="text-red-600">{error}</p>}

      {!loading && !error && litters.length === 0 && (
        <p className="rounded-lg bg-gray-100 px-4 py-6 text-center text-gray-600">
          No litters found or unable to connect to the server.
        </p>
      )}

      {!loading && !error && litters.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Intake Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Kittens</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {litters.map((litter, index) => (
                <tr key={litter.id} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100'}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    <Link to={`/admin/litters/${litter.id}`} className="text-emerald-700 hover:underline">{litter.name}</Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{formatDate(litter.intakeDate)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{litter._count?.kittens ?? 0}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <Link to={`/admin/litters/${litter.id}`} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default LitterListPage;
