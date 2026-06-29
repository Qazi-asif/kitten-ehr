import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, ExternalLink, Printer } from 'lucide-react';
import StatusBadge from '../components/admin/StatusBadge';
import DocumentUploadForm from '../components/DocumentUploadForm';
import DocumentsList from '../components/DocumentsList';
import FaceSheet from '../components/FaceSheet';
import KittenPhoto from '../components/KittenPhoto';
import KittenPrimaryPhotoForm from '../components/KittenPrimaryPhotoForm';
import MedicationForm from '../components/MedicationForm';
import MedicationsTable from '../components/MedicationsTable';
import VaccineForm from '../components/VaccineForm';
import VaccinesTable from '../components/VaccinesTable';
import VetVisitForm from '../components/VetVisitForm';
import VetVisitsTable from '../components/VetVisitsTable';
import WeightLogForm from '../components/WeightLogForm';
import WeightLogsTable from '../components/WeightLogsTable';
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
  getFileUrl,
  uploadDocument,
  uploadPrimaryPhoto,
} from '../services/api';
import { formatKittenAgeShort } from '../utils/kittenAge';
import { formatKittenAge } from '../utils/kittenImages';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'vaccinations', label: 'Vaccines' },
  { id: 'medications', label: 'Medications' },
  { id: 'vet-visits', label: 'Medical' },
  { id: 'weight', label: 'Weight' },
  { id: 'documents', label: 'Documents' },
];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function KittenDetailPage() {
  const { id } = useParams();
  const [kitten, setKitten] = useState(null);
  const [medical, setMedical] = useState({ vaccines: [], medications: [], vetAppointments: [] });
  const [weightLogs, setWeightLogs] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);
  const [error, setError] = useState(null);

  const loadKitten = useCallback(async () => {
    const data = await fetchKittenById(id);
    setKitten(data);
    setPublicProfile(data.status === 'Available for Adoption');
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

  useEffect(() => {
    setLoading(true);
    setError(null);
    loadKitten()
      .then(async () => {
        await Promise.all([loadMedical(), loadWeights(), loadDocuments()]);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id, loadKitten, loadMedical, loadWeights, loadDocuments]);

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

  async function handlePrimaryPhotoUpload(file) {
    setPhotoUploading(true);
    const updated = await uploadPrimaryPhoto(id, file);
    setKitten(updated);
    await loadDocuments();
    setPhotoUploading(false);
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
  const photoDocs = documents.filter((d) => d.docType?.includes('Photo') || d.fileUrl?.match(/\.(jpg|jpeg|png|webp)$/i)).slice(0, 4);
  const age = formatKittenAge(kitten.dateOfBirth);

  return (
    <>
      <div className="print:hidden">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link to="/admin/kittens" className="text-sm font-medium text-brand hover:underline">← Back to Kittens</Link>
          <div className="flex items-center gap-2">
            <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Actions
              <ChevronDown className="h-4 w-4" />
            </button>
            <button type="button" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Edit
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

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
            <div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <KittenPhoto kitten={kitten} allowFallback className="aspect-square w-full" />
              </div>
              <div className="mt-3 flex gap-2">
                <KittenPhoto kitten={kitten} allowFallback className="h-14 w-14 rounded-lg border border-slate-200" />
                {photoDocs.slice(0, 2).map((doc) => (
                  <img key={doc.id} src={getFileUrl(doc.fileUrl)} alt="" className="h-14 w-14 rounded-lg border border-slate-200 object-cover" />
                ))}
                {documents.length > 3 && (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                    +{documents.length - 3}
                  </div>
                )}
              </div>
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
            {tabLoading && <p className="mb-4 text-sm text-slate-500">Saving...</p>}

            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-6">
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
                  <KittenPrimaryPhotoForm
                    kitten={kitten}
                    currentPhotoUrl={kitten.primaryPhotoUrl}
                    onUpload={handlePrimaryPhotoUpload}
                    uploading={photoUploading}
                  />
                </div>

                <div className="space-y-6">
                  <section className="rounded-lg border border-slate-100 p-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-900">Public Profile</h2>
                      <button
                        type="button"
                        onClick={() => setPublicProfile((v) => !v)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${publicProfile ? 'bg-brand' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${publicProfile ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Public Profile {publicProfile ? 'Enabled' : 'Disabled'}</p>
                    {publicProfile && kitten.status === 'Available for Adoption' && (
                      <Link to={`/kittens/${kitten.id}`} target="_blank" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
                        View Public Profile
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </section>

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
                      readOnly
                      value={kitten.notes || ''}
                      placeholder="No general notes yet."
                      rows={3}
                      className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                    />
                  </section>
                </div>
              </div>
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
