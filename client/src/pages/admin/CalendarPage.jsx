import { useCallback, useEffect, useMemo, useState } from 'react';
import PublishingMatrix, { PublishTargetBadges } from '../../components/PublishingMatrix';
import KittenSearchMultiSelect from '../../components/admin/KittenSearchMultiSelect';
import PublicEventsCalendar from '../../components/PublicEventsCalendar';
import {
  createEvent,
  deleteEvent,
  fetchEvents,
  fetchKittens,
  getFileUrl,
  updateEvent,
  uploadEventImage,
} from '../../services/api';
import { resolvePublishTargets } from '../../utils/publishTargets';

const initialForm = {
  title: '',
  date: '',
  location: '',
  description: '',
  publishTargets: ['WEBSITE'],
  kittenIds: [],
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
  const [kittens, setKittens] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const load = useCallback(async () => {
    setLoading(true);
    const [eventData, kittenData] = await Promise.all([
      fetchEvents(),
      fetchKittens(),
    ]);
    setEvents(eventData);
    setKittens(Array.isArray(kittenData) ? kittenData : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    return events.filter((event) => {
      const d = new Date(event.date);
      const eventKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return eventKey === key;
    });
  }, [events, selectedDate]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
    setImagePreviewUrl(file ? URL.createObjectURL(file) : '');
  }

  function resetImageState() {
    setImageFile(null);
    setImagePreviewUrl('');
    setCurrentImageUrl('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const savedEvent = editingId
        ? await updateEvent(editingId, form)
        : await createEvent(form);

      if (imageFile && savedEvent?.id) {
        await uploadEventImage(savedEvent.id, imageFile);
      }

      setForm(initialForm);
      setEditingId(null);
      resetImageState();
      await load();
    } catch (err) {
      setError(err.message || 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      date: toDateTimeLocalValue(item.date),
      location: item.location,
      description: item.description,
      publishTargets: resolvePublishTargets(item),
      kittenIds: (item.eventCats || []).map((entry) => entry.kitten?.id || entry.kittenId).filter(Boolean),
    });
    setImageFile(null);
    setImagePreviewUrl('');
    setCurrentImageUrl(item.imageUrl || '');
    setError('');
  }

  async function handleDelete(id) {
    await deleteEvent(id);
    await load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Events Calendar</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

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
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Banner Image</span>
            {(imagePreviewUrl || currentImageUrl) && (
              <img
                src={imagePreviewUrl || getFileUrl(currentImageUrl)}
                alt="Event banner preview"
                className="mb-2 h-32 w-full max-w-sm rounded-lg border border-slate-200 object-cover"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark"
            />
          </label>
        </div>

        <div className="mt-5">
          <KittenSearchMultiSelect
            kittens={kittens}
            selectedIds={form.kittenIds}
            onChange={(kittenIds) => setForm((prev) => ({ ...prev, kittenIds }))}
          />
        </div>

        <div className="mt-5">
          <PublishingMatrix
            currentTargets={form.publishTargets}
            onChange={(publishTargets) => setForm((prev) => ({ ...prev, publishTargets }))}
            title="Event Publishing"
            description="Choose where this event should be promoted. Website publishes it on the public calendar."
            compact
          />
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {saving ? 'Saving...' : editingId ? 'Update Event' : 'Add Event'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(initialForm);
                resetImageState();
                setError('');
              }}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-slate-500">Loading events...</p>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <PublicEventsCalendar
              events={events}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              monthDate={monthDate}
              onMonthChange={setMonthDate}
            />
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                {selectedDate
                  ? selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
                  : 'Select a day'}
              </h2>
              {selectedDayEvents.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No events on this day.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {selectedDayEvents.map((item) => (
                    <li key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatEventDate(item.date)}</p>
                      {item.location ? (
                        <p className="mt-1 text-xs text-slate-500">{item.location}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Banner</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Cats</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Publish Targets</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                      No events scheduled yet.
                    </td>
                  </tr>
                ) : (
                  events.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm">
                        {item.imageUrl ? (
                          <img
                            src={getFileUrl(item.imageUrl)}
                            alt=""
                            className="h-10 w-16 rounded-md border border-slate-200 object-cover"
                          />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.title}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatEventDate(item.date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.location || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.eventCats?.length || 0}</td>
                      <td className="px-4 py-3 text-sm">
                        <PublishTargetBadges targets={resolvePublishTargets(item)} />
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
        </div>
      )}
    </div>
  );
}

export default CalendarPage;
