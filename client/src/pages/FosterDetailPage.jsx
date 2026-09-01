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
import { formatPacificDisplay } from '../utils/pacificDate.js';
import { CAPABILITY_OPTIONS, EXPERIENCE_LEVELS, parseCapabilityFlags } from '../utils/fosterCapabilities';
import {
  createFosterPlacement,
  activateFoster,
  deactivateFoster,
  deleteFoster,
  dischargeFosterPlacement,
  fetchFosterById,
  fetchFosterPlacements,
  fetchKittens,
  resendFosterPortalSetupLink,
  updateFoster,
  updateFosterPlacement,
  updateKitten,
} from '../services/api';
import { pacificToday } from '../utils/pacificDate';

function buildFosterFormFromFoster(foster) {
  return {
    name: foster.name || '',
    phone: foster.phone || '',
    email: foster.email || '',
    address: foster.address || '',
    emergencyContact: foster.emergencyContact || '',
    experienceLevel: foster.experienceLevel || 'Beginner',
    maxKittens: foster.maxKittens ?? 0,
    notes: foster.notes || '',
    capabilities: parseCapabilityFlags(foster.capabilityFlags).filter((flag) => flag !== 'large_capacity'),
  };
}

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
  const [editingFoster, setEditingFoster] = useState(false);
  const [fosterForm, setFosterForm] = useState(null);
  const [savingFoster, setSavingFoster] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [activating, setActivating] = useState(false);

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

    const dischargeDate = window.prompt(
      'Discharge date (YYYY-MM-DD):',
      pacificToday(),
    );
    if (dischargeDate === null) return;
    if (!dischargeDate.trim()) {
      setError('Discharge date is required.');
      return;
    }

    const dischargeType = window.prompt(
      'Optional discharge reason (e.g. Returned to Rescue, Adopted, Transferred). Leave blank for "Discharged":',
      '',
    );
    if (dischargeType === null) return;

    setDischargingId(placement.id);
    setError(null);
    try {
      const updated = await dischargeFosterPlacement(id, placement.id, {
        dischargeDate: dischargeDate.trim(),
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

  function openEditFoster() {
    setFosterForm(buildFosterFormFromFoster(foster));
    setEditingFoster(true);
  }

  function handleFosterFieldChange(field, value) {
    setFosterForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleFosterCapability(value) {
    setFosterForm((prev) => ({
      ...prev,
      capabilities: prev.capabilities.includes(value)
        ? prev.capabilities.filter((flag) => flag !== value)
        : [...prev.capabilities, value],
    }));
  }

  async function handleSaveFoster(event) {
    event.preventDefault();
    setSavingFoster(true);
    setError(null);
    try {
      const { capabilities, maxKittens, ...rest } = fosterForm;
      await updateFoster(id, {
        ...rest,
        maxKittens: Number.parseInt(maxKittens, 10) || 0,
        capabilityFlags: capabilities.join(','),
      });
      setEditingFoster(false);
      setFosterForm(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingFoster(false);
    }
  }

  async function handleDeactivateFoster() {
    if (!foster) return;
    const confirmed = window.confirm(`Deactivate ${foster.name}? They will be marked inactive and hidden from new placement assignment.`);
    if (!confirmed) return;

    setDeactivating(true);
    setError(null);
    try {
      await deactivateFoster(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeactivating(false);
    }
  }

  async function handleActivateFoster() {
    if (!foster) return;
    const confirmed = window.confirm(`Re-activate ${foster.name}? They will be available for new placements again.`);
    if (!confirmed) return;

    setActivating(true);
    setError(null);
    try {
      await activateFoster(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActivating(false);
    }
  }

  async function handleDeleteFoster() {
    if (!foster) return;
    const confirmed = window.confirm(
      `Permanently delete ${foster.name}? This removes their placement history and cannot be undone.`,
    );
    if (!confirmed) return;
    setDeactivating(true);
    setError(null);
    try {
      await deleteFoster(id);
      window.location.assign('/admin/fosters');
    } catch (err) {
      setError(err.message);
      setDeactivating(false);
    }
  }

  async function handleUpdatePlacement(placement, payload) {
    setError(null);
    try {
      const updated = await updateFosterPlacement(id, placement.id, payload);
      setPlacements((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    } catch (err) {
      setError(err.message);
      throw err;
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
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-bold text-slate-900">{foster.name}</h1>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${foster.isActive === false ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
                    {foster.isActive === false ? 'Inactive' : 'Active'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {foster.experienceLevel || 'Experience not set'} · Capacity {activePlacements}
                  {foster.maxKittens ? ` / ${foster.maxKittens}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full bg-brand-light px-4 py-2 text-sm font-semibold text-brand-dark">
                  {foster._count?.placements ?? placements.length} total placements
                </div>
                {canManageFoster && (
                  <>
                    <button
                      type="button"
                      onClick={openEditFoster}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Edit Foster
                    </button>
                    {foster.isActive !== false && (
                      <button
                        type="button"
                        onClick={handleDeactivateFoster}
                        disabled={deactivating || activating}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        {deactivating ? 'Deactivating...' : 'Deactivate Foster'}
                      </button>
                    )}
                    {foster.isActive === false && (
                      <button
                        type="button"
                        onClick={handleActivateFoster}
                        disabled={deactivating || activating}
                        className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                      >
                        {activating ? 'Re-activating...' : 'Re-activate Foster'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDeleteFoster}
                      disabled={deactivating}
                      className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                    >
                      Delete Foster
                    </button>
                  </>
                )}
              </div>
            </div>

            {editingFoster && fosterForm && (
              <form onSubmit={handleSaveFoster} className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-bold text-slate-900">Edit Foster Details</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Name</span>
                    <input value={fosterForm.name} onChange={(e) => handleFosterFieldChange('name', e.target.value)} required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Phone</span>
                    <input type="tel" value={fosterForm.phone} onChange={(e) => handleFosterFieldChange('phone', e.target.value)} required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Email</span>
                    <input type="email" value={fosterForm.email} onChange={(e) => handleFosterFieldChange('email', e.target.value)} required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Emergency Contact</span>
                    <input value={fosterForm.emergencyContact} onChange={(e) => handleFosterFieldChange('emergencyContact', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Address</span>
                    <input value={fosterForm.address} onChange={(e) => handleFosterFieldChange('address', e.target.value)} required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Experience Level</span>
                    <select value={fosterForm.experienceLevel} onChange={(e) => handleFosterFieldChange('experienceLevel', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                      {EXPERIENCE_LEVELS.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Max Kittens Capacity</span>
                    <input type="number" min="0" max="50" value={fosterForm.maxKittens} onChange={(e) => handleFosterFieldChange('maxKittens', e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                  </label>
                  <fieldset className="sm:col-span-2">
                    <legend className="mb-2 text-xs font-medium text-slate-600">Capabilities</legend>
                    <div className="flex flex-wrap gap-4">
                      {CAPABILITY_OPTIONS.map((option) => (
                        <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={fosterForm.capabilities.includes(option.value)}
                            onChange={() => toggleFosterCapability(option.value)}
                            className="rounded border-slate-300"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Notes</span>
                    <textarea value={fosterForm.notes} onChange={(e) => handleFosterFieldChange('notes', e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                  </label>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditingFoster(false); setFosterForm(null); }}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingFoster}
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                  >
                    {savingFoster ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

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
                    ? `Pending, expires ${formatPacificDisplay(foster.portalAccount.tokenExpiresAt, { withTime: true })}`
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
            onUpdate={handleUpdatePlacement}
            canEdit={canManageFoster}
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
