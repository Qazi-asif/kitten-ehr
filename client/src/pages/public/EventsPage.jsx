import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicEventsCalendar, { toDateKey } from '../../components/PublicEventsCalendar';
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
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  useEffect(() => {
    fetchPublicEvents()
      .then((data) => {
        const sorted = [...(Array.isArray(data) ? data : [])].sort(
          (a, b) => new Date(a.date) - new Date(b.date),
        );
        setEvents(sorted);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const eventsByDate = useMemo(() => {
    const grouped = new Map();
    events.forEach((event) => {
      const key = toDateKey(event.date);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(event);
    });
    return grouped;
  }, [events]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate.get(toDateKey(selectedDate)) || [];
  }, [eventsByDate, selectedDate]);

  const upcomingEvents = useMemo(
    () => events.filter((event) => new Date(event.date) >= new Date()),
    [events],
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Events Calendar</h1>
      <p className="mt-2 text-slate-600">
        Browse adoption fairs, fundraisers, and community events on the calendar below.
      </p>

      {loading ? (
        <p className="mt-8 text-slate-500">Loading events...</p>
      ) : events.length === 0 ? (
        <p className="mt-8 rounded-xl bg-brand-light px-6 py-8 text-center text-slate-600">
          No public events right now. Check back soon!
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <PublicEventsCalendar
            events={events}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            monthDate={monthDate}
            onMonthChange={setMonthDate}
          />

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                {selectedDate
                  ? selectedDate.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })
                  : 'Selected Day'}
              </h2>
              {selectedDayEvents.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No events scheduled for this day.</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {selectedDayEvents.map((event) => (
                    <li key={event.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                        {formatEventDate(event.date)}
                      </p>
                      <h3 className="mt-1 text-base font-bold text-slate-900">
                        {event.slug ? (
                          <Link to={`/events/${event.slug}`} className="hover:text-brand">
                            {event.title}
                          </Link>
                        ) : (
                          event.title
                        )}
                      </h3>
                      {event.location && (
                        <p className="mt-1 text-sm text-slate-600">{event.location}</p>
                      )}
                      {event.slug && (
                        <Link
                          to={`/events/${event.slug}`}
                          className="mt-3 inline-flex text-sm font-semibold text-brand hover:underline"
                        >
                          View details →
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Coming Up</h2>
              {upcomingEvents.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No upcoming events scheduled.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {upcomingEvents.slice(0, 5).map((event) => (
                    <li key={event.id}>
                      {event.slug ? (
                        <Link
                          to={`/events/${event.slug}`}
                          className="block rounded-lg border border-slate-100 px-3 py-2 hover:border-brand/30 hover:bg-brand-light/30"
                        >
                          <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                          <p className="text-xs text-slate-500">{formatEventDate(event.date)}</p>
                        </Link>
                      ) : (
                        <div className="rounded-lg border border-slate-100 px-3 py-2">
                          <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                          <p className="text-xs text-slate-500">{formatEventDate(event.date)}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventsPage;
