import { Eye, X } from 'lucide-react';
import { getDefaultContractText } from '../../utils/contractText';
import {
  parseSignatureAudit,
  resolveContractKittenName,
  resolveContractSignatureImage,
} from '../../utils/contractAudit';

function ContractReviewModal({ contract, onClose }) {
  if (!contract) return null;

  const audit = parseSignatureAudit(contract.signatureAudit);
  const signatureImage = resolveContractSignatureImage(contract);
  const kittenName = resolveContractKittenName(contract);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-emerald-700" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">Review Signed Contract</h2>
              <p className="text-xs text-slate-500">
                {contract.type} · {contract.signerName} · Kitten: {kittenName}
              </p>
            </div>
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

        <div className="overflow-y-auto px-6 py-5">
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
              <p className="text-sm font-semibold text-emerald-700">{contract.status}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Signed</p>
              <p className="text-sm font-medium text-slate-900">
                {contract.signedAt ? new Date(contract.signedAt).toLocaleString() : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Version</p>
              <p className="text-sm font-medium text-slate-900">{contract.documentVersion}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase text-slate-500">IP Address</p>
              <p className="text-sm font-medium text-slate-900">{audit.ipAddress || '—'}</p>
            </div>
          </div>

          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Agreement text</h3>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
              {getDefaultContractText(contract)}
            </pre>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Electronic signature</h3>
            {signatureImage ? (
              <img
                src={signatureImage}
                alt={`Signature of ${contract.signerName}`}
                className="mt-3 max-h-40 rounded-lg border border-slate-200 bg-white p-2"
              />
            ) : (
              <p className="mt-3 text-sm text-slate-500">No signature image on file.</p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Signed by {contract.signerName} ({contract.signerEmail})
              {audit.signedVia ? ` via ${audit.signedVia}` : ''}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ContractReviewModal;
