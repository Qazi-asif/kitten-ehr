import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { KeyRound, Mail, MapPin, Phone, Users } from 'lucide-react';
import AssignKittenForm from '../components/admin/AssignKittenForm';
import FosterCapabilityBadges from '../components/admin/FosterCapabilityBadges';
import FosterPlacementTable from '../components/admin/FosterPlacementTable';
import PersonContractsSection from '../components/admin/PersonContractsSection';
import StatusConfirmationModal from '../components/admin/StatusConfirmationModal';
import WishlistManager from '../components/admin/WishlistManager';
import FosterPhoto from '../components/FosterPhoto';
import { useAuth } from '../context/AuthContext';
import { WISHLIST_OWNER_TYPES } from '../constants/wishlists';
import {
  createFosterPlacement,
  dischargeFosterPlacement,
  fetchFosterById,
  fetchFosterPlacements,
  fetchKittens,
  resendFosterPortalSetupLink,
  updateKitten,
} from '../services/api';

function FosterDetailPage() {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const canManageFoster = hasPermission('fosters.manage');
  const [foster, setFoster] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [kittens, setKittens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState(null);
  const [statusPrompt, setStatusPrompt] = useState(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [dischargingId, setDischargingId] = useState(null);
  const [resendingSetupLink, setResendingSetupLink] = useState(false);
  const [portalNotice, setPortalNotice] = useState(null);

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
      const placement = await createFosterPlacement(id, payload);
      await loadData();

      // Assigning a kitten to this foster auto-discharges its prior open
      // placement (if any) and auto-sets its status to "In Foster Care" on
      // the server. This prompt gives staff a chance to confirm or correct
      // that status rather than leaving it as a silent write.
      if (placement?.kitten) {
        setStatusPrompt({
          kittenId: placement.kitten.id,
          kittenName: placement.kitten.name,
          currentStatus: placement.kitten.status,
          suggestedStatus: placement.kitten.status,
          reason: 'This kitten was just placed with this foster. Confirm their status:',
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  }

  async function handleStatusConfirm(newStatus) {
    if (!statusPrompt) return;
    setSavingStatus(true);
    try {
      await updateKitten(statusPrompt.kittenId, { status: newStatus });
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingStatus(false);
      setStatusPrompt(null);
    }
  }

  function handleStatusSkip() {
    setStatusPrompt(null);
  }

  async function handleDischargePlacement(placement) {
    const confirmed = window.confirm(
      `End ${placement.kitten?.name || 'this kitten'}'s placement with this foster?`,
    );
    if (!confirmed) return;

    const dischargeType = window.prompt(
      'Optional discharge reason (e.g. Returned to Rescue, Adopted, Transferred). Leave blank for "Discharged":',
      '',
    );
    if (dischargeType === null) return;

    setDischargingId(placement.id);
    setError(null);
    try {
      const updated = await dischargeFosterPlacement(id, placement.id, {
        dischargeType: dischargeType.trim(),
      });
      await loadData();

      if (updated?.kitten) {
        setStatusPrompt({
          kittenId: updated.kitten.id,
          kittenName: updated.kitten.name,
          currentStatus: updated.kitten.status,
          suggestedStatus: updated.kitten.status,
          reason: "This placement was just ended. Confirm the kitten's status:",
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setDischargingId(null);
    }
  }

  async function handleResendSetupLink() {
    const confirmed = window.confirm(
      "Resend the set-password link? The foster's previous link (if any) will stop working.",
    );
    if (!confirmed) return;

    setResendingSetupLink(true);
    setPortalNotice(null);
    try {
      const result = await resendFosterPortalSetupLink(id);
      if (result.ok) {
        setPortalNotice({ type: 'success', message: 'Set-password link resent.' });
        await loadData();
      } else {
        setPortalNotice({ type: 'error', message: result.reason || 'Failed to resend link.' });
      }
    } catch (err) {
      setPortalNotice({ type: 'error', message: err.message });
    } finally {
      setResendingSetupLink(false);
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
        <WishlistManager
          ownerType={WISHLIST_OWNER_TYPES.FOSTER}
          ownerId={id}
          canManage={canManageFoster}
          title="Foster Wishlists"
          description="Manage Amazon, Chewy, and Walmart wishlist links for this foster home."
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Foster Portal Account</h2>

        {portalNotice && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              portalNotice.type === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {portalNotice.message}
          </p>
        )}

        {!foster.portalAccount?.exists ? (
          <p className="mt-3 text-sm text-slate-500">
            No portal account has been created for this foster.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 text-sm text-slate-700">
              <p>
                Status:{' '}
                <span className="font-semibold text-slate-900">
                  {foster.portalAccount.isActive ? 'Active' : 'Inactive'}
                </span>
              </p>
              <p>
                Setup link:{' '}
                <span className="font-semibold text-slate-900">
                  {foster.portalAccount.hasPendingSetup
                    ? `Pending, expires ${new Date(foster.portalAccount.tokenExpiresAt).toLocaleString()}`
                    : 'None pending'}
                </span>
              </p>
            </div>
            {canManageFoster && (
              <button
                type="button"
                onClick={handleResendSetupLink}
                disabled={resendingSetupLink}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <KeyRound className="h-4 w-4" />
                {resendingSetupLink ? 'Resending...' : 'Resend Set-Password Link'}
              </button>
            )}
          </div>
        )}
      </section>

      <PersonContractsSection fosterId={foster.id} signerEmail={foster.email} title="Foster Agreements" />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Placement History</h2>
            <p className="mt-1 text-sm text-slate-500">Every kitten hosted by this foster home, with intake and discharge dates.</p>
          </div>
          <AssignKittenForm kittens={kittens} onSubmit={handleAssignKitten} submitting={assigning} />
        </div>

        <div className="mt-5">
          <FosterPlacementTable
            placements={placements}
            onDischarge={handleDischargePlacement}
            dischargingId={dischargingId}
          />
        </div>
      </section>

      <StatusConfirmationModal
        open={Boolean(statusPrompt)}
        kittenName={statusPrompt?.kittenName}
        currentStatus={statusPrompt?.currentStatus}
        suggestedStatus={statusPrompt?.suggestedStatus}
        reason={statusPrompt?.reason}
        onConfirm={handleStatusConfirm}
        onSkip={handleStatusSkip}
        saving={savingStatus}
      />
    </div>
  );
}

export default FosterDetailPage;
