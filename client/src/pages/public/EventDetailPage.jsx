import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import KittenPhoto from '../../components/KittenPhoto';
import { fetchPublicEventBySlug } from '../../services/publicApi';
import { getFileUrl } from '../../services/api';
import { formatPacificDisplay } from '../../utils/pacificDate.js';

function formatEventDate(value) {
  return formatPacificDisplay(value, { withTime: true });
}

function EventDetailPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPublicEventBySlug(slug)
      .then(setEvent)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="px-6 py-12 text-slate-500">Loading event...</div>;
  }

  if (error || !event) {
    return <div className="px-6 py-12 text-red-600">{error || 'Event not found'}</div>;
  }

  const kittens = Array.isArray(event.kittens) ? event.kittens : [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link to="/events" className="text-sm font-semibold text-brand hover:underline">
        ← Back to Events
      </Link>

      {event.imageUrl && (
        <img
          src={getFileUrl(event.imageUrl)}
          alt=""
          className="mt-6 h-64 w-full rounded-2xl object-cover"
        />
      )}

      <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-brand">
        {formatEventDate(event.date)}
      </p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">{event.title}</h1>
      {event.location && (
        <p className="mt-3 text-sm font-medium text-slate-600">{event.location}</p>
      )}
      {event.description && (
        <p className="mt-5 text-base leading-relaxed text-slate-700">{event.description}</p>
      )}

      {kittens.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-slate-900">Cats attending</h2>
          <p className="mt-1 text-sm text-slate-600">
            Adoptable cats tagged to this event.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {kittens.map((kitten, index) => (
              <Link
                key={kitten.id}
                to={`/kittens/${kitten.id}`}
                className={`group overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md ${
                  index === 0 ? 'sm:col-span-2 sm:row-span-2' : ''
                }`}
              >
                <div className={`overflow-hidden bg-slate-100 ${index === 0 ? 'aspect-[4/3]' : 'aspect-square'}`}>
                  <KittenPhoto
                    kitten={kitten}
                    allowFallback
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="px-3 py-3">
                  <p className="text-sm font-bold text-brand">{kitten.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default EventDetailPage;
