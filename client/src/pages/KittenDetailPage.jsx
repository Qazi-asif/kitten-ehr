import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, Printer } from 'lucide-react';
import StatusBadge from '../components/admin/StatusBadge';
import KittenPublishingTab from '../components/admin/KittenPublishingTab';
import KittenPhotoManager from '../components/admin/KittenPhotoManager';
import DocumentUploadForm from '../components/DocumentUploadForm';
import DocumentsList from '../components/DocumentsList';
import FaceSheet from '../components/FaceSheet';
import MedicationForm from '../components/MedicationForm';
import MedicationsTable from '../components/MedicationsTable';
import VaccineForm from '../components/VaccineForm';
import VaccinesTable from '../components/VaccinesTable';
import VetVisitForm from '../components/VetVisitForm';
import VetVisitsTable from '../components/VetVisitsTable';
import WeightLogForm from '../components/WeightLogForm';
import WeightLogsTable from '../components/WeightLogsTable';
import LitterSelect from '../components/admin/LitterSelect';
import {
  createMedication,
  createVaccine,
  createVetAppointment,
  createWeightLog,
  deleteDocument,
  fetchDocuments,
  fetchLitters,
  fetchKittenById,
  fetchKittenPhotos,
  fetchMedicalRecords,
  fetchWeightLogs,
  setKittenPrimaryPhoto,
  uploadDocument,
  uploadKittenPhoto,
  updateKitten,
} from '../services/api';
import { formatKittenAgeShort } from '../utils/kittenAge';
import { formatKittenAge } from '../utils/kittenImages';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'publishing', label: 'Publishing & Social' },
  { id: 'vaccinations', label: 'Vaccines' },
  { id: 'medications', label: 'Medications' },
  { id: 'vet-visits', label: 'Medical' },
  { id: 'weight', label: 'Weight' },
  { id: 'documents', label: 'Documents' },
];

const STATUS_OPTIONS = [
  'In Foster Care',
  'Available for Adoption',
  'Adopted',
  'Medical Hold',
  'Transferred',
  'Deceased',
];

const FIXED_STATUS_OPTIONS = ['', 'Intact', 'Spayed/Neutered'];

const QUICK_ACTIONS = [
  { label: 'Mark Available for Adoption', status: 'Available for Adoption' },
  { label: 'Return to Foster Care', status: 'In Foster Care' },
  { label: 'Mark Adopted', status: 'Adopted' },
  { label: 'Set Medical Hold', status: 'Medical Hold' },
];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function normalizeFixedStatus(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  if (trimmed === 'Intact' || trimmed === 'Spayed/Neutered') return trimmed;
  if (/^intact$/i.test(trimmed)) return 'Intact';
  if (/spay|neut/i.test(trimmed)) return 'Spayed/Neutered';
  return '';
}

