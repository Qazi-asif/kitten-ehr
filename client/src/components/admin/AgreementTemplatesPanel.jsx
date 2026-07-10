import { useEffect, useState } from 'react';
import { Eye, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import {
  createContractTemplate,
  deleteContractTemplate,
  fetchContractTemplates,
  resetContractTemplate,
  updateContractTemplate,
} from '../../services/api';
import { DEFAULT_AGREEMENT_TEMPLATES } from '../../constants/defaultAgreementTemplates';
import { getContractAgreementText } from '../../utils/contractText';

const EMPTY_NEW = {
  label: '',
  slug: '',
  type: 'FOSTER',
  version: '2026.1',
  bodyText: '',
};

function AgreementTemplatesPanel() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewSlug, setViewSlug] = useState(null);
  const [editSlug, setEditSlug] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_NEW);
  const [saving, setSaving] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState(null);

  async function loadTemplates() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchContractTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setTemplates(DEFAULT_AGREEMENT_TEMPLATES);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  function openEdit(template) {
    setEditSlug(template.slug);
    setEditForm({
      label: template.label,
      type: template.type,
      version: template.version,
      bodyText: template.bodyText,
    });
    setError('');
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateContractTemplate(editSlug, editForm);
      setEditSlug(null);
      setEditForm(null);
      await loadTemplates();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createContractTemplate(newForm);
      setNewForm(EMPTY_NEW);
      setShowAddForm(false);
      await loadTemplates();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(template) {
    const confirmed = window.confirm(`Delete agreement template "${template.label}"?`);
    if (!confirmed) return;

    setDeletingSlug(template.slug);
    setError('');
    try {
      await deleteContractTemplate(template.slug);
      if (viewSlug === template.slug) setViewSlug(null);
      if (editSlug === template.slug) {
        setEditSlug(null);
        setEditForm(null);
      }
      await loadTemplates();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingSlug(null);
    }
  }

  async function handleReset(template) {
    const confirmed = window.confirm(`Reset "${template.label}" to the default agreement text?`);
    if (!confirmed) return;

    setSaving(true);
    setError('');
    try {
      await resetContractTemplate(template.slug);
      await loadTemplates();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const viewTemplate = templates.find((template) => template.slug === viewSlug);
  const isDefaultSlug = (slug) => DEFAULT_AGREEMENT_TEMPLATES.some((template) => template.slug === slug);

  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">Agreement templates</h2>
          <p className="mt-1 text-sm text-gray-500">
            View, edit, or add agreement documents used when creating contracts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm((open) => !open)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" />
          Add agreement
        </button>
      </div>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {showAddForm && (
        <form onSubmit={handleAdd} className="mt-4 rounded-lg border border-dashed border-gray-300 p-4">
          <h3 className="text-sm font-semibold text-gray-800">New agreement template</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase text-gray-500">Label</span>
              <input
                required
                value={newForm.label}
                onChange={(e) => setNewForm((prev) => ({ ...prev, label: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-gray-500">Slug (optional)</span>
              <input
                value={newForm.slug}
                onChange={(e) => setNewForm((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="auto-generated from label"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-gray-500">Type</span>
              <select
                value={newForm.type}
                onChange={(e) => setNewForm((prev) => ({ ...prev, type: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="FOSTER">Foster</option>
                <option value="ADOPTION">Adoption</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase text-gray-500">Agreement body</span>
              <textarea
                required
                rows={8}
                value={newForm.bodyText}
                onChange={(e) => setNewForm((prev) => ({ ...prev, bodyText: e.target.value }))}
                placeholder="Use placeholders like {{signerName}}, {{kittenName}}, {{signerAddress}}"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save template'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Loading templates...</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100">
          {templates.map((template) => (
            <li key={template.slug} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{template.label}</p>
                <p className="text-xs text-gray-500">
                  {template.type} · {template.slug} · v{template.version}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setViewSlug(template.slug)}
                  className="inline-flex items-center gap-1 font-semibold text-neutral-900 hover:underline"
                >
                  <Eye className="h-4 w-4" />
                  View
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(template)}
                  className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:underline"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                {isDefaultSlug(template.slug) && (
                  <button
                    type="button"
                    onClick={() => handleReset(template)}
                    className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:underline"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>
                )}
                {!isDefaultSlug(template.slug) && (
                  <button
                    type="button"
                    onClick={() => handleDelete(template)}
                    disabled={deletingSlug === template.slug}
                    className="inline-flex items-center gap-1 font-semibold text-red-600 hover:underline disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {viewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setViewSlug(null)} aria-hidden="true" />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">{viewTemplate.label}</h3>
              <button type="button" onClick={() => setViewSlug(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
                {viewTemplate.bodyText}
              </pre>
            </div>
          </div>
        </div>
      )}

      {editSlug && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => { setEditSlug(null); setEditForm(null); }} aria-hidden="true" />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <form onSubmit={handleSaveEdit} className="flex max-h-[90vh] flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h3 className="text-lg font-bold text-slate-900">Edit agreement template</h3>
                <button
                  type="button"
                  onClick={() => { setEditSlug(null); setEditForm(null); }}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-semibold uppercase text-gray-500">Label</span>
                    <input
                      required
                      value={editForm.label}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, label: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-gray-500">Type</span>
                    <select
                      value={editForm.type}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="FOSTER">Foster</option>
                      <option value="ADOPTION">Adoption</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-gray-500">Version</span>
                    <input
                      required
                      value={editForm.version}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, version: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-semibold uppercase text-gray-500">Agreement body</span>
                    <textarea
                      required
                      rows={14}
                      value={editForm.bodyText}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, bodyText: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
                    />
                  </label>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Preview with sample data:{' '}
                  {getContractAgreementText(
                    {
                      templateSlug: editSlug,
                      signerName: 'Jane Doe',
                      signerEmail: 'jane@example.com',
                      signerPhone: '(555) 555-0100',
                      signerAddress: '123 Main St, Riverside, CA',
                      kittenName: 'Biscuit',
                      microchipNumber: '985112004123456',
                      documentVersion: editForm.version,
                    },
                    [{ slug: editSlug, bodyText: editForm.bodyText }],
                  ).slice(0, 180)}
                  …
                </p>
              </div>
              <div className="border-t border-slate-200 px-6 py-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default AgreementTemplatesPanel;
