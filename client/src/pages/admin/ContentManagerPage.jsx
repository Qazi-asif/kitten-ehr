import { useCallback, useEffect, useState } from 'react';
import { createContentItem, deleteContentItem, fetchContent, updateContentItem } from '../../services/api';

function ContentManagerPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: '', slug: '', category: '', body: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchContent();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (editingId) {
      await updateContentItem(editingId, form);
    } else {
      await createContentItem(form);
    }
    setForm({ title: '', slug: '', category: '', body: '' });
    setEditingId(null);
    await load();
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({ title: item.title, slug: item.slug, category: item.category, body: item.body });
  }

  async function handleDelete(id) {
    await deleteContentItem(id);
    await load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Content Manager</h1>

      <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-gray-100 bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold">{editingId ? 'Edit Article' : 'New Article'}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input name="title" value={form.title} onChange={handleChange} placeholder="Title" required className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input name="slug" value={form.slug} onChange={handleChange} placeholder="slug (optional)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input name="category" value={form.category} onChange={handleChange} placeholder="Category" className="rounded-lg border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
          <textarea name="body" value={form.body} onChange={handleChange} placeholder="Article body" rows={6} className="rounded-lg border border-gray-300 px-3 py-2 text-sm md:col-span-2" />
        </div>
        <button type="submit" className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          {editingId ? 'Update' : 'Publish'}
        </button>
      </form>

      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm font-medium">{item.title}</td>
                  <td className="px-4 py-3 text-sm">{item.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.slug}</td>
                  <td className="px-4 py-3 text-sm">
                    <button type="button" onClick={() => startEdit(item)} className="mr-3 text-emerald-700 hover:underline">Edit</button>
                    <button type="button" onClick={() => handleDelete(item.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ContentManagerPage;
