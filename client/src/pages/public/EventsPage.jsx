import { useEffect, useState } from 'react';
import { fetchPublicEvents } from '../../services/publicApi';

function formatEventDate(value) {
  return new Date(value).toLocaleString(undefined, {
    weekday: 'long',
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicEvents()
      .then((data) => {
        const upcoming = data
          .filter((event) => new Date(event.date) >= new Date())
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        setEvents(upcoming);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Upcoming Events</h1>
      <p className="mt-2 text-slate-600">
        Join us at adoption fairs, fundraisers, and community events.
      </p>

      {loading ? (
        <p className="mt-8 text-slate-500">Loading events...</p>
      ) : events.length === 0 ? (
        <p className="mt-8 rounded-xl bg-brand-light px-6 py-8 text-center text-slate-600">
          No upcoming public events right now. Check back soon!
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-xl border border-slate-100 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-brand">
                {formatEventDate(event.date)}
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">{event.title}</h2>
              {event.location && (
                <p className="mt-2 text-sm font-medium text-slate-600">{event.location}</p>
              )}
              {event.description && (
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{event.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default EventsPage;
