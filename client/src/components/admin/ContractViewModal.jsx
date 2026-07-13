import { Eye, X } from 'lucide-react';
import { getDefaultContractText } from '../../utils/contractText';
import { getContractTemplateLabel } from '../../constants/contractTemplates';
import {
  parseSignatureAudit,
  resolveContractKittenName,
  resolveContractSignatureImage,
} from '../../utils/contractAudit';

function ContractViewModal({ contract, templates = [], onClose }) {
  if (!contract) return null;

  const audit = parseSignatureAudit(contract.signatureAudit);
  const signatureImage = resolveContractSignatureImage(contract);
  const kittenName = resolveContractKittenName(contract);
  const agreementText = getDefaultContractText(contract, templates);
  const isSigned = contract.status === 'SIGNED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-emerald-700" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isSigned ? 'Review Signed Contract' : 'View Agreement'}
              </h2>
              <p className="text-xs text-slate-500">
                {getContractTemplateLabel(contract.templateSlug)} · {contract.signerName} · Kitten: {kittenName}
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
          <div className="mb-5 rounded-xl border-4 border-dashed border-red-500 bg-red-50 p-4">
            <p className="text-sm font-black uppercase tracking-wide text-red-700">
              ⚠ TEMPORARY DEBUG BLOCK - REMOVE BEFORE SHIPPING ⚠
            </p>
            {contract._debugAgreementText ? (
              <>
                <p className="mt-1 text-xs text-red-600">
                  This box is not part of the real contract view. It shows exactly what the server
                  resolved when computing this contract's agreement text.
                </p>
                <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-red-200 bg-white p-3 font-mono text-xs text-slate-800">
                  {JSON.stringify(contract._debugAgreementText, null, 2)}
                </pre>
              </>
            ) : (
              <>
                <p className="mt-1 text-xs text-red-600">
                  No server debug data was attached to this contract object - it was opened
                  straight from the contracts list, not fetched individually, so the text below
                  was rendered client-side instead. Raw signer fields on this contract object:
                </p>
                <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-red-200 bg-white p-3 font-mono text-xs text-slate-800">
                  {JSON.stringify(
                    {
                      contractId: contract.id,
                      templateSlug: contract.templateSlug,
                      signerName: contract.signerName,
                      signerEmail: contract.signerEmail,
                      signerAddress: contract.signerAddress,
                      signerPhone: contract.signerPhone,
                      emergencyContactName: contract.emergencyContactName,
                      emergencyContactPhone: contract.emergencyContactPhone,
                    },
                    null,
                    2,
                  )}
                </pre>
              </>
            )}
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
              <p className="text-sm font-semibold text-slate-900">{contract.status}</p>
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
              <p className="text-xs font-semibold uppercase text-slate-500">Signer email</p>
              <p className="text-sm font-medium text-slate-900">{contract.signerEmail || '—'}</p>
            </div>
          </div>

          {(contract.signerAddress || contract.signerPhone || contract.microchipNumber) && (
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {contract.signerAddress && (
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">Address</p>
                  <p className="text-sm text-slate-900">{contract.signerAddress}</p>
                </div>
              )}
              {contract.signerPhone && (
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">Phone</p>
                  <p className="text-sm text-slate-900">{contract.signerPhone}</p>
                </div>
              )}
              {contract.microchipNumber && (
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">Microchip</p>
                  <p className="text-sm text-slate-900">{contract.microchipNumber}</p>
                </div>
              )}
            </div>
          )}

          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Agreement text</h3>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
              {agreementText}
            </pre>
          </div>

          {isSigned && (
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
                {audit.ipAddress ? ` · IP ${audit.ipAddress}` : ''}
              </p>
            </div>
          )}

          {Array.isArray(contract.householdAcknowledgments) && contract.householdAcknowledgments.length > 0 && (
            <div className="mt-5 rounded-xl border border-slate-200 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Adult Household Member Acknowledgments
              </h3>
              <div className="mt-3 space-y-4">
                {contract.householdAcknowledgments.map((entry) => (
                  <div key={entry.id} className="flex flex-wrap items-center gap-4">
                    {entry.signatureImageUrl ? (
                      <img
                        src={entry.signatureImageUrl}
                        alt={`Signature of ${entry.name}`}
                        className="max-h-24 rounded-lg border border-slate-200 bg-white p-2"
                      />
                    ) : (
                      <p className="text-sm text-slate-500">No signature image on file.</p>
                    )}
                    <p className="text-xs text-slate-500">
                      {entry.name}
                      {entry.signedAt ? ` · ${new Date(entry.signedAt).toLocaleString()}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
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

export default ContractViewModal;
