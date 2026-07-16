import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSignature, TriangleAlert } from 'lucide-react';
import { fetchContracts } from '../../services/api';
import { getContractTemplateLabel } from '../../constants/contractTemplates';

const STATUS_STYLES = {
  SENT: 'bg-amber-100 text-amber-800',
  SIGNED: 'bg-emerald-100 text-emerald-800',
  VOID: 'bg-slate-100 text-slate-600',
};

function ContractRow({ contract }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">
          {getContractTemplateLabel(contract.templateSlug)}
        </p>
        <p className="text-xs text-slate-500">
          {contract.kittenName || contract.kitten?.name || 'No kitten specified'}
          {contract.application ? ` · Application #${contract.application.id}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[contract.status] || STATUS_STYLES.VOID}`}>
          {contract.status}
        </span>
        <Link
          to={`/admin/contracts?view=${contract.id}`}
          className="text-sm font-semibold text-brand hover:underline"
        >
          View
        </Link>
      </div>
    </li>
  );
}

// Two-tier lookup, on purpose. `linkedContracts` is the trusted list - an
// exact match on applicationId or fosterId, the real relational link on the
// Contract row. `emailMatchedContracts` is a fuzzy fallback (same signerEmail
// text match the whole page used to rely on exclusively) and is only ever
// shown separately, clearly labeled as unconfirmed, with anything already in
// the trusted list filtered out so nothing is ever shown twice. This exists
// so staff can never mistake "shares an email" for "actually belongs to this
// record" again.
function PersonContractsSection({ applicationId, fosterId, signerEmail, title = 'Executed Agreements' }) {
  const [linkedContracts, setLinkedContracts] = useState([]);
  const [linkedLoading, setLinkedLoading] = useState(true);
  const [emailMatchedContracts, setEmailMatchedContracts] = useState([]);
  const [emailLoading, setEmailLoading] = useState(true);

  useEffect(() => {
    if (!applicationId && !fosterId) {
      setLinkedContracts([]);
      setLinkedLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLinkedLoading(true);
    fetchContracts(applicationId ? { applicationId } : { fosterId })
      .then((data) => {
        if (!cancelled) setLinkedContracts(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setLinkedContracts([]);
      })
      .finally(() => {
        if (!cancelled) setLinkedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId, fosterId]);

  useEffect(() => {
    if (!signerEmail) {
      setEmailMatchedContracts([]);
      setEmailLoading(false);
      return undefined;
    }

    let cancelled = false;
    setEmailLoading(true);
    fetchContracts({ search: signerEmail })
      .then((data) => {
        if (!cancelled) setEmailMatchedContracts(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setEmailMatchedContracts([]);
      })
      .finally(() => {
        if (!cancelled) setEmailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [signerEmail]);

  const linkedIds = new Set(linkedContracts.map((c) => c.id));
  const unlinkedEmailMatches = emailMatchedContracts.filter((c) => !linkedIds.has(c.id));
  const loading = linkedLoading || emailLoading;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <FileSignature className="h-5 w-5 text-brand" />
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading agreements...</p>
      ) : (
        <>
          {linkedContracts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No agreements linked to this record yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {linkedContracts.map((contract) => (
                <ContractRow key={contract.id} contract={contract} />
              ))}
            </ul>
          )}

          {unlinkedEmailMatches.length > 0 && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <div className="flex items-center gap-2">
                <TriangleAlert className="h-4 w-4 text-amber-700" />
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Other agreements with this email — not directly linked to this record
                </p>
              </div>
              <p className="mt-1 text-xs text-amber-700">
                These share the same email address but are not confirmed to belong to this application or foster. Verify before assuming they apply here.
              </p>
              <ul className="mt-3 divide-y divide-amber-100">
                {unlinkedEmailMatches.map((contract) => (
                  <ContractRow key={contract.id} contract={contract} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default PersonContractsSection;
