import { useCallback, useEffect, useState } from 'react';
import { PawPrint } from 'lucide-react';
import PortalNav from '../../components/portal/PortalNav';
import { fetchMyPlacements } from '../../services/portalDataApi';
import { getKittenImageUrl } from '../../utils/kittenImages';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function PlacementCard({ placement }) {
  // allowFallback: false - a missing/unresolvable photo renders the PawPrint
  // icon placeholder below, not the generic silhouette image used elsewhere.
  const photoUrl = getKittenImageUrl(placement.kitten, { allowFallback: false });

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={placement.kitten?.name ? `${placement.kitten.name} photo` : 'Kitten photo'}
          className="h-12 w-12 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand">
          <PawPrint className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{placement.kitten?.name || 'Unknown kitten'}</p>
        <p className="text-xs text-slate-500">
          {placement.kitten?.breed || 'Unknown breed'}
          {placement.kitten?.color ? ` · ${placement.kitten.color}` : ''}
        </p>
      </div>
      <div className="text-right text-xs text-slate-500">
        <p>Intake: {formatDate(placement.intakeDate)}</p>
        <p>{placement.dischargeDate ? `Discharged: ${formatDate(placement.dischargeDate)}` : 'Currently with you'}</p>
      </div>
    </div>
  );
}

function PortalPlacementsPage() {
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMyPlacements();
      setPlacements(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load your placements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = placements.filter((p) => !p.dischargeDate);
  const past = placements.filter((p) => p.dischargeDate);

  return (
    <div className="flex min-h-screen flex-col bg-brand-muted">
      <PortalNav />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">My Placements</h1>
        <p className="mt-1 text-sm text-slate-500">Kittens currently and previously in your care.</p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading...</p>
        ) : (
          <>
            <section className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Current</h2>
              <div className="mt-3 space-y-3">
                {current.length === 0 ? (
                  <p className="text-sm text-slate-500">No kittens currently placed with you.</p>
                ) : (
                  current.map((p) => <PlacementCard key={p.id} placement={p} />)
                )}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Past</h2>
              <div className="mt-3 space-y-3">
                {past.length === 0 ? (
                  <p className="text-sm text-slate-500">No past placements yet.</p>
                ) : (
                  past.map((p) => <PlacementCard key={p.id} placement={p} />)
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default PortalPlacementsPage;
