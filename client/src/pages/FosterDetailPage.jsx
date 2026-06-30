import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Mail, MapPin, Phone, Users } from 'lucide-react';
import AssignKittenForm from '../components/admin/AssignKittenForm';
import FosterCapabilityBadges from '../components/admin/FosterCapabilityBadges';
import FosterPlacementTable from '../components/admin/FosterPlacementTable';
import FosterPhoto from '../components/FosterPhoto';
import {
  createFosterPlacement,
  fetchFosterById,
  fetchFosterPlacements,
  fetchKittens,
} from '../services/api';

function FosterDetailPage() {
  const { id } = useParams();
  const [foster, setFoster] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [kittens, setKittens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fosterData, placementData, kittenData] = await Promise.all([
        fetchFosterById(id),
        fetchFosterPlacements(id),
        fetchKittens(),
      ]);
      setFoster(fosterData);
      setPlacements(placementData);
      setKittens(kittenData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAssignKitten(payload) {
    setAssigning(true);
    setError(null);
    try {
      await createFosterPlacement(id, payload);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return <p className="text-slate-500">Loading foster dashboard...</p>;
  }

  if (error && !foster) {
    return (
      <div>
        <Link to="/admin/fosters" className="text-sm font-medium text-brand hover:underline">← Back to fosters</Link>
        <p className="mt-4 text-red-600">{error}</p>
      </div>
    );
  }

  const activePlacements = placements.filter((placement) => !placement.dischargeDate).length;

  return (
    <div className="space-y-6">
      <Link to="/admin/fosters" className="inline-flex text-sm font-medium text-brand hover:underline">
        ← Back to fosters
      </Link>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[220px_1fr]">
          <div>
            <FosterPhoto foster={foster} allowFallback className="aspect-square w-full rounded-2xl border border-slate-200" />
          </div>

          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{foster.name}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {foster.experienceLevel || 'Experience not set'} · Capacity {activePlacements}
                  {foster.maxKittens ? ` / ${foster.maxKittens}` : ''}
                </p>
              </div>
              <div className="rounded-full bg-brand-light px-4 py-2 text-sm font-semibold text-brand-dark">
                {foster._count?.placements ?? placements.length} total placements
              </div>
            </div>

            <div className="mt-5">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Capabilities</h2>
              <div className="mt-2">
                <FosterCapabilityBadges capabilityFlags={foster.capabilityFlags} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Phone className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase">Phone</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{foster.phone}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Mail className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase">Email</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{foster.email}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 sm:col-span-2">
                <div className="flex items-center gap-2 text-slate-500">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase">Address</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{foster.address}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase">Emergency Contact</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{foster.emergencyContact || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <span className="text-xs font-semibold uppercase text-slate-500">Notes</span>
                <p className="mt-2 text-sm text-slate-700">{foster.notes || 'No notes recorded.'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Placement History</h2>
            <p className="mt-1 text-sm text-slate-500">Every kitten hosted by this foster home, with intake and discharge dates.</p>
          </div>
          <AssignKittenForm kittens={kittens} onSubmit={handleAssignKitten} submitting={assigning} />
        </div>

        <div className="mt-5">
          <FosterPlacementTable placements={placements} />
        </div>
      </section>
    </div>
  );
}

export default FosterDetailPage;
