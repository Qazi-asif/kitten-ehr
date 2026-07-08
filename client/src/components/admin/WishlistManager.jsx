import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { WISHLIST_RETAILER_OPTIONS } from '../../constants/wishlists';
import { createWishlist, deleteWishlist, fetchWishlists } from '../../services/wishlistApi';

const emptyForm = {
  retailer: '',
  url: '',
  label: '',
};

function WishlistManager({ ownerType, ownerId, canManage = false, title = 'Manage Wishlists', description }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!ownerType || !ownerId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await fetchWishlists(ownerType, ownerId);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setItems([]);
      setError(err.message || 'Failed to load wishlists.');
    } finally {
      setLoading(false);
    }
  }, [ownerType, ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  const availableRetailers = useMemo(() => {
    const used = new Set(items.map((item) => item.retailer));
    return WISHLIST_RETAILER_OPTIONS.filter((option) => !used.has(option.value));
  }, [items]);

  useEffect(() => {
    if (!form.retailer && availableRetailers.length > 0) {
      setForm((prev) => ({ ...prev, retailer: availableRetailers[0].value }));
    }
  }, [availableRetailers, form.retailer]);

  async function handleAdd(event) {
    event.preventDefault();
    if (!canManage) return;

    setSaving(true);
    setError('');
    try {
      await createWishlist({
        ownerType,
        ownerId,
        retailer: form.retailer,
        url: form.url,
        label: form.label,
      });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to save wishlist.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!canManage) return;
    if (!window.confirm('Remove this wishlist link?')) return;

    setDeletingId(id);
    setError('');
    try {
      await deleteWishlist(id);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to delete wishlist.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-gray-500">Loading wishlists...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">No wishlist links yet.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{item.label || item.retailer}</p>
                <p className="text-xs uppercase tracking-wide text-gray-500">{item.retailer}</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block truncate text-xs text-brand hover:underline"
                >
                  {item.url}
                </a>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deletingId === item.id ? 'Removing...' : 'Remove'}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {canManage && availableRetailers.length > 0 && (
        <form onSubmit={handleAdd} className="mt-4 space-y-3 rounded-lg border border-dashed border-gray-300 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Add Wishlist Link</p>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-gray-500">Retailer</span>
            <select
              value={form.retailer}
              onChange={(e) => setForm((prev) => ({ ...prev, retailer: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {availableRetailers.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-gray-500">URL</span>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
              placeholder="https://..."
              required
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-gray-500">Label (optional)</span>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="Amazon Wishlist"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {saving ? 'Saving...' : 'Add Wishlist Link'}
          </button>
        </form>
      )}

      {canManage && !loading && availableRetailers.length === 0 && items.length > 0 && (
        <p className="mt-3 text-xs text-gray-500">All retailer wishlists are already configured.</p>
      )}
    </section>
  );
}

export default WishlistManager;
