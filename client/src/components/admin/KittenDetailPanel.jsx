import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer, Trash2 } from 'lucide-react';
import KittenPublishingTab from './KittenPublishingTab';
import KittenPhotoManager from './KittenPhotoManager';
import LitterSelect from './LitterSelect';
import KittenPlacementTable from './KittenPlacementTable';
import StatusBadge from './StatusBadge';
import KittenDocumentsTab from './KittenDocumentsTab';
import KittenContractsSection from './KittenContractsSection';
import KittenHealthTab from './KittenHealthTab';
import MedicalAlertsBanner from './MedicalAlertsBanner';
import WishlistManager from './WishlistManager';
import FaceSheet from '../FaceSheet';
import KittenPhoto from '../KittenPhoto';
import {
  createMedication,
  createVaccine,
  createVetAppointment,
  createWeightLog,
  deleteDocument,
  deleteMedication,
  deleteVaccine,
  deleteVetAppointment,
  deleteWeightLog,
  fetchDocuments,
  fetchLitters,
  fetchKittens,
  fetchKittenById,
  fetchKittenPhotos,
  fetchKittenPlacements,
  fetchMedicalRecords,
  fetchWeightLogs,
  setKittenPrimaryPhoto,
  uploadDocument,
  uploadKittenPhoto,
  updateKitten,
  updateMedication,
  updateVaccine,
  updateVetAppointment,
  updateWeightLog,
  fetchKittenUpdates,
  createKittenUpdate,
  deleteKittenUpdate,
  deleteKitten,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { WISHLIST_OWNER_TYPES } from '../../constants/wishlists';
import { KITTEN_STATUS_OPTIONS } from '../../constants/kittenStatuses';
import { formatKittenAgeDetailed } from '../../utils/kittenAge';
import { resolvePrimaryPhotoUrl } from '../../utils/kittenImages';
import { pacificToday } from '../../utils/pacificDate';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'publishing', label: 'Publishing & Social' },
  { id: 'updates', label: 'Updates' },
  { id: 'health', label: 'Health' },
  { id: 'documents', label: 'Documents' },
  { id: 'placements', label: 'Placements' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'notes', label: 'Notes' },
];

const FIXED_STATUS_OPTIONS = ['', 'Intact', 'Spayed/Neutered'];
const SEX_OPTIONS = ['', 'Male', 'Female'];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function gramsToLbs(grams) {
  if (!grams) return '—';
  return `${(grams / 453.592).toFixed(1)} lbs`;
}

function normalizeFixedStatus(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  if (trimmed === 'Intact' || trimmed === 'Spayed/Neutered') return trimmed;
  if (/^intact$/i.test(trimmed)) return 'Intact';
  if (/spay|neut/i.test(trimmed)) return 'Spayed/Neutered';
  return '';
}

