import { useCallback, useEffect, useState } from 'react';
import { FileSignature, Plus } from 'lucide-react';
import ContractSigningPad from '../../components/ContractSigningPad';
import { createContractDraft, fetchContracts, markContractSigned } from '../../services/api';
import { getDefaultContractText } from '../../utils/contractText';

const STATUS_STYLES = {
  SENT: 'bg-amber-100 text-amber-800',
  SIGNED: 'bg-emerald-100 text-emerald-800',
  VOID: 'bg-slate-100 text-slate-600',
};

const EMPTY_DRAFT = {
  type: 'FOSTER',
  signerName: '',
  signerEmail: '',
  documentVersion: '1.0',
};

function ContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signingContract, setSigningContract] = useState(null);
  const [showDraftForm, setShowDraftForm] = useState(false);
  const [draftForm, setDraftForm] = useState(EMPTY_DRAFT);
  const [creatingDraft, setCreatingDraft] = useState(false);

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

  async function handleSign(payload) {
    await markContractSigned(payload.contractId, payload);
    setSigningContract(null);
    await load();
  }

  async function handleCreateDraft(e) {
    e.preventDefault();
    setCreatingDraft(true);
    setError('');
    try {
      await createContractDraft({
        type: draftForm.type,
        signerName: draftForm.signerName.trim(),
        signerEmail: draftForm.signerEmail.trim(),
        documentVersion: draftForm.documentVersion.trim(),
      });
      setDraftForm(EMPTY_DRAFT);
      setShowDraftForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingDraft(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          <p className="mt-1 text-sm text-gray-500">E-signature contracts for foster and adoption agreements.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowDraftForm((open) => !open)}
          className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
        >
          <Plus className="h-4 w-4" />
          Create Draft Contract
        </button>
      </div>

      {showDraftForm && (
        <form
          onSubmit={handleCreateDraft}
          className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">New draft contract</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase text-gray-500">Type</span>
              <select
                value={draftForm.type}
                onChange={(e) => setDraftForm((prev) => ({ ...prev, type: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="FOSTER">Foster</option>
                <option value="ADOPTION">Adoption</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-gray-500">Signer name</span>
              <input
                required
                value={draftForm.signerName}
                onChange={(e) => setDraftForm((prev) => ({ ...prev, signerName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-gray-500">Signer email</span>
              <input
                type="email"
                required
                value={draftForm.signerEmail}
                onChange={(e) => setDraftForm((prev) => ({ ...prev, signerEmail: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-gray-500">Document version</span>
              <input
                required
                value={draftForm.documentVersion}
                onChange={(e) => setDraftForm((prev) => ({ ...prev, documentVersion: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDraftForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingDraft}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {creatingDraft ? 'Creating...' : 'Create Draft'}
            </button>
          </div>
        </form>
      )}

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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
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
                    <td className="px-4 py-3 text-sm">
                      {contract.status === 'SENT' ? (
                        <button
                          type="button"
                          onClick={() => setSigningContract(contract)}
                          className="inline-flex items-center gap-1.5 font-semibold text-neutral-900 hover:underline"
                        >
                          <FileSignature className="h-4 w-4" />
                          Send for Signature
                        </button>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {signingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="h-full w-full max-h-[900px] max-w-4xl overflow-hidden rounded-2xl border border-neutral-300 shadow-2xl">
            <ContractSigningPad
              contractId={signingContract.id}
              contractText={getDefaultContractText(signingContract)}
              signerName={signingContract.signerName}
              onClose={() => setSigningContract(null)}
              onSign={handleSign}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ContractsPage;
