import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { WISHLIST_RETAILER_OPTIONS } from '../../constants/wishlists';
import {
  createWishlist,
  deleteWishlist,
  deleteWishlistGroup,
  fetchWishlists,
  groupWishlists,
  renameWishlistGroup,
  updateWishlist,
} from '../../services/wishlistApi';

const DEFAULT_GROUP_NAME = 'General Supplies';

const emptyForm = {
  groupName: '',
  retailer: '',
  url: '',
  label: '',
};

/**
 * `enableGroups` turns on the named-wishlist UI from CR-109. It is on for the
 * organization settings page; foster and kitten wishlists stay as a single
 * implicit list, so their links all land in the default group.
 */
function WishlistManager({
  ownerType,
  ownerId,
  canManage = false,
  enableGroups = false,
  title = 'Manage Wishlists',
  description,
}) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ url: '', label: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [busyGroup, setBusyGroup] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const groups = useMemo(() => groupWishlists(items), [items]);

  const targetGroupName = (enableGroups ? form.groupName.trim() : '') || DEFAULT_GROUP_NAME;

  // Retailers are unique per named list, so what is still available depends on
  // which list the new link is going into.
  const availableRetailers = useMemo(() => {
    const used = new Set(
      items
        .filter((item) => (item.groupName || DEFAULT_GROUP_NAME) === targetGroupName)
        .map((item) => item.retailer),
    );
    return WISHLIST_RETAILER_OPTIONS.filter((option) => !used.has(option.value));
  }, [items, targetGroupName]);

  useEffect(() => {
    if (availableRetailers.length === 0) return;
    const stillValid = availableRetailers.some((option) => option.value === form.retailer);
    if (!stillValid) {
      setForm((prev) => ({ ...prev, retailer: availableRetailers[0].value }));
    }
  }, [availableRetailers, form.retailer]);

  // Plain click handler, not a <form onSubmit> - this component is rendered
  // inside a larger profile-edit <form> in some parents (e.g.
  // KittenDetailPanel), and a nested <form> there caused this exact submit
  // to also bubble up and trigger the outer form's own unrelated save.
  async function handleAdd() {
    if (!canManage) return;

    if (!form.url.trim()) {
      setError('A URL is required.');
      setSuccess('');
      return;
    }
    if (availableRetailers.length === 0) {
      setError(`"${targetGroupName}" already has a link for every retailer.`);
      setSuccess('');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await createWishlist({
        ownerType,
        ownerId,
        groupName: targetGroupName,
        retailer: form.retailer,
        url: form.url,
        label: form.label,
      });
      // Keep the list name so several retailers can be added back to back.
      setForm((prev) => ({ ...emptyForm, groupName: prev.groupName }));
      await load();
      setSuccess('Wishlist link saved.');
    } catch (err) {
      setError(err.message || 'Failed to save wishlist.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditForm({ url: item.url || '', label: item.label || '' });
    setError('');
    setSuccess('');
  }

  async function handleSaveEdit(id) {
    if (!canManage) return;
    if (!editForm.url.trim()) {
      setError('A URL is required.');
      return;
    }

    setSavingEdit(true);
    setError('');
    setSuccess('');
    try {
      await updateWishlist(id, { url: editForm.url.trim(), label: editForm.label.trim() });
      setEditingId(null);
      await load();
      setSuccess('Wishlist link updated.');
    } catch (err) {
      setError(err.message || 'Failed to update wishlist link.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(id) {
    if (!canManage) return;
    if (!window.confirm('Remove this wishlist link?')) return;

    setDeletingId(id);
    setError('');
    setSuccess('');
    try {
      await deleteWishlist(id);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to delete wishlist.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRenameGroup(name) {
    if (!canManage) return;
    const next = window.prompt('Rename this wishlist:', name);
    if (next === null) return;
    if (!next.trim() || next.trim() === name) return;

    setBusyGroup(name);
    setError('');
    setSuccess('');
    try {
      await renameWishlistGroup({ ownerType, ownerId, from: name, to: next.trim() });
      await load();
      setSuccess('Wishlist renamed.');
    } catch (err) {
      setError(err.message || 'Failed to rename wishlist.');
    } finally {
      setBusyGroup('');
    }
  }

  async function handleDeleteGroup(name, linkCount) {
    if (!canManage) return;
    if (!window.confirm(`Delete "${name}" and its ${linkCount} link(s)?`)) return;

    setBusyGroup(name);
    setError('');
    setSuccess('');
    try {
      await deleteWishlistGroup({ ownerType, ownerId, groupName: name });
      await load();
      setSuccess('Wishlist deleted.');
    } catch (err) {
      setError(err.message || 'Failed to delete wishlist.');
    } finally {
      setBusyGroup('');
    }
  }

  function renderLink(item) {
    if (editingId === item.id) {
      return (
        <div key={item.id} className="space-y-2 rounded-lg border border-brand/40 bg-white p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">{item.retailer}</p>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-gray-500">URL</span>
            <input
              type="url"
              value={editForm.url}
              onChange={(e) => setEditForm((prev) => ({ ...prev, url: e.target.value }))}
              placeholder="https://..."
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-gray-500">Label (optional)</span>
            <input
              type="text"
              value={editForm.label}
              onChange={(e) => setEditForm((prev) => ({ ...prev, label: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSaveEdit(item.id)}
              disabled={savingEdit}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {savingEdit ? 'Saving...' : 'Save link'}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              disabled={savingEdit}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => startEdit(item)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              disabled={deletingId === item.id}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deletingId === item.id ? 'Removing...' : 'Remove'}
            </button>
          </div>
        )}
      </div>
    );
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

      {success && (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {success}
        </p>
      )}

      <div className="mt-4 space-y-4">
        {loading ? (
          <p className="text-sm text-gray-500">Loading wishlists...</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-gray-500">No wishlist links yet.</p>
        ) : enableGroups ? (
          groups.map((group) => (
            <div key={group.name} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-gray-900">
                  {group.name}
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    {group.links.length} link{group.links.length === 1 ? '' : 's'}
                  </span>
                </p>
                {canManage && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRenameGroup(group.name)}
                      disabled={busyGroup === group.name}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(group.name, group.links.length)}
                      disabled={busyGroup === group.name}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete list
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-3 space-y-3">{group.links.map(renderLink)}</div>
            </div>
          ))
        ) : (
          groups.flatMap((group) => group.links).map(renderLink)
        )}
      </div>

      {canManage && (
        <div className="mt-4 space-y-3 rounded-lg border border-dashed border-gray-300 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Add Wishlist Link
          </p>

          {enableGroups && (
            <label className="block">
              <span className="text-xs font-semibold uppercase text-gray-500">Wishlist name</span>
              <input
                type="text"
                list="wishlist-group-names"
                value={form.groupName}
                onChange={(e) => setForm((prev) => ({ ...prev, groupName: e.target.value }))}
                placeholder={DEFAULT_GROUP_NAME}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <datalist id="wishlist-group-names">
                {groups.map((group) => (
                  <option key={group.name} value={group.name} />
                ))}
              </datalist>
              <span className="mt-1 block text-xs text-gray-500">
                Type a new name to start another list, or pick an existing one to add a retailer to it.
              </span>
            </label>
          )}

          <label className="block">
            <span className="text-xs font-semibold uppercase text-gray-500">Retailer</span>
            <select
              value={form.retailer}
              onChange={(e) => setForm((prev) => ({ ...prev, retailer: e.target.value }))}
              disabled={availableRetailers.length === 0}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-100"
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
            type="button"
            onClick={handleAdd}
            disabled={saving || availableRetailers.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {saving ? 'Saving...' : 'Add Wishlist Link'}
          </button>
          {availableRetailers.length === 0 && (
            <p className="text-xs text-gray-500">
              {enableGroups
                ? `"${targetGroupName}" already has a link for every retailer. Use a different wishlist name to add more.`
                : 'All retailer wishlists are already configured.'}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default WishlistManager;
