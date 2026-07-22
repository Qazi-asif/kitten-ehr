import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  createMarketingPost,
  deleteMarketingPost,
  fetchSocialPosts,
  publishSocialPost,
  updateMarketingPost,
} from '../../services/marketingApi';

const PLATFORM_OPTIONS = [
  { id: 'FACEBOOK', label: 'Facebook' },
  { id: 'INSTAGRAM', label: 'Instagram' },
  { id: 'X', label: 'X' },
  { id: 'TIKTOK', label: 'TikTok' },
];

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'posted', label: 'Posted' },
];

const emptyForm = {
  body: '',
  imageUrl: '',
  platforms: ['FACEBOOK'],
  scheduledFor: '',
};

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function toDateTimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

function MarketingPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('events.manage');
  const formRef = useRef(null);
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [publishingId, setPublishingId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSocialPosts(statusFilter === 'all' ? undefined : statusFilter);
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      setPosts([]);
      setError(err.message || 'Failed to load social posts.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (editingId && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editingId]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
  }

  function togglePlatform(platformId) {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter((value) => value !== platformId)
        : [...prev.platforms, platformId],
    }));
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      setForm((prev) => ({ ...prev, imageUrl: '' }));
      return;
    }

    try {
      const imageUrl = await readImageFile(file);
      setForm((prev) => ({ ...prev, imageUrl }));
    } catch (err) {
      setError(err.message || 'Failed to load image.');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canManage) return;

    setSaving(true);
    setError('');
    try {
      const payload = {
        body: form.body,
        imageUrl: form.imageUrl,
        platforms: form.platforms,
        scheduledFor: form.scheduledFor || null,
      };
      if (editingId) {
        await updateMarketingPost(editingId, payload);
      } else {
        await createMarketingPost(payload);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.message || 'Failed to save post.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(post) {
    if (!canManage) return;
    setEditingId(post.id);
    setForm({
      body: post.body ?? '',
      imageUrl: post.imageUrl ?? '',
      platforms: Array.isArray(post.platforms) && post.platforms.length > 0 ? post.platforms : ['FACEBOOK'],
      scheduledFor: toDateTimeLocalValue(post.scheduledFor),
    });
    setError('');
  }

  async function handleDelete(id) {
    if (!canManage) return;
    if (!window.confirm('Delete this social post? This cannot be undone.')) return;

    setDeletingId(id);
    setError('');
    try {
      await deleteMarketingPost(id);
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      setError(err.message || 'Failed to delete post.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handlePublish(id) {
    if (!canManage) return;
    if (!window.confirm('Publish this post now to Facebook/Instagram?')) return;

    setPublishingId(id);
    setError('');
    try {
      await publishSocialPost(id);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to publish post.');
    } finally {
      setPublishingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Marketing</h2>
        <p className="mt-1 text-sm text-slate-600">
          Draft and schedule social posts across Facebook, Instagram, X, and TikTok.
        </p>
      </div>

      <div className="mb-4 rounded-lg border border-brand/20 bg-brand-light/60 px-4 py-3 text-sm text-slate-700">
        <span className="font-semibold text-brand">AI Copywriter:</span>{' '}
        Generate Groq-backed kitten captions from a kitten profile →{' '}
        <span className="font-semibold">Publishing &amp; Social</span> →{' '}
        <span className="font-semibold">Generate AI Caption</span>.{' '}
        <Link to="/admin/kittens" className="font-semibold text-brand hover:underline">
          Open Kittens
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!canManage && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You have view-only access. Ask an administrator for event manage permission to create posts.
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={`mb-8 rounded-xl border bg-white p-6 shadow-sm ${
          editingId ? 'border-brand ring-2 ring-brand/20' : 'border-slate-200'
        }`}
      >
        <h3 className="text-lg font-semibold text-slate-900">
          {editingId ? 'Edit Post' : 'Create Post'}
        </h3>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Post Body</span>
            <textarea
              rows={5}
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              required
              disabled={!canManage || saving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              placeholder="Write the caption or post copy..."
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={!canManage || saving}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark"
            />
          </label>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">Platforms</legend>
            <div className="flex flex-wrap gap-4">
              {PLATFORM_OPTIONS.map((platform) => (
                <label key={platform.id} className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.platforms.includes(platform.id)}
                    onChange={() => togglePlatform(platform.id)}
                    disabled={!canManage || saving}
                    className="rounded border-slate-300 text-brand focus:ring-brand"
                  />
                  {platform.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block max-w-sm">
            <span className="mb-1 block text-sm font-medium text-slate-700">Scheduled For</span>
            <input
              type="datetime-local"
              value={form.scheduledFor}
              onChange={(e) => setForm((prev) => ({ ...prev, scheduledFor: e.target.value }))}
              disabled={!canManage || saving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!canManage || saving || form.platforms.length === 0}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {saving ? 'Saving...' : editingId ? 'Update Post' : 'Save Post'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              statusFilter === tab.id
                ? 'bg-brand text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Body</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Platforms</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Scheduled For</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">Loading posts...</td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No posts yet.</td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr
                  key={post.id}
                  className={`align-top ${editingId === post.id ? 'bg-brand-light/40' : 'hover:bg-slate-50'}`}
                >
                  <td className="max-w-md px-4 py-3 text-sm text-slate-700">
                    <p className="line-clamp-3 whitespace-pre-wrap">{post.body}</p>
                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt=""
                        className="mt-2 h-16 w-16 rounded-lg border border-slate-200 object-cover"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {(post.platforms || []).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDateTime(post.scheduledFor)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-700">
                      {post.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {post.status !== 'POSTED' && (
                      <button
                        type="button"
                        onClick={() => handlePublish(post.id)}
                        disabled={!canManage || saving || deletingId === post.id || publishingId === post.id}
                        className="mr-3 font-medium text-green-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {publishingId === post.id ? 'Publishing...' : 'Publish now'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startEdit(post)}
                      disabled={!canManage || saving || deletingId === post.id}
                      className="mr-3 font-medium text-brand hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(post.id)}
                      disabled={!canManage || saving || deletingId === post.id}
                      className="font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === post.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MarketingPage;
