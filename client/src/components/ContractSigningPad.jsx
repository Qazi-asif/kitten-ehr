import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Eraser, FileSignature, X } from 'lucide-react';

const LEGAL_DISCLAIMER =
  'By signing below, you acknowledge that this electronic signature is legally binding and equivalent to a handwritten signature under applicable law. Please read the entire agreement before signing.';

const HOUSEHOLD_SLOT_COUNT = 2;

function ContractSigningPad({
  contractId,
  contractText,
  signerName = '',
  contractType,
  onClose,
  onSign,
}) {
  const sigRef = useRef(null);
  // Refs for the two optional adult-household-member signature canvases
  // (Foster Care Agreement only). Populated via callback refs since the
  // count is fixed but SignatureCanvas instances can't live in a single ref.
  const householdSigRefs = useRef([]);
  const [agreed, setAgreed] = useState(false);
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [householdNames, setHouseholdNames] = useState(
    Array.from({ length: HOUSEHOLD_SLOT_COUNT }, () => ''),
  );

  // These acknowledgment blocks only apply to Foster Care Agreements - not
  // Adoption. They are entirely optional (not every foster placement has a
  // second adult in the household) and never gate Sign & Submit.
  const showHouseholdBlocks = contractType === 'FOSTER';

  function handleClear() {
    sigRef.current?.clear();
    setHasSignature(false);
  }

  function handleStrokeEnd() {
    setHasSignature(!sigRef.current?.isEmpty());
  }

  function handleHouseholdNameChange(index, value) {
    setHouseholdNames((prev) => prev.map((name, i) => (i === index ? value : name)));
  }

  function handleHouseholdClear(index) {
    householdSigRefs.current[index]?.clear();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!agreed || !nameConfirmed || !hasSignature || sigRef.current?.isEmpty()) {
      setError('Please confirm your name, agree to the terms, and provide your signature.');
      return;
    }

    // Each household slot is independently optional - a fully blank slot is
    // simply skipped. If a slot is half-filled (a name with no signature, or
    // a signature with no name) we ask the signer to finish or clear it
    // rather than silently dropping what they entered.
    const householdAcknowledgments = [];
    if (showHouseholdBlocks) {
      for (let i = 0; i < HOUSEHOLD_SLOT_COUNT; i += 1) {
        const ref = householdSigRefs.current[i];
        const hasSig = Boolean(ref && !ref.isEmpty());
        const hasName = Boolean(householdNames[i]?.trim());
        if (!hasSig && !hasName) continue;
        if (hasSig !== hasName) {
          setError(
            `Please complete or clear the signature block for Adult Household Member #${i + 1} (both a name and a signature are needed, or leave both blank).`,
          );
          return;
        }
        householdAcknowledgments.push({
          name: householdNames[i].trim(),
          signatureImage: ref.toDataURL('image/png'),
        });
      }
    }

    setSubmitting(true);
    setError('');

    try {
      const signatureImage = sigRef.current.toDataURL('image/png');
      const signedAt = new Date().toISOString();

      await onSign({
        contractId,
        signatureImage,
        signedAt,
        nameConfirmed,
        householdAcknowledgments,
      });
    } catch (err) {
      setError(err.message || 'Failed to submit signature.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = agreed && nameConfirmed && hasSignature && !submitting;

  return (
    <div className="flex h-full max-h-[90vh] flex-col bg-white text-neutral-900">
      <div className="flex items-start justify-between border-b border-neutral-200 px-6 py-4">
        <div>
          <div className="flex items-center gap-2 text-neutral-900">
            <FileSignature className="h-5 w-5" />
            <h2 className="font-serif text-xl font-bold tracking-tight">Electronic Signature</h2>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            Contract #{contractId}
            {signerName ? ` · ${signerName}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          aria-label="Close signing modal"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
          <p className="font-serif text-sm leading-relaxed text-neutral-800">{LEGAL_DISCLAIMER}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="rounded-lg border border-neutral-300 bg-white p-6 shadow-inner">
            <pre className="whitespace-pre-wrap font-serif text-sm leading-7 text-neutral-900">
              {contractText}
            </pre>
          </div>

          {/*
            Everything below (name confirmation, signature, optional household
            acknowledgments) lives inside this same scrollable region so that
            it can never push the Cancel / Sign & Submit footer past the
            bottom of the modal, regardless of how tall this content gets
            (e.g. Foster contracts with both household blocks filled in on a
            short viewport). Only the compact error/action footer below stays
            pinned outside the scroll area.
          */}
          <div className="mt-5 space-y-5">
            <div className="rounded-lg border border-neutral-300 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Signer Name</p>
              <p className="mt-1 font-serif text-base font-semibold text-neutral-900">{signerName || '—'}</p>
            </div>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={nameConfirmed}
                onChange={(e) => setNameConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-neutral-400 text-neutral-900 focus:ring-neutral-900"
              />
              <span className="text-sm leading-relaxed text-neutral-800">
                I confirm the name above is my full legal name and I am the person signing this agreement.
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-neutral-400 text-neutral-900 focus:ring-neutral-900"
              />
              <span className="text-sm leading-relaxed text-neutral-800">
                I confirm I am 18 years of age or older and agree to the terms above.
              </span>
            </label>

            <div>
              <p className="mb-2 font-serif text-sm font-semibold uppercase tracking-wide text-neutral-700">
                Signature
              </p>
              <div className="overflow-hidden rounded-lg border-2 border-dotted border-neutral-400 bg-white">
                <SignatureCanvas
                  ref={sigRef}
                  penColor="#111111"
                  canvasProps={{
                    className: 'h-40 w-full touch-none',
                    'aria-label': 'Signature pad',
                  }}
                  onEnd={handleStrokeEnd}
                />
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900"
              >
                <Eraser className="h-4 w-4" />
                Clear Signature
              </button>
            </div>

            {showHouseholdBlocks && (
              <div className="space-y-4 border-t border-neutral-200 pt-5">
                <div>
                  <p className="font-serif text-sm font-semibold uppercase tracking-wide text-neutral-700">
                    Adult Household Member Acknowledgment (optional)
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    If other adults live in the household, they may sign below to acknowledge this agreement.
                    Leave blank if not applicable.
                  </p>
                </div>
                {Array.from({ length: HOUSEHOLD_SLOT_COUNT }, (_, index) => (
                  <div key={index} className="rounded-lg border border-neutral-300 bg-white p-4">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Adult Household Member #{index + 1} Name
                      </span>
                      <input
                        type="text"
                        value={householdNames[index]}
                        onChange={(e) => handleHouseholdNameChange(index, e.target.value)}
                        className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <div className="mt-3 overflow-hidden rounded-lg border-2 border-dotted border-neutral-400 bg-white">
                      <SignatureCanvas
                        ref={(el) => { householdSigRefs.current[index] = el; }}
                        penColor="#111111"
                        canvasProps={{
                          className: 'h-28 w-full touch-none',
                          'aria-label': `Signature pad for adult household member ${index + 1}`,
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleHouseholdClear(index)}
                      className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900"
                    >
                      <Eraser className="h-4 w-4" />
                      Clear Signature
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 border-t border-neutral-200 bg-neutral-50 px-6 py-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? 'Submitting Signature...' : 'Sign & Submit'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ContractSigningPad;
