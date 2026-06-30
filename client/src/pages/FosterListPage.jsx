import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FosterForm from '../components/FosterForm';
import { createFoster, fetchFosters } from '../services/api';
import { buildCapabilityFlags, fileToDataUrl, parseCapabilityFlags } from '../utils/fosterCapabilities';

function FosterListPage() {
  const [fosters, setFosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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

  async function handleCreateFoster({ photoFile, capabilities, ...formData }) {
    setSubmitting(true);
    setError(null);
    try {
      const photoUrl = photoFile ? await fileToDataUrl(photoFile) : null;
      await createFoster({
        ...formData,
        capabilityFlags: buildCapabilityFlags(capabilities, formData.maxKittens),
        photoUrl,
      });
      await loadFosters();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Foster Homes</h1>
        <p className="mt-1 text-sm text-slate-500">Manage foster contacts, capacity, and placement history.</p>
      </div>

      <FosterForm onSubmit={handleCreateFoster} submitting={submitting} />

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && <p className="text-slate-500">Loading fosters...</p>}

      {!loading && !error && fosters.length === 0 && (
        <p className="rounded-lg bg-slate-100 px-4 py-6 text-center text-slate-600">
          No fosters found yet.
        </p>
      )}

      {!loading && !error && fosters.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Experience</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Capacity</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Capabilities</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Active</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {fosters.map((foster) => (
                <tr key={foster.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                    <Link to={`/admin/fosters/${foster.id}`} className="text-brand hover:underline">
                      {foster.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div>{foster.phone}</div>
                    <div className="text-slate-500">{foster.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{foster.experienceLevel || '—'}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                    {foster._count?.currentKittens ?? 0}
                    {foster.maxKittens ? ` / ${foster.maxKittens}` : ''}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {parseCapabilityFlags(foster.capabilityFlags).length > 0
                      ? parseCapabilityFlags(foster.capabilityFlags).length
                      : '—'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{foster._count?.currentKittens ?? 0}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <Link
                      to={`/admin/fosters/${foster.id}`}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Open Dashboard
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
