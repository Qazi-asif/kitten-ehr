import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Printer } from 'lucide-react';
import StatusBadge from './StatusBadge';
import DocumentUploadForm from '../DocumentUploadForm';
import DocumentsList from '../DocumentsList';
import FaceSheet from '../FaceSheet';
import KittenPhoto from '../KittenPhoto';
import KittenPrimaryPhotoForm from '../KittenPrimaryPhotoForm';
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
  fetchMedicalRecords,
  fetchWeightLogs,
  uploadDocument,
  uploadPrimaryPhoto,
} from '../../services/api';
import { formatKittenAgeShort } from '../../utils/kittenAge';
import { formatKittenAge } from '../../utils/kittenImages';

const TABS = [
  { id: 'profile', label: 'Profile' },
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
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);
  const [error, setError] = useState(null);

  const loadKitten = useCallback(async () => {
    const data = await fetchKittenById(kittenId);
    setKitten(data);
    setPublicProfile(data.status === 'Available for Adoption');
    return data;
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

  useEffect(() => {
    if (!kittenId) return undefined;
    setLoading(true);
    setError(null);
    setActiveTab('profile');
    loadKitten()
      .then(async () => {
        await Promise.all([loadMedical(), loadWeights(), loadDocuments()]);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
    return undefined;
  }, [kittenId, loadKitten, loadMedical, loadWeights, loadDocuments]);

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

  async function handlePrimaryPhotoUpload(file) {
    setPhotoUploading(true);
    const updated = await uploadPrimaryPhoto(kittenId, file);
    setKitten(updated);
    await loadDocuments();
    setPhotoUploading(false);
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
            <div className="space-y-5">
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700">Rescue Story</h3>
                <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm leading-relaxed text-gray-600">
                  {kitten.rescueStory || 'No rescue story recorded yet.'}
                </p>
              </section>
              <section className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Public Profile</p>
                  <p className="text-xs text-gray-500">{publicProfile ? 'Enabled' : 'Disabled'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPublicProfile((v) => !v)}
                  className={`relative h-6 w-11 rounded-full ${publicProfile ? 'bg-emerald-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${publicProfile ? 'left-5' : 'left-0.5'}`} />
                </button>
              </section>
              {publicProfile && kitten.status === 'Available for Adoption' && (
                <Link to={`/kittens/${kitten.id}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline">
                  View Public Profile
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
              <KittenPrimaryPhotoForm
                kitten={kitten}
                currentPhotoUrl={kitten.primaryPhotoUrl}
                onUpload={handlePrimaryPhotoUpload}
                uploading={photoUploading}
              />
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
            <div className="space-y-3 text-sm text-gray-600">
              <p><span className="font-semibold text-gray-800">Current Foster:</span> {kitten.currentFoster?.name || 'None'}</p>
              <p><span className="font-semibold text-gray-800">Intake Date:</span> {formatDate(kitten.intakeDate)}</p>
              <p><span className="font-semibold text-gray-800">Intake Source:</span> {kitten.intakeSource || '—'}</p>
              {kitten.currentFoster && (
                <Link to={`/admin/fosters/${kitten.currentFoster.id}`} className="inline-block text-sm font-semibold text-emerald-700 hover:underline">
                  View foster profile →
                </Link>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <section>
                <h3 className="text-xs font-bold uppercase text-gray-700">General Notes</h3>
                <textarea readOnly rows={4} placeholder="No general notes yet." className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600" />
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase text-gray-700">Internal Notes (Private)</h3>
                <textarea readOnly rows={4} placeholder="Private staff notes." className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600" />
              </section>
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
