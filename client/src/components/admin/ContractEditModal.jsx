import { useEffect, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { CONTRACT_TEMPLATES } from '../../constants/contractTemplates';

const EMPTY_FORM = {
  templateSlug: 'foster_supplies_provided',
  signerName: '',
  signerEmail: '',
  signerAddress: '',
  signerPhone: '',
  microchipNumber: '',
  kittenName: '',
  documentVersion: '2026.1',
};

function ContractEditModal({ contract, templateOptions = CONTRACT_TEMPLATES, onClose, onSave, saving }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const isAdoption = form.templateSlug === 'adoption';

  useEffect(() => {
    if (!contract) return;
    setForm({
      templateSlug: contract.templateSlug || 'foster_supplies_provided',
      signerName: contract.signerName || '',
      signerEmail: contract.signerEmail || '',
      signerAddress: contract.signerAddress || '',
      signerPhone: contract.signerPhone || '',
      microchipNumber: contract.microchipNumber || contract.kitten?.microchipNumber || '',
      kittenName: contract.kittenName || contract.kitten?.name || '',
      documentVersion: contract.documentVersion || '2026.1',
    });
    setError('');
  }, [contract]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await onSave({
        templateSlug: form.templateSlug,
        signerName: form.signerName.trim(),
        signerEmail: form.signerEmail.trim(),
        signerAddress: form.signerAddress.trim(),
        signerPhone: form.signerPhone.trim(),
        microchipNumber: form.microchipNumber.trim(),
        kittenName: form.kittenName.trim(),
        documentVersion: form.documentVersion.trim(),
      });
    } catch (err) {
      setError(err.message);
    }
  }

  if (!contract) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-bold text-slate-900">Edit Contract</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase text-gray-500">Agreement template</span>
              <select
                value={form.templateSlug}
                onChange={(e) => setForm((prev) => ({ ...prev, templateSlug: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {templateOptions.map((template) => (
                  <option key={template.slug} value={template.slug}>{template.label}</option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase text-gray-500">Signer name</span>
              <input
                required
                value={form.signerName}
                onChange={(e) => setForm((prev) => ({ ...prev, signerName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase text-gray-500">Signer email</span>
              <input
                required
                type="email"
                value={form.signerEmail}
                onChange={(e) => setForm((prev) => ({ ...prev, signerEmail: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            {isAdoption && (
              <>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold uppercase text-gray-500">Adopter address</span>
                  <input
                    value={form.signerAddress}
                    onChange={(e) => setForm((prev) => ({ ...prev, signerAddress: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase text-gray-500">Phone</span>
                  <input
                    value={form.signerPhone}
                    onChange={(e) => setForm((prev) => ({ ...prev, signerPhone: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase text-gray-500">Microchip number</span>
                  <input
                    value={form.microchipNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, microchipNumber: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
              </>
            )}
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase text-gray-500">Kitten name</span>
              <input
                value={form.kittenName}
                onChange={(e) => setForm((prev) => ({ ...prev, kittenName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-gray-500">Document version</span>
              <input
                required
                value={form.documentVersion}
                onChange={(e) => setForm((prev) => ({ ...prev, documentVersion: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ContractEditModal;