function KittenDetailPage() {
  const { id } = useParams();
  const [kitten, setKitten] = useState(null);
  const [medical, setMedical] = useState({ vaccines: [], medications: [], vetAppointments: [] });
  const [weightLogs, setWeightLogs] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState(() => new Set());
  const [uploading, setUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [notesForm, setNotesForm] = useState({ notes: '', internalNotes: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [litters, setLitters] = useState([]);
  const [litterId, setLitterId] = useState('');
  const [savingLitter, setSavingLitter] = useState(false);
  const [error, setError] = useState(null);
  const actionsRef = useRef(null);

  const loadKitten = useCallback(async () => {
    const data = await fetchKittenById(id);
    setKitten(data);
    setProfileForm({
      name: data.name || '',
      status: data.status || '',
      breed: data.breed || '',
      color: data.color || '',
      sex: data.sex || '',
      fixedStatus: normalizeFixedStatus(data.fixedStatus),
      dateOfBirth: data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : '',
      rescueStory: data.rescueStory || '',
      fivFelvStatus: data.fivFelvStatus || '',
      specialNeeds: data.specialNeeds || '',
      microchipNumber: data.microchipNumber || '',
      litterId: data.litterId ? String(data.litterId) : '',
    });
    setLitterId(data.litterId ? String(data.litterId) : '');
    setNotesForm({
      notes: data.notes || '',
      internalNotes: data.internalNotes || '',
    });
    return data;
  }, [id]);

  const loadMedical = useCallback(async () => {
    setMedical(await fetchMedicalRecords(id));
  }, [id]);

  const loadWeights = useCallback(async () => {
    setWeightLogs(await fetchWeightLogs(id));
  }, [id]);

  const loadDocuments = useCallback(async () => {
    setDocuments(await fetchDocuments(id));
  }, [id]);

  const loadPhotos = useCallback(async () => {
    const data = await fetchKittenPhotos(id);
    setGalleryPhotos(data.photos || []);
    if (data.primaryPhotoUrl) {
      setKitten((prev) => (prev ? { ...prev, primaryPhotoUrl: data.primaryPhotoUrl } : prev));
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    setPhotosLoading(true);
    setError(null);
    setLoadedTabs(new Set(['overview']));
    setActiveTab('overview');
    setGalleryPhotos([]);

    Promise.all([
      loadKitten(),
      fetchLitters().then(setLitters).catch(() => setLitters([])),
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
  }, [id, loadKitten, loadPhotos]);

  useEffect(() => {
    if (loading) return undefined;

    const medicalTabs = new Set(['vaccinations', 'medications', 'vet-visits']);
    if (activeTab === 'overview' || activeTab === 'publishing') return undefined;
    if (loadedTabs.has(activeTab)) return undefined;
    if (medicalTabs.has(activeTab) && ['vaccinations', 'medications', 'vet-visits'].some((tab) => loadedTabs.has(tab))) {
      return undefined;
    }

    let cancelled = false;

    async function loadTabData() {
      setTabLoading(true);
      try {
        if (medicalTabs.has(activeTab)) {
          await loadMedical();
          if (!cancelled) {
            setLoadedTabs((prev) => new Set([...prev, 'vaccinations', 'medications', 'vet-visits']));
          }
        } else if (activeTab === 'weight') {
          await loadWeights();
          if (!cancelled) {
            setLoadedTabs((prev) => new Set([...prev, activeTab]));
          }
        } else if (activeTab === 'documents') {
          await loadDocuments();
          if (!cancelled) {
            setLoadedTabs((prev) => new Set([...prev, activeTab]));
          }
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
  }, [activeTab, loading, loadedTabs, loadMedical, loadWeights, loadDocuments]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setShowActionsMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleProfileFieldChange(field, value) {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleQuickStatus(status) {
    setShowActionsMenu(false);
    setError(null);
    try {
      const updated = await updateKitten(id, { status });
      setKitten(updated);
      setProfileForm((prev) => ({ ...prev, status: updated.status }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    setError(null);
    try {
      const updated = await updateKitten(id, {
        ...profileForm,
        litterId: litterId ? Number.parseInt(litterId, 10) : null,
        dateOfBirth: profileForm.dateOfBirth || null,
      });
      setKitten(updated);
      setLitterId(updated.litterId ? String(updated.litterId) : '');
      setEditMode(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveLitterGroup() {
    setSavingLitter(true);
    setError(null);
    try {
      const updated = await updateKitten(id, {
        litterId: litterId ? Number.parseInt(litterId, 10) : null,
      });
      setKitten(updated);
      setLitterId(updated.litterId ? String(updated.litterId) : '');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingLitter(false);
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    setError(null);
    try {
      const updated = await updateKitten(id, notesForm);
      setKitten(updated);
      setNotesForm({
        notes: updated.notes || '',
        internalNotes: updated.internalNotes || '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleCreateVaccine(formData) {
    setTabLoading(true);
    await createVaccine({ kittenId: Number.parseInt(id, 10), ...formData });
    await loadMedical();
    setTabLoading(false);
  }

  async function handleCreateMedication(formData) {
    setTabLoading(true);
    await createMedication({ kittenId: Number.parseInt(id, 10), ...formData });
    await loadMedical();
    setTabLoading(false);
  }

  async function handleCreateVetVisit(formData) {
    setTabLoading(true);
    await createVetAppointment({ kittenId: Number.parseInt(id, 10), ...formData });
    await loadMedical();
    setTabLoading(false);
  }

  async function handleCreateWeight(formData) {
    setTabLoading(true);
    await createWeightLog({ kittenId: Number.parseInt(id, 10), ...formData });
    await loadWeights();
    setTabLoading(false);
  }

  async function handleUploadDocument(payload) {
    setUploading(true);
    await uploadDocument(id, payload);
    await loadDocuments();
    setUploading(false);
  }

  async function handleUploadPhotos(files) {
    setPhotoUploading(true);
    setError(null);
    try {
      for (const file of files) {
        const result = await uploadKittenPhoto(id, file, { setAsPrimary: galleryPhotos.length === 0 });
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
      const result = await setKittenPrimaryPhoto(id, documentId);
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
      await deleteDocument(id, documentId);
      await loadKitten();
      await Promise.all([loadPhotos(), loadDocuments()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleDeleteDocument(documentId) {
    await deleteDocument(id, documentId);
    await loadDocuments();
  }

  if (loading) return <p className="text-slate-500">Loading kitten profile...</p>;

  if (error) {
    return (
      <div>
        <Link to="/admin/kittens" className="text-sm font-medium text-brand hover:underline">← Back to Kittens</Link>
        <p className="mt-4 text-red-600">{error}</p>
      </div>
    );
  }

  const latestWeight = weightLogs[0];
  const age = formatKittenAge(kitten.dateOfBirth);

  return (
    <>
      <div className="print:hidden">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link to="/admin/kittens" className="text-sm font-medium text-brand hover:underline">← Back to Kittens</Link>
          <div className="flex items-center gap-2">
            <div className="relative" ref={actionsRef}>
              <button
                type="button"
                onClick={() => setShowActionsMenu((open) => !open)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Actions
                <ChevronDown className="h-4 w-4" />
              </button>
              {showActionsMenu && (
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.status}
                      type="button"
                      onClick={() => handleQuickStatus(action.status)}
                      className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setEditMode((mode) => !mode)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                editMode
                  ? 'border-brand bg-brand text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {editMode ? 'Cancel Edit' : 'Edit'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
            <div>
              <KittenPhotoManager
                kitten={kitten}
                photos={galleryPhotos}
                editMode={editMode}
                uploading={photoUploading}
                onUploadFiles={handleUploadPhotos}
                onSetPrimary={handleSetPrimaryPhoto}
                onDeletePhoto={handleDeletePhoto}
              />
              {editMode && (
                <p className="mt-2 text-xs text-brand">
                  Edit mode: add photos, set the profile picture, or remove images.
                </p>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">{kitten.name}</h1>
                  <p className="mt-1 text-slate-600">
                    {kitten.sex || '—'} · {kitten.breed} · {kitten.color || 'Mixed'} · {formatKittenAgeShort(kitten.dateOfBirth)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={kitten.status} />
                  {kitten.litter && (
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {kitten.litter.name}
                    </span>
                  )}
                </div>
              </div>

              <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current Foster</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-800">
                    {kitten.currentFoster ? (
                      <Link to={`/admin/fosters/${kitten.currentFoster.id}`} className="text-brand hover:underline">{kitten.currentFoster.name}</Link>
                    ) : 'None assigned'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Intake Date</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-800">{formatDate(kitten.intakeDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Microchip #</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-800">{kitten.microchipNumber || '—'}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border-2 border-emerald-400 bg-emerald-50 p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-emerald-950">Litter Group</h2>
            <p className="mt-1 text-sm text-emerald-900">
              Currently assigned: <strong>{kitten.litter?.name || 'None'}</strong>
            </p>
            <p className="mt-1 text-xs text-emerald-800">
              Group kittens from the same intake (e.g. siblings rescued together).
            </p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <LitterSelect
              value={litterId}
              litters={litters}
              onChange={setLitterId}
              onLittersChange={setLitters}
              disabled={savingLitter}
            />
            <button
              type="button"
              onClick={handleSaveLitterGroup}
              disabled={savingLitter}
              className="h-fit rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {savingLitter ? 'Saving...' : 'Save litter group'}
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="border-b border-slate-200 bg-slate-50/50">
            <nav className="flex flex-wrap gap-1 px-4 pt-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-brand shadow-sm ring-1 ring-slate-200 ring-b-white'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {(tabLoading || photosLoading) && (
              <p className="mb-4 text-sm text-slate-500">
                {photosLoading && activeTab === 'overview' ? 'Loading photos...' : 'Loading tab data...'}
              </p>
            )}

            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-6">
                  {editMode ? (
                    <form className="space-y-4" onSubmit={handleSaveProfile}>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {[
                          ['name', 'Name', 'text'],
                          ['breed', 'Breed', 'text'],
                          ['color', 'Color', 'text'],
                          ['sex', 'Sex', 'text'],
                          ['dateOfBirth', 'Date of Birth', 'date'],
                          ['fivFelvStatus', 'FIV/FeLV', 'text'],
                          ['microchipNumber', 'Microchip #', 'text'],
                        ].map(([field, label, type]) => (
                          <label key={field} className="block">
                            <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
                            <input
                              type={type}
                              value={profileForm[field] || ''}
                              onChange={(e) => handleProfileFieldChange(field, e.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            />
                          </label>
                        ))}
                        <label className="block">
                          <span className="text-xs font-semibold uppercase text-slate-500">Fixed Status</span>
                          <select
                            value={profileForm.fixedStatus || ''}
                            onChange={(e) => handleProfileFieldChange('fixedStatus', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          >
                            {FIXED_STATUS_OPTIONS.map((option) => (
                              <option key={option || 'unset'} value={option}>
                                {option || 'Not specified'}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block sm:col-span-2">
                          <span className="text-xs font-semibold uppercase text-slate-500">Status</span>
                          <select
                            value={profileForm.status || ''}
                            onChange={(e) => handleProfileFieldChange('status', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className="block">
                        <span className="text-xs font-semibold uppercase text-slate-500">Rescue Story</span>
                        <textarea
                          rows={4}
                          value={profileForm.rescueStory || ''}
                          onChange={(e) => handleProfileFieldChange('rescueStory', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold uppercase text-slate-500">Special Needs</span>
                        <textarea
                          rows={2}
                          value={profileForm.specialNeeds || ''}
                          onChange={(e) => handleProfileFieldChange('specialNeeds', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                      >
                        {savingProfile ? 'Saving...' : 'Save Profile'}
                      </button>
                    </form>
                  ) : (
                    <>
                      <section>
                        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">About {kitten.name}</h2>
                        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                          {kitten.rescueStory || 'No rescue story recorded yet.'}
                        </div>
                      </section>
                      <section>
                        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">Special Needs / Alerts</h2>
                        <p className="mt-3 text-sm text-slate-600">{kitten.specialNeeds || 'None'}</p>
                      </section>
                    </>
                  )}
                </div>

                <div className="space-y-6">
                  <section>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">Quick Info</h2>
                    <dl className="mt-3 grid grid-cols-2 gap-3">
                      {[
                        ['Sex', kitten.sex],
                        ['Color / Markings', kitten.color],
                        ['FIV / FeLV', kitten.fivFelvStatus || 'Pending'],
                        ['Fixed Status', kitten.fixedStatus],
                        ['Age', age],
                        ['Weight', latestWeight ? `${latestWeight.weightGrams}g` : '—'],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg bg-slate-50 px-3 py-2">
                          <dt className="text-[10px] font-semibold uppercase text-slate-400">{label}</dt>
                          <dd className="text-sm font-medium text-slate-800">{value || '—'}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>

                  <section>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">General Notes</h2>
                    <textarea
                      value={notesForm.notes}
                      onChange={(e) => setNotesForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Add general care notes for this kitten..."
                      rows={4}
                      className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    />
                  </section>

                  <section>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">Internal Notes (Private)</h2>
                    <textarea
                      value={notesForm.internalNotes}
                      onChange={(e) => setNotesForm((prev) => ({ ...prev, internalNotes: e.target.value }))}
                      placeholder="Staff-only notes..."
                      rows={4}
                      className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                    >
                      {savingNotes ? 'Saving...' : 'Save Notes'}
                    </button>
                  </section>
                </div>
              </div>
            )}

            {activeTab === 'publishing' && (
              <KittenPublishingTab
                kittenId={id}
                kitten={kitten}
                galleryPhotos={galleryPhotos}
                setKitten={setKitten}
              />
            )}

            {activeTab === 'vaccinations' && (
              <>
                <VaccineForm onSubmit={handleCreateVaccine} />
                <VaccinesTable vaccines={medical.vaccines} />
              </>
            )}

            {activeTab === 'medications' && (
              <>
                <MedicationForm onSubmit={handleCreateMedication} />
                <MedicationsTable medications={medical.medications} />
              </>
            )}

            {activeTab === 'vet-visits' && (
              <>
                <VetVisitForm onSubmit={handleCreateVetVisit} />
                <VetVisitsTable vetAppointments={medical.vetAppointments} />
              </>
            )}

            {activeTab === 'weight' && (
              <>
                <WeightLogForm onSubmit={handleCreateWeight} />
                <WeightLogsTable logs={weightLogs} />
              </>
            )}

            {activeTab === 'documents' && (
              <>
                <DocumentUploadForm onUpload={handleUploadDocument} uploading={uploading} />
                <DocumentsList documents={documents} onDelete={handleDeleteDocument} />
              </>
            )}
          </div>
        </div>
      </div>

      <FaceSheet
        kitten={kitten}
        activeMedications={medical.medications.filter((med) => med.status === 'Active')}
        formatDate={formatDate}
      />
    </>
  );
}

export default KittenDetailPage;
