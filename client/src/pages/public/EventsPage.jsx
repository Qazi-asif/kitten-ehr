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

  const pastEvents = useMemo(
    () => events.filter((event) => new Date(event.date) < new Date()).reverse(),
    [events],
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Events</h1>
      <p className="mt-2 text-lg text-slate-600">Come meet the cats. Bring a friend.</p>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600">
        From adoption events to volunteer meetups, this is where you&apos;ll find us out in the community. Browse what&apos;s coming up, see which cats will be there, and RSVP so we know to look for you. Every event is a chance to meet an adoptable cat, learn about fostering, or just get your cat fix for the day.
      </p>

      {loading ? (
        <p className="mt-8 text-slate-500">Loading events...</p>
      ) : events.length === 0 ? (
        <p className="mt-8 rounded-xl bg-brand-light px-6 py-8 text-center text-slate-600">
          No events on the calendar right now, but we&apos;re never quiet for long. Follow us on Instagram and Facebook for the first word on adoption events, pop-ups, and meetups.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="mb-4 text-lg font-bold text-slate-900">Upcoming Events</h2>
            <PublicEventsCalendar
              events={events}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              monthDate={monthDate}
              onMonthChange={setMonthDate}
            />
          </div>

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
                          View details
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Upcoming Events</h2>
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

      {pastEvents.length > 0 && (
        <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Past Events</h2>
          <p className="mt-2 text-sm text-slate-600">
            Miss one? Here&apos;s where our cats have been lately. Every event puts more cats in front of the people who&apos;ll take them home.
          </p>
          <ul className="mt-4 space-y-3">
            {pastEvents.slice(0, 5).map((event) => (
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
        </section>
      )}

      <section className="mt-12 rounded-2xl border border-brand/25 bg-brand-light/20 p-6 text-center">
        <p className="text-sm leading-relaxed text-slate-700">
          Want us at your business, school, or community event? We love a good tabling opportunity. Reach out through our{' '}
          <Link to="/contact" className="font-semibold text-brand hover:underline">
            Contact
          </Link>{' '}
          page and let&apos;s set it up.
        </p>
      </section>
    </div>
  );
}

export default EventsPage;
