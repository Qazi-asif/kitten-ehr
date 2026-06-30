import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ApplicationDetailModal from '../../components/admin/ApplicationDetailModal';
import { fetchApplications, updateApplicationStatus } from '../../services/api';
import {
  getApplicationSummary,
  resolveKittenOfInterest,
} from '../../utils/applicationFormData';

const STATUS_OPTIONS = ['New', 'Under Review', 'Approved', 'Denied'];

function KittenInterestCell({ value, formData }) {
  const interest = resolveKittenOfInterest(formData, value);

  if (!interest) {
    return (
      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
        Unspecified
      </span>
    );
  }

  return <span className="text-sm font-medium text-gray-900">{interest}</span>;
}

function ApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchApplications(filter || undefined);
      setApplications(data);
    } catch (err) {
      setError(err.message);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const selectedId = searchParams.get('id');
    if (!selectedId || applications.length === 0) return;

    const match = applications.find((app) => String(app.id) === selectedId);
    if (match) setSelected(match);
  }, [applications, searchParams]);

  function openApplication(app) {
    setSelected(app);
    setSearchParams({ id: String(app.id) });
  }

  function closeApplication() {
    setSelected(null);
    setSearchParams({});
  }

  async function handleStatusChange(id, status) {
    setSavingStatus(true);
    try {
      const updated = await updateApplicationStatus(id, status);
      setApplications((prev) => prev.map((app) => (app.id === id ? { ...app, ...updated } : app)));
      setSelected((prev) => (prev?.id === id ? { ...prev, ...updated } : prev));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingStatus(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Applications</h1>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mb-4">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Applicant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Kitten of Interest</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    No applications found.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className={`hover:bg-gray-50 ${selected?.id === app.id ? 'bg-emerald-50/50' : ''}`}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{getApplicationSummary(app.formData)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{app.type}</td>
                    <td className="px-4 py-3">
                      <KittenInterestCell value={app.kittenOfInterest} formData={app.formData} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{app.status}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        type="button"
                        onClick={() => openApplication(app)}
                        className="font-medium text-emerald-700 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ApplicationDetailModal
          application={selected}
          onClose={closeApplication}
          onStatusChange={handleStatusChange}
          saving={savingStatus}
        />
      )}
    </div>
  );
}

export default ApplicationsPage;
