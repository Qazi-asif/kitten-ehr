import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer } from 'lucide-react';
import KittenPublishingTab from './KittenPublishingTab';
import KittenPhotoManager from './KittenPhotoManager';
import KittenPlacementTable from './KittenPlacementTable';
import StatusBadge from './StatusBadge';
import DocumentUploadForm from '../DocumentUploadForm';
import DocumentsList from '../DocumentsList';
import FaceSheet from '../FaceSheet';
import KittenPhoto from '../KittenPhoto';
import MedicationForm from '../MedicationForm';
import MedicationsTable from '../MedicationsTable';
import VaccineForm from '../VaccineForm';
import VaccinesTable from '../VaccinesTable';
import VetVisitForm from '../VetVisitForm';
import VetVisitsTable from '../VetVisitsTable';
import WeightLogForm from '../WeightLogForm';
import WeightLogsTable from '../WeightLogsTable';
import {
  createMedication,
  createVaccine,
  createVetAppointment,
  createWeightLog,
  deleteDocument,
  fetchDocuments,
  fetchKittenById,
  fetchKittenPhotos,
  fetchKittenPlacements,
  fetchMedicalRecords,
  fetchWeightLogs,
  setKittenPrimaryPhoto,
  uploadDocument,
  uploadKittenPhoto,
  updateKitten,
  fetchKittenUpdates,
  createKittenUpdate,
  deleteKittenUpdate,
} from '../../services/api';
import { formatKittenAgeShort } from '../../utils/kittenAge';
import { formatKittenAge } from '../../utils/kittenImages';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'publishing', label: 'Publishing & Social' },
  { id: 'updates', label: 'Updates' },
  { id: 'medical', label: 'Medical' },
  { id: 'weight', label: 'Weight' },
  { id: 'documents', label: 'Documents' },
  { id: 'placements', label: 'Placements' },
  { id: 'notes', label: 'Notes' },
];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function gramsToLbs(grams) {
  if (!grams) return '—';
  return `${(grams / 453.592).toFixed(1)} lbs`;
}

function KittenDetailPanel({ kittenId, embedded = false }) {
  const [kitten, setKitten] = useState(null);
  const [medical, setMedical] = useState({ vaccines: [], medications: [], vetAppointments: [] });
  const [weightLogs, setWeightLogs] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [notesForm, setNotesForm] = useState({ notes: '', internalNotes: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [updates, setUpdates] = useState([]);
  const [updateForm, setUpdateForm] = useState({ content: '', isPublic: false });
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [error, setError] = useState(null);

  const loadKitten = useCallback(async () => {
    const data = await fetchKittenById(kittenId);
    setKitten(data);
    setProfileForm({
      name: data.name || '',
      status: data.status || '',
      breed: data.breed || '',
      color: data.color || '',
      sex: data.sex || '',
      fixedStatus: data.fixedStatus || '',
      dateOfBirth: data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : '',
      rescueStory: data.rescueStory || '',
      fivFelvStatus: data.fivFelvStatus || '',
      specialNeeds: data.specialNeeds || '',
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
    setGalleryPhotos(data.photos || []);
    if (data.primaryPhotoUrl) {
      setKitten((prev) => (prev ? { ...prev, primaryPhotoUrl: data.primaryPhotoUrl } : prev));
    }
  }, [kittenId]);

  const loadPlacements = useCallback(async () => {
    setPlacements(await fetchKittenPlacements(kittenId));
  }, [kittenId]);

  useEffect(() => {
    if (!kittenId) return undefined;
    setLoading(true);
    setError(null);
    setActiveTab('profile');
    loadKitten()
      .then(async () => {
        await Promise.all([loadMedical(), loadWeights(), loadDocuments(), loadUpdates(), loadPhotos(), loadPlacements()]);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
    return undefined;
  }, [kittenId, loadKitten, loadMedical, loadWeights, loadDocuments, loadUpdates, loadPhotos, loadPlacements]);

  function handleProfileFieldChange(field, value) {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await updateKitten(kittenId, profileForm);
      setKitten(updated);
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

  async function handleCreateMedication(formData) {
    setTabLoading(true);
    await createMedication({ kittenId: Number.parseInt(kittenId, 10), ...formData });
    await loadMedical();
    setTabLoading(false);
  }

  async function handleCreateVetVisit(formData) {
    setTabLoading(true);
    await createVetAppointment({ kittenId: Number.parseInt(kittenId, 10), ...formData });
    await loadMedical();
    setTabLoading(false);
  }

  async function handleCreateWeight(formData) {
    setTabLoading(true);
    await createWeightLog({ kittenId: Number.parseInt(kittenId, 10), ...formData });
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
  const age = formatKittenAge(kitten.dateOfBirth);

  return (
    <>
      <div className={`rounded-lg border border-gray-200 bg-white shadow-sm ${embedded ? '' : 'print:hidden'}`}>
        {!embedded && (
          <div className="flex items-center justify-end gap-2 border-b border-gray-100 px-4 py-3">
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              <Printer className="h-3.5 w-3.5" />
              Print
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
                ['Age', formatKittenAgeShort(kitten.dateOfBirth)],
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

        <div className="max-h-[calc(100vh-320px)] overflow-y-auto p-5">
          {tabLoading && <p className="mb-3 text-xs text-gray-500">Saving...</p>}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              <KittenPhotoManager
                kitten={kitten}
                photos={galleryPhotos}
                editMode
                uploading={photoUploading}
                onUploadFiles={handleUploadPhotos}
                onSetPrimary={handleSetPrimaryPhoto}
                onDeletePhoto={handleDeletePhoto}
              />
            <form className="space-y-5" onSubmit={handleSaveProfile}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  ['name', 'Name', 'text'],
                  ['breed', 'Breed', 'text'],
                  ['color', 'Color', 'text'],
                  ['sex', 'Sex', 'text'],
                  ['fixedStatus', 'Fixed Status', 'text'],
                  ['status', 'Status', 'text'],
                  ['dateOfBirth', 'Date of Birth', 'date'],
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
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
            </div>
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
                  className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
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

          {activeTab === 'medical' && (
            <div className="space-y-8">
              <section>
                <h3 className="mb-3 text-xs font-bold uppercase text-gray-700">Vaccinations</h3>
                <VaccineForm onSubmit={handleCreateVaccine} />
                <VaccinesTable vaccines={medical.vaccines} />
              </section>
              <section>
                <h3 className="mb-3 text-xs font-bold uppercase text-gray-700">Medications</h3>
                <MedicationForm onSubmit={handleCreateMedication} />
                <MedicationsTable medications={medical.medications} />
              </section>
              <section>
                <h3 className="mb-3 text-xs font-bold uppercase text-gray-700">Vet Visits</h3>
                <VetVisitForm onSubmit={handleCreateVetVisit} />
                <VetVisitsTable vetAppointments={medical.vetAppointments} />
              </section>
            </div>
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
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
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