function KittenDetailPanel({ kittenId, embedded = false, onKittenDeleted }) {
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('kittens.delete');
  const canEdit = hasPermission('kittens.edit');
  const canManageMedical = hasPermission('medical.manage');
  const [kitten, setKitten] = useState(null);
  const [medical, setMedical] = useState({ vaccines: [], medications: [], vetAppointments: [] });
  const [weightLogs, setWeightLogs] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState(() => new Set());
  const [uploading, setUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [notesForm, setNotesForm] = useState({ notes: '', internalNotes: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [updates, setUpdates] = useState([]);
  const [updateForm, setUpdateForm] = useState({ content: '', isPublic: false });
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [allKittens, setAllKittens] = useState([]);
  const [litters, setLitters] = useState([]);
  const [error, setError] = useState(null);
  const [alertsDismissed, setAlertsDismissed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadKitten = useCallback(async () => {
    const data = await fetchKittenById(kittenId);
    setKitten(data);
    setProfileForm({
      name: data.name || '',
      status: data.status || '',
      breed: data.breed || '',
      color: data.color || '',
      sex: data.sex || '',
      fixedStatus: normalizeFixedStatus(data.fixedStatus),
      dateOfBirth: data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : '',
      intakeDate: data.intakeDate ? data.intakeDate.slice(0, 10) : '',
      intakeSource: data.intakeSource || '',
      rescueStory: data.rescueStory || '',
      fivFelvStatus: data.fivFelvStatus || '',
      specialNeeds: data.specialNeeds || '',
      litterId: data.litterId ? String(data.litterId) : '',
      isBondedPair: Boolean(data.isBondedPair),
      bondedWithKittenId: data.bondedWithKittenId ? String(data.bondedWithKittenId) : '',
      bondedWithName: data.bondedWithName || '',
      isMedicalSpecialNeeds: Boolean(data.isMedicalSpecialNeeds),
      isTnr: Boolean(data.isTnr),
      isColony: Boolean(data.isColony),
      microchipNumber: data.microchipNumber || '',
      outcomeDate: data.outcomeDate ? data.outcomeDate.slice(0, 10) : '',
      outcomeDetail: data.outcomeDetail || '',
    });
    setNotesForm({
      notes: data.notes || '',
      internalNotes: data.internalNotes || '',
    });
    return data;
  }, [kittenId]);

  const loadUpdates = useCallback(async () => {
    setUpdates(await fetchKittenUpdates(kittenId));
  }, [kittenId]);

  const loadMedical = useCallback(async () => {
    setMedical(await fetchMedicalRecords(kittenId));
  }, [kittenId]);

  const loadWeights = useCallback(async () => {
    setWeightLogs(await fetchWeightLogs(kittenId));
  }, [kittenId]);

  const loadDocuments = useCallback(async () => {
    setDocuments(await fetchDocuments(kittenId));
  }, [kittenId]);

  const loadPhotos = useCallback(async () => {
    const data = await fetchKittenPhotos(kittenId);
    const photos = data.photos || [];
    setGalleryPhotos(photos);
    const resolvedPrimary = resolvePrimaryPhotoUrl(data);
    if (resolvedPrimary) {
      setKitten((prev) => (prev ? { ...prev, primaryPhotoUrl: resolvedPrimary } : prev));
    }
  }, [kittenId]);

  const loadPlacements = useCallback(async () => {
    setPlacements(await fetchKittenPlacements(kittenId));
  }, [kittenId]);

  useEffect(() => {
    if (!kittenId) return undefined;
    setLoading(true);
    setPhotosLoading(true);
    setError(null);
    setAlertsDismissed(false);
    setActiveTab('profile');
    setLoadedTabs(new Set(['profile']));
    setGalleryPhotos([]);

    Promise.all([
      loadKitten(),
      fetchLitters({ status: 'active', sort: 'name' }).then(setLitters).catch(() => setLitters([])),
      fetchKittens().then(setAllKittens).catch(() => setAllKittens([])),
    ])
      .then(() => setLoading(false))
      .catch((err) => {
        setError(err.message);
        setLoading(false);
        setPhotosLoading(false);
      });

    loadPhotos()
      .catch(() => setGalleryPhotos([]))
      .finally(() => setPhotosLoading(false));

    return undefined;
  }, [kittenId, loadKitten, loadPhotos]);

  useEffect(() => {
    if (loading || !kittenId) return undefined;

    const healthTabs = new Set(['health']);
    if (activeTab === 'profile' || activeTab === 'publishing' || activeTab === 'notes') return undefined;
    if (loadedTabs.has(activeTab)) return undefined;

    let cancelled = false;

    async function loadTabData() {
      setTabLoading(true);
      try {
        if (healthTabs.has(activeTab)) {
          await Promise.all([loadMedical(), loadWeights()]);
        } else if (activeTab === 'documents') {
          await loadDocuments();
        } else if (activeTab === 'updates') {
          await loadUpdates();
        } else if (activeTab === 'placements') {
          await loadPlacements();
        } else {
          return;
        }

        if (!cancelled) {
          setLoadedTabs((prev) => new Set([...prev, activeTab]));
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setTabLoading(false);
      }
    }

    loadTabData();
    return () => {
      cancelled = true;
    };
  }, [activeTab, kittenId, loading, loadedTabs, loadMedical, loadWeights, loadDocuments, loadUpdates, loadPlacements]);

  function handleProfileFieldChange(field, value) {
    setProfileForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'isBondedPair' && !value) {
        next.bondedWithKittenId = '';
        next.bondedWithName = '';
      }
      if (
        field === 'status'
        && ['Adopted', 'Deceased', 'Released'].includes(value)
        && !next.outcomeDate
      ) {
        next.outcomeDate = pacificToday();
      }
      return next;
    });
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const payload = {
        name: profileForm.name,
        status: profileForm.status,
        breed: profileForm.breed,
        color: profileForm.color,
        sex: profileForm.sex,
        fixedStatus: profileForm.fixedStatus,
        dateOfBirth: profileForm.dateOfBirth || null,
        intakeDate: profileForm.intakeDate || null,
        intakeSource: profileForm.intakeSource || '',
        rescueStory: profileForm.rescueStory,
        fivFelvStatus: profileForm.fivFelvStatus || null,
        specialNeeds: profileForm.specialNeeds || null,
        litterId: profileForm.litterId ? Number.parseInt(profileForm.litterId, 10) : null,
        isBondedPair: profileForm.isBondedPair,
        bondedWithKittenId: profileForm.isBondedPair && profileForm.bondedWithKittenId
          ? Number.parseInt(profileForm.bondedWithKittenId, 10)
          : null,
        bondedWithName: profileForm.isBondedPair ? profileForm.bondedWithName : '',
        isMedicalSpecialNeeds: profileForm.isMedicalSpecialNeeds,
        isTnr: profileForm.isTnr,
        isColony: profileForm.isColony,
        microchipNumber: profileForm.microchipNumber || '',
      };

      if (['Adopted', 'Deceased', 'Released'].includes(profileForm.status)) {
        // Omit entirely when blank so the server can default it to now.
        if (profileForm.outcomeDate) {
          payload.outcomeDate = profileForm.outcomeDate;
        }
      } else if (profileForm.status === 'Transferred') {
        payload.outcomeDetail = profileForm.outcomeDetail || null;
      }

      const updated = await updateKitten(kittenId, payload);
      setKitten(updated);
      setProfileForm({
        name: updated.name || '',
        status: updated.status || '',
        breed: updated.breed || '',
        color: updated.color || '',
        sex: updated.sex || '',
        fixedStatus: normalizeFixedStatus(updated.fixedStatus),
        dateOfBirth: updated.dateOfBirth ? updated.dateOfBirth.slice(0, 10) : '',
        intakeDate: updated.intakeDate ? updated.intakeDate.slice(0, 10) : '',
        intakeSource: updated.intakeSource || '',
        rescueStory: updated.rescueStory || '',
        fivFelvStatus: updated.fivFelvStatus || '',
        specialNeeds: updated.specialNeeds || '',
        litterId: updated.litterId ? String(updated.litterId) : '',
        isBondedPair: Boolean(updated.isBondedPair),
        bondedWithKittenId: updated.bondedWithKittenId ? String(updated.bondedWithKittenId) : '',
        bondedWithName: updated.bondedWithName || '',
        isMedicalSpecialNeeds: Boolean(updated.isMedicalSpecialNeeds),
        isTnr: Boolean(updated.isTnr),
        isColony: Boolean(updated.isColony),
        microchipNumber: updated.microchipNumber || '',
        outcomeDate: updated.outcomeDate ? updated.outcomeDate.slice(0, 10) : '',
        outcomeDetail: updated.outcomeDetail || '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      const updated = await updateKitten(kittenId, notesForm);
      setKitten(updated);
      setNotesForm({
        notes: updated.notes || '',
        internalNotes: updated.internalNotes || '',
      });
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleCreateUpdate(event) {
    event.preventDefault();
    if (!updateForm.content.trim()) return;
    setSavingUpdate(true);
    try {
      await createKittenUpdate(kittenId, updateForm);
      setUpdateForm({ content: '', isPublic: false });
      await loadUpdates();
    } finally {
      setSavingUpdate(false);
    }
  }

  async function handleDeleteUpdate(updateId) {
    await deleteKittenUpdate(kittenId, updateId);
    await loadUpdates();
  }

  async function handleCreateVaccine(formData) {
    setTabLoading(true);
    await createVaccine({ kittenId: Number.parseInt(kittenId, 10), ...formData });
    await loadMedical();
    setTabLoading(false);
  }

  async function handleUpdateVaccine(id, formData) {
    setTabLoading(true);
    await updateVaccine(id, formData);
    await loadMedical();
    setTabLoading(false);
  }

  async function handleDeleteVaccine(id) {
    setTabLoading(true);
    await deleteVaccine(id);
    await loadMedical();
    setTabLoading(false);
  }

  async function handleCreateMedication(formData) {
    setTabLoading(true);
    await createMedication({ kittenId: Number.parseInt(kittenId, 10), ...formData });
    await loadMedical();
    setTabLoading(false);
  }

  async function handleUpdateMedication(id, formData) {
    setTabLoading(true);
    await updateMedication(id, formData);
    await loadMedical();
    setTabLoading(false);
  }

  async function handleDeleteMedication(id) {
    setTabLoading(true);
    await deleteMedication(id);
    await loadMedical();
    setTabLoading(false);
  }

  async function handleCreateVetVisit(formData) {
    setTabLoading(true);
    await createVetAppointment({ kittenId: Number.parseInt(kittenId, 10), ...formData });
    await loadMedical();
    setTabLoading(false);
  }

  async function handleUpdateVetVisit(id, formData) {
    setTabLoading(true);
    await updateVetAppointment(id, formData);
    await loadMedical();
    setTabLoading(false);
  }

  async function handleDeleteVetVisit(id) {
    setTabLoading(true);
    await deleteVetAppointment(id);
    await loadMedical();
    setTabLoading(false);
  }

  async function handleCreateWeight(formData) {
    setTabLoading(true);
    await createWeightLog({ kittenId: Number.parseInt(kittenId, 10), ...formData });
    await loadWeights();
    setTabLoading(false);
  }

  async function handleUpdateWeight(id, formData) {
    setTabLoading(true);
    await updateWeightLog(id, formData);
    await loadWeights();
    setTabLoading(false);
  }

  async function handleDeleteWeight(id) {
    setTabLoading(true);
    await deleteWeightLog(id);
    await loadWeights();
    setTabLoading(false);
  }

  async function handleUploadDocument(payload) {
    setUploading(true);
    await uploadDocument(kittenId, payload);
    await loadDocuments();
    setUploading(false);
  }

  async function handleUploadPhotos(files) {
    setPhotoUploading(true);
    setError(null);
    try {
      for (const file of files) {
        const result = await uploadKittenPhoto(kittenId, file, { setAsPrimary: galleryPhotos.length === 0 });
        if (result.primaryPhotoUrl) {
          setKitten((prev) => (prev ? { ...prev, primaryPhotoUrl: result.primaryPhotoUrl } : prev));
        }
      }
      await Promise.all([loadPhotos(), loadDocuments()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleSetPrimaryPhoto(documentId) {
    setPhotoUploading(true);
    setError(null);
    try {
      const result = await setKittenPrimaryPhoto(kittenId, documentId);
      setKitten((prev) => (prev ? { ...prev, primaryPhotoUrl: result.primaryPhotoUrl } : prev));
      await loadPhotos();
    } catch (err) {
      setError(err.message);
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleDeletePhoto(documentId) {
    setPhotoUploading(true);
    setError(null);
    try {
      await deleteDocument(kittenId, documentId);
      await loadKitten();
      await Promise.all([loadPhotos(), loadDocuments()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleDeleteDocument(documentId) {
    await deleteDocument(kittenId, documentId);
    await loadDocuments();
  }

  async function handleDeleteKitten() {
    if (!kitten) return;

    const confirmed = window.confirm(
      `Delete ${kitten.name}? This permanently removes the kitten profile and all related medical records, documents, and updates. This cannot be undone.`,
    );

    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await deleteKitten(kittenId);
      onKittenDeleted?.(kittenId);
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  if (!kittenId) {
    return (
      <div className="flex h-full min-h-[480px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-gray-500">Select a kitten from the list to view their profile</p>
      </div>
    );
  }

  if (loading) return <p className="text-sm text-gray-500">Loading kitten profile...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const latestWeight = weightLogs[0];
  const medicalFlags = kitten.flags || [];

  return (
    <>
      <div className={`rounded-lg border border-gray-200 bg-white shadow-sm ${embedded ? '' : 'print:hidden'}`}>
        <MedicalAlertsBanner
          flags={medicalFlags}
          dismissed={alertsDismissed}
          onDismiss={() => setAlertsDismissed(true)}
        />

        {!embedded && (
          <div className="flex items-center justify-end gap-2 border-b border-gray-100 px-4 py-3">
            {canDelete && (
              <button
                type="button"
                onClick={handleDeleteKitten}
                disabled={deleting}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleting ? 'Deleting...' : 'Delete Kitten'}
              </button>
            )}
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
          </div>
        )}

        {embedded && canDelete && (
          <div className="flex items-center justify-end border-b border-gray-100 px-4 py-3">
            <button
              type="button"
              onClick={handleDeleteKitten}
              disabled={deleting}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? 'Deleting...' : 'Delete Kitten'}
            </button>
          </div>
        )}

        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{kitten.name}</h2>
              <p className="mt-0.5 text-sm text-gray-500">{kitten.litter?.name || 'No litter assigned'}</p>
            </div>
            <StatusBadge status={kitten.status} />
          </div>

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
            <KittenPhoto kitten={kitten} allowFallback className="h-24 w-24 shrink-0 rounded-full border-2 border-gray-100 shadow-sm" />
            <dl className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Sex', kitten.sex || '—'],
                ['Age', formatKittenAgeDetailed(kitten.dateOfBirth)],
                ['Breed', kitten.breed],
                ['Weight', gramsToLbs(latestWeight?.weightGrams)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-gray-50 px-3 py-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-gray-800">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="border-b border-gray-200 px-5">
          <nav className="-mb-px flex flex-wrap gap-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 py-3 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-5">
          {(tabLoading || photosLoading) && (
            <p className="mb-3 text-xs text-gray-500">
              {photosLoading && activeTab === 'profile' ? 'Loading photos...' : 'Loading tab data...'}
            </p>
          )}

          {activeTab === 'profile' && (
            <form className="space-y-6" onSubmit={handleSaveProfile}>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                <p className="text-sm font-medium text-emerald-900">Update this kitten&apos;s profile details.</p>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>

              <KittenPhotoManager
                kitten={kitten}
                photos={galleryPhotos}
                editMode
                uploading={photoUploading}
                onUploadFiles={handleUploadPhotos}
                onSetPrimary={handleSetPrimaryPhoto}
                onDeletePhoto={handleDeletePhoto}
              />

              <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  ['name', 'Name', 'text'],
                  ['breed', 'Breed', 'text'],
                  ['color', 'Color', 'text'],
                ].map(([field, label, type]) => (
                  <label key={field} className="block">
                    <span className="text-xs font-semibold uppercase text-gray-500">{label}</span>
                    <input
                      type={type}
                      value={profileForm[field] || ''}
                      onChange={(e) => handleProfileFieldChange(field, e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                ))}
                <label className="block">
                  <span className="text-xs font-semibold uppercase text-gray-500">Sex</span>
                  <select
                    value={profileForm.sex || ''}
                    onChange={(e) => handleProfileFieldChange('sex', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    {SEX_OPTIONS.map((option) => (
                      <option key={option || 'unset'} value={option}>
                        {option || 'Not specified'}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase text-gray-500">Status</span>
                  <select
                    value={profileForm.status || ''}
                    onChange={(e) => handleProfileFieldChange('status', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    {KITTEN_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                {['Adopted', 'Deceased', 'Released'].includes(profileForm.status) && (
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      {profileForm.status === 'Deceased' ? 'Date of Death' : 'Outcome Date'}
                    </span>
                    <input
                      type="date"
                      value={profileForm.outcomeDate || ''}
                      onChange={(e) => handleProfileFieldChange('outcomeDate', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                )}
                {profileForm.status === 'Transferred' && (
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-semibold uppercase text-gray-500">Transfer Detail</span>
                    <input
                      type="text"
                      value={profileForm.outcomeDetail || ''}
                      onChange={(e) => handleProfileFieldChange('outcomeDetail', e.target.value)}
                      placeholder="Where was this kitten transferred to?"
                      maxLength={500}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                )}
                {[
                  ['dateOfBirth', 'Date of Birth', 'date'],
                  ['intakeDate', 'Intake Date', 'date'],
                  ['microchipNumber', 'Microchip Number', 'text'],
                  ['fivFelvStatus', 'FIV/FeLV Status', 'text'],
                ].map(([field, label, type]) => (
                  <label key={field} className="block">
                    <span className="text-xs font-semibold uppercase text-gray-500">{label}</span>
                    <input
                      type={type}
                      value={profileForm[field] || ''}
                      onChange={(e) => handleProfileFieldChange(field, e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </label>
                ))}
                <div className="block">
                  <span className="text-xs font-semibold uppercase text-gray-500">Calculated Age</span>
                  <p className="mt-1 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800">
                    {formatKittenAgeDetailed(profileForm.dateOfBirth || kitten.dateOfBirth)}
                  </p>
                </div>
                <label className="block">
                  <span className="text-xs font-semibold uppercase text-gray-500">Fixed Status</span>
                  <select
                    value={profileForm.fixedStatus || ''}
                    onChange={(e) => handleProfileFieldChange('fixedStatus', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    {FIXED_STATUS_OPTIONS.map((option) => (
                      <option key={option || 'unset'} value={option}>
                        {option || 'Not specified'}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="block sm:col-span-2">
                  <span className="text-xs font-semibold uppercase text-gray-500">Assigned Foster</span>
                  <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                    {kitten.currentFoster ? (
                      <Link
                        to={`/admin/fosters/${kitten.currentFoster.id}`}
                        className="font-semibold text-emerald-700 hover:underline"
                      >
                        {kitten.currentFoster.name}
                      </Link>
                    ) : (
                      <span className="text-gray-500">No foster assigned</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Assign or discharge fosters from{' '}
                    <Link to="/admin/fosters" className="font-semibold text-brand hover:underline">
                      Admin → Fosters
                    </Link>
                    {' '}(placements), not from this profile field.
                  </p>
                </div>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold uppercase text-gray-500">Litter Group</span>
                  <LitterSelect
                    value={profileForm.litterId || ''}
                    litters={litters}
                    onChange={(value) => handleProfileFieldChange('litterId', value)}
                    onLittersChange={setLitters}
                    disabled={savingProfile || !canEdit}
                    className="mt-1"
                  />
                </label>
                <label className="flex items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={profileForm.isBondedPair}
                    onChange={(e) => handleProfileFieldChange('isBondedPair', e.target.checked)}
                    disabled={!canEdit}
                  />
                  <span className="text-sm font-medium text-gray-800">Bonded Pair</span>
                </label>
                {profileForm.isBondedPair && (
                  <>
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-semibold uppercase text-gray-500">Bonded With (linked cat)</span>
                      <select
                        value={profileForm.bondedWithKittenId || ''}
                        onChange={(e) => handleProfileFieldChange('bondedWithKittenId', e.target.value)}
                        disabled={!canEdit}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        <option value="">Select bonded partner</option>
                        {allKittens
                          .filter((item) => item.id !== kittenId)
                          .map((item) => (
                            <option key={item.id} value={String(item.id)}>
                              {item.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-semibold uppercase text-gray-500">Or bonded partner name (text fallback)</span>
                      <input
                        value={profileForm.bondedWithName || ''}
                        onChange={(e) => handleProfileFieldChange('bondedWithName', e.target.value)}
                        disabled={!canEdit}
                        placeholder="Use if partner is not in the system yet"
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                    </label>
                  </>
                )}
                <label className="flex items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={profileForm.isMedicalSpecialNeeds}
                    onChange={(e) => handleProfileFieldChange('isMedicalSpecialNeeds', e.target.checked)}
                    disabled={!canEdit}
                  />
                  <span className="text-sm font-medium text-gray-800">Medical / Special Needs</span>
                </label>
                <label className="flex items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={(profileForm.intakeSource || '').includes('Euthanasia')}
                    onChange={(e) => handleProfileFieldChange(
                      'intakeSource',
                      e.target.checked ? 'Euthanasia-Pull Rescue' : '',
                    )}
                    disabled={!canEdit}
                  />
                  <span className="text-sm font-medium text-gray-800">Euthanasia-Pull Rescue</span>
                </label>
                <label className="flex items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={profileForm.isTnr}
                    onChange={(e) => handleProfileFieldChange('isTnr', e.target.checked)}
                    disabled={!canEdit}
                  />
                  <span className="text-sm font-medium text-gray-800">TNR</span>
                </label>
                <label className="flex items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={profileForm.isColony}
                    onChange={(e) => handleProfileFieldChange('isColony', e.target.checked)}
                    disabled={!canEdit}
                  />
                  <span className="text-sm font-medium text-gray-800">Colony</span>
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-gray-500">Rescue Story</span>
                <textarea
                  rows={4}
                  value={profileForm.rescueStory || ''}
                  onChange={(e) => handleProfileFieldChange('rescueStory', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-gray-500">Special Needs</span>
                <textarea
                  rows={2}
                  value={profileForm.specialNeeds || ''}
                  onChange={(e) => handleProfileFieldChange('specialNeeds', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="sm:col-span-2">
                <WishlistManager
                  ownerType={WISHLIST_OWNER_TYPES.KITTEN}
                  ownerId={kittenId}
                  canManage={canEdit}
                  title="Manage Wishlists"
                  description="Add Amazon, Chewy, or Walmart wishlist links for this kitten. Saved links appear on the public profile."
                />
              </div>
              <div className="flex justify-end border-t border-gray-100 pt-4 sm:col-span-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
              </div>
            </form>
          )}

          {activeTab === 'publishing' && (
            <KittenPublishingTab
              kittenId={kittenId}
              kitten={kitten}
              galleryPhotos={galleryPhotos}
              setKitten={setKitten}
            />
          )}

          {activeTab === 'updates' && (
            <div className="space-y-6">
              <form onSubmit={handleCreateUpdate} className="rounded-lg border border-gray-200 p-4">
                <h3 className="text-xs font-bold uppercase text-gray-700">New Update</h3>
                <textarea
                  rows={3}
                  value={updateForm.content}
                  onChange={(e) => setUpdateForm((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Write a milestone or care update..."
                  className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={updateForm.isPublic}
                    onChange={(e) => setUpdateForm((prev) => ({ ...prev, isPublic: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  Make Public
                </label>
                <button
                  type="submit"
                  disabled={savingUpdate}
                  className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {savingUpdate ? 'Posting...' : 'Post Update'}
                </button>
              </form>
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Update</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Visibility</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {updates.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">No updates yet.</td>
                      </tr>
                    ) : (
                      updates.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-4 py-3 text-sm text-gray-500">{formatDate(entry.createdAt)}</td>
                          <td className="px-4 py-3 text-sm text-gray-800">{entry.content}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${entry.isPublic ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                              {entry.isPublic ? 'Public' : 'Private'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleDeleteUpdate(entry.id)}
                              className="text-sm font-medium text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'health' && kittenId && (
            <KittenHealthTab
              kittenId={Number(kittenId)}
              canManageMedical={canManageMedical}
              medical={medical}
              weightLogs={weightLogs}
              onCreateVaccine={handleCreateVaccine}
              onUpdateVaccine={handleUpdateVaccine}
              onDeleteVaccine={handleDeleteVaccine}
              onCreateMedication={handleCreateMedication}
              onUpdateMedication={handleUpdateMedication}
              onDeleteMedication={handleDeleteMedication}
              onCreateVetVisit={handleCreateVetVisit}
              onUpdateVetVisit={handleUpdateVetVisit}
              onDeleteVetVisit={handleDeleteVetVisit}
              onCreateWeight={handleCreateWeight}
              onUpdateWeight={handleUpdateWeight}
              onDeleteWeight={handleDeleteWeight}
            />
          )}

          {activeTab === 'documents' && (
            <KittenDocumentsTab
              kittenId={kittenId}
              documents={documents}
              onUpload={handleUploadDocument}
              uploading={uploading}
              onDelete={handleDeleteDocument}
            />
          )}

          {activeTab === 'placements' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
                <p><span className="font-semibold text-gray-900">Current Foster:</span> {kitten.currentFoster?.name || 'None assigned'}</p>
                {kitten.currentFoster && (
                  <Link to={`/admin/fosters/${kitten.currentFoster.id}`} className="mt-2 inline-block text-sm font-semibold text-emerald-700 hover:underline">
                    View foster dashboard →
                  </Link>
                )}
              </div>
              <KittenPlacementTable placements={placements} />
            </div>
          )}

          {activeTab === 'contracts' && (
            <KittenContractsSection kittenId={kittenId} title="Agreements for this Kitten" />
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <section>
                <h3 className="text-xs font-bold uppercase text-gray-700">General Notes</h3>
                <textarea
                  rows={4}
                  value={notesForm.notes}
                  onChange={(e) => setNotesForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add general care notes for this kitten..."
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                />
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase text-gray-700">Internal Notes (Private)</h3>
                <textarea
                  rows={4}
                  value={notesForm.internalNotes}
                  onChange={(e) => setNotesForm((prev) => ({ ...prev, internalNotes: e.target.value }))}
                  placeholder="Staff-only notes..."
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                />
              </section>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {!embedded && (
        <FaceSheet
          kitten={kitten}
          activeMedications={medical.medications.filter((med) => med.status === 'Active')}
          formatDate={formatDate}
        />
      )}
    </>
  );
}

export default KittenDetailPanel;
