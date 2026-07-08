import { useCallback, useEffect, useRef, useState } from 'react';
import PublishingMatrix, { PublishTargetBadges } from '../../components/PublishingMatrix';
import { useAuth } from '../../context/AuthContext';
import { createContentItem, deleteContentItem, fetchContent, updateContentItem } from '../../services/api';
import { resolvePublishTargets } from '../../utils/publishTargets';
import {
  CONTENT_CATEGORY_EDUCATION,
  CONTENT_CATEGORY_SUCCESS_STORY,
  EDUCATION_CATEGORIES,
} from '../../constants/educationCategories';

const CATEGORY_OPTIONS = [
  { value: CONTENT_CATEGORY_SUCCESS_STORY, label: 'Success Story' },
  { value: CONTENT_CATEGORY_EDUCATION, label: 'Education (general)' },
  ...EDUCATION_CATEGORIES.map((category) => ({
    value: category.name,
    label: category.name,
  })),
];

const emptyForm = {
  title: '',
  slug: '',
  category: CONTENT_CATEGORY_EDUCATION,
  body: '',
  publishTargets: [],
};

function ContentManagerPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('content.manage');
  const formRef = useRef(null);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchContent();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setItems([]);
      setError(err.message || 'Failed to load articles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (editingId && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editingId]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canManage) {
      setError('You do not have permission to manage Education Hub articles.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateContentItem(editingId, form);
      } else {
        await createContentItem(form);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.message || 'Failed to save article.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item) {
    if (!canManage) {
      setError('You do not have permission to edit Education Hub articles.');
      return;
    }

    setEditingId(item.id);
    setForm({
      title: item.title ?? '',
      slug: item.slug ?? '',
      category: item.category ?? '',
      body: item.body ?? '',
      publishTargets: resolvePublishTargets(item),
    });
    setError('');
  }

  async function handleDelete(id) {
    if (!canManage) {
      setError('You do not have permission to delete Education Hub articles.');
      return;
    }
    if (!window.confirm('Delete this article? This cannot be undone.')) return;

    setDeletingId(id);
    setError('');
    try {
      await deleteContentItem(id);
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      setError(err.message || 'Failed to delete article.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!canManage && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You have view-only access. Ask an administrator for &quot;Manage Website Content&quot; permission to edit articles.
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={`mb-8 rounded-xl border bg-white p-6 shadow-md ${
          editingId ? 'border-brand ring-2 ring-brand/20' : 'border-gray-100'
        }`}
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {editingId ? `Edit Article: ${form.title || 'Untitled'}` : 'New Article'}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Title"
            required
            disabled={!canManage || saving}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-slate-50"
          />
          <input
            name="slug"
            value={form.slug}
            onChange={handleChange}
            placeholder="slug (optional)"
            disabled={!canManage || saving}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-slate-50"
          />
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            required
            disabled={!canManage || saving}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm md:col-span-2 disabled:bg-slate-50"
          >
            <option value="">Select category</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            {form.category && !CATEGORY_OPTIONS.some((option) => option.value === form.category) && (
              <option value={form.category}>{form.category} (legacy)</option>
            )}
          </select>
          <textarea
            name="body"
            value={form.body}
            onChange={handleChange}
            placeholder="Article body"
            rows={10}
            disabled={!canManage || saving}
            className="rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm md:col-span-2 disabled:bg-slate-50"
          />
          <p className="text-xs leading-relaxed text-slate-500 md:col-span-2">
            Formatting: <code className="rounded bg-slate-100 px-1">**bold**</code>,{' '}
            <code className="rounded bg-slate-100 px-1">*italic*</code>,{' '}
            <code className="rounded bg-slate-100 px-1">![caption](https://example.com/photo.jpg)</code>,{' '}
            <code className="rounded bg-slate-100 px-1">[link text](https://example.com)</code>.
            Use a blank line between paragraphs.
          </p>
        </div>

        <div className="mt-5">
          <PublishingMatrix
            currentTargets={form.publishTargets}
            onChange={(publishTargets) => {
              if (!canManage || saving) return;
              setForm((prev) => ({ ...prev, publishTargets }));
            }}
            title="Article Publishing"
            description="Choose every platform where this educational article should be shared. Select Website for the public Education Hub, or Internal for the new foster onboarding checklist."
            compact
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!canManage || saving}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : editingId ? 'Update Article' : 'Publish Article'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-gray-500">Loading articles...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Publish Targets</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    No articles yet. Create one using the form above.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className={editingId === item.id ? 'bg-brand-light/40' : 'hover:bg-slate-50'}
                  >
                    <td className="px-4 py-3 text-sm font-medium">{item.title}</td>
                    <td className="px-4 py-3 text-sm">{item.category || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <PublishTargetBadges targets={resolvePublishTargets(item)} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.slug}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        disabled={!canManage || saving || deletingId === item.id}
                        className="mr-3 font-medium text-brand hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={!canManage || saving || deletingId === item.id}
                        className="font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === item.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ContentManagerPage;
