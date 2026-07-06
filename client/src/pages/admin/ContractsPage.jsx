import { useCallback, useEffect, useState } from 'react';
import { fetchContracts } from '../../services/api';

const STATUS_STYLES = {
  SENT: 'bg-amber-100 text-amber-800',
  SIGNED: 'bg-emerald-100 text-emerald-800',
  VOID: 'bg-slate-100 text-slate-600',
};

function ContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setContracts(await fetchContracts());
    } catch (err) {
      setError(err.message);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Contracts</h1>
      <p className="mb-6 text-sm text-gray-500">E-signature contracts for foster and adoption agreements.</p>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Loading contracts...</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Signer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Version</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Created</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Signed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    No contracts yet.
                  </td>
                </tr>
              ) : (
                contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{contract.signerName}</p>
                      <p className="text-xs text-gray-500">{contract.signerEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{contract.type}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[contract.status] || STATUS_STYLES.SENT}`}>
                        {contract.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{contract.documentVersion}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(contract.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {contract.signedAt ? new Date(contract.signedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default ContractsPage;
