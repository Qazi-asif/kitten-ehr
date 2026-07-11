import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, FileSignature, Mail, Paperclip, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import AgreementTemplatesPanel from '../../components/admin/AgreementTemplatesPanel';
import ContractEditModal from '../../components/admin/ContractEditModal';
import ContractViewModal from '../../components/admin/ContractViewModal';
import ContractSigningPad from '../../components/ContractSigningPad';
import {
  createContractDraft,
  deleteContract,
  emailContractAgreement,
  emailSignedContractPdf,
  fetchApplications,
  fetchContractById,
  fetchContracts,
  fetchContractTemplates,
  fetchFosters,
  fetchKittenById,
  fetchKittens,
  markContractSigned,
  updateContract,
} from '../../services/api';
import { resolveContractKittenName } from '../../utils/contractAudit';
import { getDefaultContractText } from '../../utils/contractText';
import { CONTRACT_TEMPLATES, getContractTemplateLabel } from '../../constants/contractTemplates';
import { getApplicationSummary, parseApplicationFormData } from '../../utils/applicationFormData';

const STATUS_STYLES = {
  SENT: 'bg-amber-100 text-amber-800',
  SIGNED: 'bg-emerald-100 text-emerald-800',
  VOID: 'bg-slate-100 text-slate-600',
};

const EMPTY_DRAFT = {
  templateSlug: 'foster_supplies_provided',
  signerName: '',
  signerEmail: '',
  signerAddress: '',
  signerPhone: '',
  microchipNumber: '',
  kittenName: '',
  kittenId: null,
  fosterId: null,
  applicationId: null,
  emergencyContactName: '',
  emergencyContactPhone: '',
  documentVersion: '2026.1',
};

const EMPTY_FILTERS = {
  search: '',
  status: '',
  dateFrom: '',
  dateTo: '',
  dateField: 'created',
};

function ContractsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [signingContract, setSigningContract] = useState(null);
  const [reviewContract, setReviewContract] = useState(null);
  const [editContract, setEditContract] = useState(null);
  const [agreementTemplates, setAgreementTemplates] = useState([]);
  const [emailingId, setEmailingId] = useState(null);
  const [emailingPdfId, setEmailingPdfId] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showDraftForm, setShowDraftForm] = useState(false);
  const [draftForm, setDraftForm] = useState(EMPTY_DRAFT);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Kitten/foster/adopter picker state (draft creation only). Selecting a
  // record auto-fills the corresponding text fields below but never disables
  // them - staff can still hand-edit anything before sending, per the
  // approved "auto-fill is editable, not locked" decision.
  const [kittenQuery, setKittenQuery] = useState('');
  const [kittenResults, setKittenResults] = useState([]);
  const [kittenSearching, setKittenSearching] = useState(false);
  const [kittenResultsOpen, setKittenResultsOpen] = useState(false);
  const [selectedKittenLabel, setSelectedKittenLabel] = useState('');

  const [personQuery, setPersonQuery] = useState('');
  const [personOptions, setPersonOptions] = useState([]);
  const [personLoading, setPersonLoading] = useState(false);
  const [personResultsOpen, setPersonResultsOpen] = useState(false);
  const [selectedPersonLabel, setSelectedPersonLabel] = useState('');

  const load = useCallback(async (nextFilters = appliedFilters) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchContracts({
        search: nextFilters.search,
        status: nextFilters.status,
        dateFrom: nextFilters.dateFrom,
        dateTo: nextFilters.dateTo,
        dateField: nextFilters.dateField === 'signed' ? 'signed' : 'created',
      });
      setContracts(data);
    } catch (err) {
      setError(err.message);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    const initial = {
      search: searchParams.get('search') || '',
      status: searchParams.get('status') || '',
      dateFrom: searchParams.get('dateFrom') || '',
      dateTo: searchParams.get('dateTo') || '',
      dateField: searchParams.get('dateField') || 'created',
    };
    setFilters(initial);
    setAppliedFilters(initial);
    load(initial);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchContractTemplates()
      .then((data) => setAgreementTemplates(Array.isArray(data) ? data : []))
      .catch(() => setAgreementTemplates([]));
  }, []);

  const templateOptions = agreementTemplates.length
    ? agreementTemplates.map((template) => ({ slug: template.slug, label: template.label }))
    : CONTRACT_TEMPLATES;

  const reviewId = searchParams.get('review') || searchParams.get('view');

  useEffect(() => {
    if (!reviewId) return;

    const match = contracts.find((c) => String(c.id) === reviewId);
    if (match) {
      setReviewContract(match);
      return;
    }

    fetchContractById(reviewId)
      .then((contract) => setReviewContract(contract))
      .catch(() => {});
  }, [reviewId, contracts]);

  const statusCounts = useMemo(() => {
    const counts = { SENT: 0, SIGNED: 0, VOID: 0 };
    contracts.forEach((c) => {
      if (counts[c.status] !== undefined) counts[c.status] += 1;
    });
    return counts;
  }, [contracts]);

  function applyFilters(e) {
    e?.preventDefault();
    setAppliedFilters(filters);
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.dateField && filters.dateField !== 'created') params.set('dateField', filters.dateField);
    setSearchParams(params);
    load(filters);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setSearchParams({});
    load(EMPTY_FILTERS);
  }

  async function handleSign(payload) {
    await markContractSigned(payload.contractId, payload);
    setSigningContract(null);
    await load();
  }

  async function handleCreateDraft(e) {
    e.preventDefault();
    setCreatingDraft(true);
    setError('');
    try {
      await createContractDraft({
        templateSlug: draftForm.templateSlug,
        signerName: draftForm.signerName.trim(),
        signerEmail: draftForm.signerEmail.trim(),
        signerAddress: draftForm.signerAddress.trim(),
        signerPhone: draftForm.signerPhone.trim(),
        microchipNumber: draftForm.microchipNumber.trim(),
        kittenName: draftForm.kittenName.trim(),
        kittenId: draftForm.kittenId || undefined,
        fosterId: draftForm.fosterId || undefined,
        applicationId: draftForm.applicationId || undefined,
        emergencyContactName: draftIsAdoption ? '' : draftForm.emergencyContactName.trim(),
        emergencyContactPhone: draftIsAdoption ? '' : draftForm.emergencyContactPhone.trim(),
        documentVersion: draftForm.documentVersion.trim(),
      });
      setDraftForm(EMPTY_DRAFT);
      setKittenQuery('');
      setKittenResults([]);
      setSelectedKittenLabel('');
      setPersonQuery('');
      setPersonOptions([]);
      setSelectedPersonLabel('');
      setShowDraftForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingDraft(false);
    }
  }

  async function handleSaveEdit(data) {
    setSavingEdit(true);
    try {
      await updateContract(editContract.id, data);
      setEditContract(null);
      await load();
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(contract) {
    const kitten = resolveContractKittenName(contract);
    const confirmed = window.confirm(
      `Delete ${contract.type} contract for ${contract.signerName}${kitten !== '—' ? ` (${kitten})` : ''}? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(contract.id);
    setError('');
    try {
      await deleteContract(contract.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleEmail(contract) {
    const note = window.prompt('Optional message to include in the email (leave blank for none):', '');
    if (note === null) return;

    setEmailingId(contract.id);
    setError('');
    try {
      await emailContractAgreement(contract.id, { note: note.trim() });
      window.alert(`Agreement emailed to ${contract.signerEmail}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setEmailingId(null);
    }
  }

  async function handleEmailPdf(contract) {
    setEmailingPdfId(contract.id);
    setError('');
    try {
      const result = await emailSignedContractPdf(contract.id);
      if (result.previewUrl) {
        window.alert(
          `Signed PDF emailed to ${contract.signerEmail}.\n\nThis looks like a test SMTP account - preview the captured email here:\n${result.previewUrl}`,
        );
        window.open(result.previewUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.alert(`Signed PDF emailed to ${contract.signerEmail}.`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setEmailingPdfId(null);
    }
  }

  function openReview(contract) {
    setReviewContract(contract);
    const params = new URLSearchParams(searchParams);
    params.set('view', String(contract.id));
    params.delete('review');
    setSearchParams(params);
  }

  function closeReview() {
    setReviewContract(null);
    const params = new URLSearchParams(searchParams);
    params.delete('review');
    params.delete('view');
    setSearchParams(params);
  }

  const draftIsAdoption = draftForm.templateSlug === 'adoption';

  // Debounced kitten search - the /kittens endpoint pagination-wraps its
  // response ({ items, total, ... }) whenever a `search` param is present,
  // so results are read from data.items, not the raw array.
  useEffect(() => {
    if (!showDraftForm) return undefined;
    const query = kittenQuery.trim();
    if (query.length < 2) {
      setKittenResults([]);
      setKittenSearching(false);
      return undefined;
    }
    let cancelled = false;
    setKittenSearching(true);
    const timer = setTimeout(() => {
      fetchKittens({ search: query })
        .then((data) => {
          if (cancelled) return;
          setKittenResults(Array.isArray(data) ? data : (data?.items || []));
        })
        .catch(() => {
          if (!cancelled) setKittenResults([]);
        })
        .finally(() => {
          if (!cancelled) setKittenSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [kittenQuery, showDraftForm]);

  // Foster/applicant options load in full when the draft form opens (or the
  // template type flips between Foster/Adoption) and are filtered client
  // side as staff type - fetchFosters() has no server-side search param
  // today, and fetchApplications() is a small enough list to filter locally.
  useEffect(() => {
    if (!showDraftForm) return undefined;
    let cancelled = false;
    setPersonLoading(true);
    const loader = draftIsAdoption ? fetchApplications('Approved') : fetchFosters();
    loader
      .then((data) => {
        if (!cancelled) setPersonOptions(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setPersonOptions([]);
      })
      .finally(() => {
        if (!cancelled) setPersonLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showDraftForm, draftIsAdoption]);

  const filteredPersonOptions = useMemo(() => {
    const query = personQuery.trim().toLowerCase();
    if (!query) return personOptions.slice(0, 8);
    return personOptions
      .filter((option) => {
        const label = draftIsAdoption ? getApplicationSummary(option.formData) : (option.name || '');
        const email = draftIsAdoption ? (parseApplicationFormData(option.formData).email || '') : (option.email || '');
        return `${label} ${email}`.toLowerCase().includes(query);
      })
      .slice(0, 8);
  }, [personOptions, personQuery, draftIsAdoption]);

  function handleSelectKitten(kitten) {
    setKittenResultsOpen(false);
    setKittenQuery('');
    setSelectedKittenLabel(kitten.name);
    setDraftForm((prev) => ({ ...prev, kittenId: kitten.id, kittenName: kitten.name }));

    // microchipNumber isn't included in the search-list payload (kittenListSelect
    // omits it) - fetch the full record so Adoption drafts still get it auto-filled.
    if (draftIsAdoption) {
      fetchKittenById(kitten.id)
        .then((full) => {
          if (full?.microchipNumber) {
            setDraftForm((prev) => ({ ...prev, microchipNumber: full.microchipNumber }));
          }
        })
        .catch(() => {});
    }
  }

  function clearSelectedKitten() {
    setSelectedKittenLabel('');
    setDraftForm((prev) => ({ ...prev, kittenId: null }));
  }

  function handleSelectPerson(option) {
    setPersonResultsOpen(false);
    setPersonQuery('');
    if (draftIsAdoption) {
      const parsed = parseApplicationFormData(option.formData);
      setSelectedPersonLabel(getApplicationSummary(option.formData));
      setDraftForm((prev) => ({
        ...prev,
        applicationId: option.id,
        fosterId: null,
        signerName: parsed.fullName || prev.signerName,
        signerEmail: parsed.email || prev.signerEmail,
        signerPhone: parsed.phone || prev.signerPhone,
        signerAddress: parsed.address || prev.signerAddress,
      }));
    } else {
      setSelectedPersonLabel(option.name || '');
      setDraftForm((prev) => ({
        ...prev,
        fosterId: option.id,
        applicationId: null,
        signerName: option.name || prev.signerName,
        signerEmail: option.email || prev.signerEmail,
        signerPhone: option.phone || prev.signerPhone,
        signerAddress: option.address || prev.signerAddress,
      }));
    }
  }

  function clearSelectedPerson() {
    setSelectedPersonLabel('');
    setDraftForm((prev) => ({ ...prev, fosterId: null, applicationId: null }));
  }

  function handleDraftTemplateChange(nextSlug) {
    const nextIsAdoption = nextSlug === 'adoption';
    if (nextIsAdoption !== draftIsAdoption) {
      setSelectedPersonLabel('');
      setPersonQuery('');
      setPersonOptions([]);
      setDraftForm((prev) => ({ ...prev, templateSlug: nextSlug, fosterId: null, applicationId: null }));
    } else {
      setDraftForm((prev) => ({ ...prev, templateSlug: nextSlug }));
    }
  }

  return (
    <div>
      <AgreementTemplatesPanel />
      <div className="mb-6 flex flex-wrap items-center justify-end gap-4">
        <button
          type="button"
          onClick={() => setShowDraftForm((open) => !open)}
          className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
        >
          <Plus className="h-4 w-4" />
          Create Draft Contract
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Pending', value: statusCounts.SENT, style: 'border-amber-200 bg-amber-50 text-amber-800' },
          { label: 'Signed', value: statusCounts.SIGNED, style: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
          { label: 'Void', value: statusCounts.VOID, style: 'border-slate-200 bg-slate-50 text-slate-600' },
          { label: 'Showing', value: contracts.length, style: 'border-neutral-200 bg-white text-neutral-900' },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl border px-4 py-3 ${card.style}`}>
            <p className="text-xs font-semibold uppercase">{card.label}</p>
            <p className="mt-1 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <form
        onSubmit={applyFilters}
        className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          <label className="block lg:col-span-2">
            <span className="text-xs font-semibold uppercase text-gray-500">Search</span>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Kitten name, signer, or email"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-gray-500">Status</span>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="SENT">Pending (SENT)</option>
              <option value="SIGNED">Signed</option>
              <option value="VOID">Void</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-gray-500">Date from</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-gray-500">Date to</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <label className="inline-flex items-center gap-2 text-sm text-gray-600">
            <span className="text-xs font-semibold uppercase text-gray-500">Date field</span>
            <select
              value={filters.dateField}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateField: e.target.value }))}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="created">Created date</option>
              <option value="signed">Signed date</option>
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              type="submit"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              Search
            </button>
          </div>
        </div>
      </form>

      {showDraftForm && (
        <form
          onSubmit={handleCreateDraft}
          className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">New draft contract</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase text-gray-500">Agreement template</span>
              <select
                value={draftForm.templateSlug}
                onChange={(e) => handleDraftTemplateChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {templateOptions.map((template) => (
                  <option key={template.slug} value={template.slug}>{template.label}</option>
                ))}
              </select>
            </label>

            <div className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase text-gray-500">Find kitten</span>
              {draftForm.kittenId ? (
                <div className="mt-1 flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm">
                  <span className="font-medium text-emerald-900">{selectedKittenLabel || draftForm.kittenName}</span>
                  <button type="button" onClick={clearSelectedKitten} className="text-xs font-semibold text-emerald-700 hover:underline">
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative mt-1">
                  <input
                    value={kittenQuery}
                    onChange={(e) => { setKittenQuery(e.target.value); setKittenResultsOpen(true); }}
                    onFocus={() => setKittenResultsOpen(true)}
                    placeholder="Search kittens by name..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  {kittenResultsOpen && kittenQuery.trim().length >= 2 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                      {kittenSearching ? (
                        <p className="px-3 py-2 text-sm text-gray-500">Searching...</p>
                      ) : kittenResults.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-gray-500">No kittens found.</p>
                      ) : (
                        kittenResults.map((kitten) => (
                          <button
                            key={kitten.id}
                            type="button"
                            onClick={() => handleSelectKitten(kitten)}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            {kitten.name}
                            <span className="ml-1 text-xs text-gray-400">{kitten.breed || ''}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
              <label className="mt-2 block">
                <span className="text-xs text-gray-400">Or type a kitten name (no linked record)</span>
                <input
                  value={draftForm.kittenName}
                  onChange={(e) => setDraftForm((prev) => ({ ...prev, kittenName: e.target.value }))}
                  placeholder="e.g. Biscuit"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase text-gray-500">
                {draftIsAdoption ? 'Find adopter (approved application)' : 'Find foster'}
              </span>
              {(draftForm.fosterId || draftForm.applicationId) ? (
                <div className="mt-1 flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm">
                  <span className="font-medium text-emerald-900">{selectedPersonLabel}</span>
                  <button type="button" onClick={clearSelectedPerson} className="text-xs font-semibold text-emerald-700 hover:underline">
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative mt-1">
                  <input
                    value={personQuery}
                    onChange={(e) => { setPersonQuery(e.target.value); setPersonResultsOpen(true); }}
                    onFocus={() => setPersonResultsOpen(true)}
                    placeholder={draftIsAdoption ? 'Search approved applications...' : 'Search fosters...'}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  {personResultsOpen && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                      {personLoading ? (
                        <p className="px-3 py-2 text-sm text-gray-500">Loading...</p>
                      ) : filteredPersonOptions.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-gray-500">
                          {draftIsAdoption ? 'No approved applications found.' : 'No fosters found.'}
                        </p>
                      ) : (
                        filteredPersonOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleSelectPerson(option)}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            {draftIsAdoption ? getApplicationSummary(option.formData) : option.name}
                            <span className="ml-1 text-xs text-gray-400">
                              {draftIsAdoption ? parseApplicationFormData(option.formData).email : option.email}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Optional - leave unselected to send a draft without a linked record.
              </p>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase text-gray-500">Signer name</span>
              <input
                required
                value={draftForm.signerName}
                onChange={(e) => setDraftForm((prev) => ({ ...prev, signerName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-gray-500">Signer email</span>
              <input
                type="email"
                required
                value={draftForm.signerEmail}
                onChange={(e) => setDraftForm((prev) => ({ ...prev, signerEmail: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-gray-500">Address</span>
              <input
                value={draftForm.signerAddress}
                onChange={(e) => setDraftForm((prev) => ({ ...prev, signerAddress: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-gray-500">Phone</span>
              <input
                value={draftForm.signerPhone}
                onChange={(e) => setDraftForm((prev) => ({ ...prev, signerPhone: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            {draftIsAdoption && (
              <label className="block">
                <span className="text-xs font-semibold uppercase text-gray-500">Microchip number</span>
                <input
                  value={draftForm.microchipNumber}
                  onChange={(e) => setDraftForm((prev) => ({ ...prev, microchipNumber: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            )}
            {!draftIsAdoption && (
              <>
                <label className="block">
                  <span className="text-xs font-semibold uppercase text-gray-500">Emergency contact name</span>
                  <input
                    value={draftForm.emergencyContactName}
                    onChange={(e) => setDraftForm((prev) => ({ ...prev, emergencyContactName: e.target.value }))}
                    placeholder="Foster Care Agreement only"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase text-gray-500">Emergency contact phone</span>
                  <input
                    value={draftForm.emergencyContactPhone}
                    onChange={(e) => setDraftForm((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
              </>
            )}
            <label className="block">
              <span className="text-xs font-semibold uppercase text-gray-500">Document version</span>
              <input
                required
                value={draftForm.documentVersion}
                onChange={(e) => setDraftForm((prev) => ({ ...prev, documentVersion: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDraftForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingDraft}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {creatingDraft ? 'Creating...' : 'Create Draft'}
            </button>
          </div>
        </form>
      )}

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Loading contracts...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Kitten</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Signer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Signed</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contracts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                      No contracts match your search.
                    </td>
                  </tr>
                ) : (
                  contracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {resolveContractKittenName(contract)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{contract.signerName}</p>
                        <p className="text-xs text-gray-500">{contract.signerEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{getContractTemplateLabel(contract.templateSlug)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[contract.status] || STATUS_STYLES.SENT}`}>
                          {contract.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(contract.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {contract.signedAt ? new Date(contract.signedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <button
                            type="button"
                            onClick={() => openReview(contract)}
                            className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                          {contract.status !== 'VOID' && (
                            <button
                              type="button"
                              onClick={() => handleEmail(contract)}
                              disabled={emailingId === contract.id}
                              className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline disabled:opacity-50"
                            >
                              <Mail className="h-4 w-4" />
                              {emailingId === contract.id ? 'Sending...' : 'Email'}
                            </button>
                          )}
                          {contract.status === 'SIGNED' && (
                            <button
                              type="button"
                              onClick={() => handleEmailPdf(contract)}
                              disabled={emailingPdfId === contract.id || !contract.pdfUrl}
                              title={!contract.pdfUrl ? 'No PDF available for this contract' : undefined}
                              className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:underline disabled:opacity-50"
                            >
                              <Paperclip className="h-4 w-4" />
                              {emailingPdfId === contract.id ? 'Sending...' : 'Email Signed PDF'}
                            </button>
                          )}
                          {contract.status === 'SENT' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setSigningContract(contract)}
                                className="inline-flex items-center gap-1 font-semibold text-neutral-900 hover:underline"
                              >
                                <FileSignature className="h-4 w-4" />
                                Sign
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditContract(contract)}
                                className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:underline"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(contract)}
                                disabled={deletingId === contract.id}
                                className="inline-flex items-center gap-1 font-semibold text-red-600 hover:underline disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                {deletingId === contract.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </>
                          )}
                          {contract.status === 'VOID' && (
                            <button
                              type="button"
                              onClick={() => handleDelete(contract)}
                              disabled={deletingId === contract.id}
                              className="inline-flex items-center gap-1 font-semibold text-red-600 hover:underline disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {signingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="h-full w-full max-h-[900px] max-w-4xl overflow-hidden rounded-2xl border border-neutral-300 shadow-2xl">
            <ContractSigningPad
              contractId={signingContract.id}
              contractText={getDefaultContractText(signingContract, agreementTemplates)}
              signerName={signingContract.signerName}
              contractType={signingContract.type}
              onClose={() => setSigningContract(null)}
              onSign={handleSign}
            />
          </div>
        </div>
      )}

      <ContractViewModal
        contract={reviewContract}
        templates={agreementTemplates}
        onClose={closeReview}
      />

      <ContractEditModal
        contract={editContract}
        templateOptions={templateOptions}
        onClose={() => setEditContract(null)}
        onSave={handleSaveEdit}
        saving={savingEdit}
      />
    </div>
  );
}

export default ContractsPage;
