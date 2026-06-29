import { useCallback, useEffect, useState } from 'react';
import { createEvent, deleteEvent, fetchEvents, updateEvent } from '../../services/api';

const initialForm = {
  title: '',
  date: '',
  location: '',
  description: '',
  isPublic: false,
};

function formatEventDate(value) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function toDateTimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchEvents();
    setEvents(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (editingId) {
      await updateEvent(editingId, form);
    } else {
      await createEvent(form);
    }
    setForm(initialForm);
    setEditingId(null);
    await load();
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      date: toDateTimeLocalValue(item.date),
      location: item.location,
      description: item.description,
      isPublic: item.isPublic,
    });
  }

  async function handleDelete(id) {
    await deleteEvent(id);
    await load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Events Calendar</h1>

      <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-slate-100 bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {editingId ? 'Edit Event' : 'Add Event'}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Date & Time</span>
            <input
              type="datetime-local"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Location</span>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Description</span>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              name="isPublic"
              checked={form.isPublic}
              onChange={handleChange}
              className="rounded border-slate-300"
            />
            <span className="text-sm font-medium text-slate-700">Show on public website</span>
          </label>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            type="submit"
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            {editingId ? 'Update Event' : 'Add Event'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(initialForm);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-slate-500">Loading events...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Public</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    No events scheduled yet.
                  </td>
                </tr>
              ) : (
                events.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.title}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatEventDate(item.date)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{item.location || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.isPublic
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                            : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                        }`}
                      >
                        {item.isPublic ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="mr-3 font-medium text-teal-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="font-medium text-red-600 hover:underline"
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
      )}
    </div>
  );
}

export default CalendarPage;
