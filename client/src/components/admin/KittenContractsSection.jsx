import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSignature } from 'lucide-react';
import { fetchContracts } from '../../services/api';
import { getContractTemplateLabel } from '../../constants/contractTemplates';

const STATUS_STYLES = {
  SENT: 'bg-amber-100 text-amber-800',
  SIGNED: 'bg-emerald-100 text-emerald-800',
  VOID: 'bg-slate-100 text-slate-600',
};

function KittenContractsSection({ kittenId, title = 'Agreements' }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!kittenId) {
      setContracts([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    fetchContracts({ kittenId })
      .then((data) => {
        if (!cancelled) {
          setContracts(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!cancelled) setContracts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [kittenId]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <FileSignature className="h-5 w-5 text-brand" />
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading agreements...</p>
      ) : contracts.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No agreements on file for this kitten yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {contracts.map((contract) => (
            <li key={contract.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {getContractTemplateLabel(contract.templateSlug)}
                </p>
                <p className="text-xs text-slate-500">
                  {contract.signerName || 'No signer specified'}
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
          ))}
        </ul>
      )}
    </section>
  );
}

export default KittenContractsSection;
