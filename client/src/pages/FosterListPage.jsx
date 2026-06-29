import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createFoster, fetchFosters } from '../services/api';
import FosterForm from '../components/FosterForm';

function FosterListPage() {
  const [fosters, setFosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadFosters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFosters();
      setFosters(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFosters();
  }, [loadFosters]);

  async function handleCreateFoster(fosterData) {
    await createFoster(fosterData);
    await loadFosters();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Fosters</h1>

      <FosterForm onSubmit={handleCreateFoster} />

      {loading && <p className="text-gray-500">Loading fosters...</p>}

      {!loading && error && <p className="text-red-600">{error}</p>}

      {!loading && !error && fosters.length === 0 && (
        <p className="rounded-lg bg-gray-100 px-4 py-6 text-center text-gray-600">
          No fosters found or unable to connect to the server.
        </p>
      )}

      {!loading && !error && fosters.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Kittens
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {fosters.map((foster, index) => (
                <tr
                  key={foster.id}
                  className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100'}
                >
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    <Link
                      to={`/admin/fosters/${foster.id}`}
                      className="text-emerald-700 hover:text-emerald-900 hover:underline"
                    >
                      {foster.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {foster.phone}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {foster.email}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {foster._count?.currentKittens ?? 0}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <Link
                      to={`/admin/fosters/${foster.id}`}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      View
                    </Link>
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

export default FosterListPage;
