import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicKittenCard from '../../components/PublicKittenCard';
import {
  CONTENT_CATEGORY_SUCCESS_STORY,
  articleExcerpt,
} from '../../constants/educationCategories';
import { ADOPT_CAT_FILTERS, matchesAdoptFilter } from '../../utils/kittenFilters';
import { fetchPublicContent, fetchPublicKittens } from '../../services/publicApi';

function AvailableKittensPage() {
  const [kittens, setKittens] = useState([]);
  const [successStories, setSuccessStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  // Kept separate from the success-stories fetch below: a real failure here
  // (e.g. a timed-out request) needs to surface as a visible error with a
  // retry action, not silently fall through to "no cats match this filter"
  // the way an unhandled Promise.all rejection previously did.
  const loadKittens = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchPublicKittens()
      .then((kittensData) => {
        setKittens(kittensData);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load cats.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    // Fired in parallel — success stories are non-critical and degrade
    // silently to an empty list on failure, kittens do not.
    loadKittens();
    fetchPublicContent(CONTENT_CATEGORY_SUCCESS_STORY)
      .then((storiesData) => {
        setSuccessStories(Array.isArray(storiesData) ? storiesData : []);
      })
      .catch(() => setSuccessStories([]))
      .finally(() => setStoriesLoading(false));
  }, [loadKittens]);

  const filteredKittens = useMemo(
    () => kittens.filter((kitten) => matchesAdoptFilter(kitten, activeFilter)),
    [kittens, activeFilter],
  );

  return (
    <div>
      <section className="relative z-0 h-[200px] overflow-hidden border-b border-slate-100 bg-white lg:h-[350px]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative z-10 max-w-2xl py-12 lg:py-14">
            <h1 className="flex items-center gap-3 text-6xl font-extrabold tracking-tight text-brand lg:text-7xl">
              Adopt
              <svg viewBox="0 0 100 100" fill="currentColor" className="h-12 w-12 text-brand">
                <circle cx="25" cy="30" r="9" />
                <circle cx="43" cy="18" r="10" />
                <circle cx="63" cy="18" r="10" />
                <circle cx="81" cy="32" r="9" />
                <path d="M 52,43 C 33,43 21,57 21,72 C 21,87 34,96 52,96 C 70,96 83,87 83,72 C 83,57 71,43 52,43 Z" />
              </svg>
            </h1>
            <p className="mt-3 max-w-md text-lg font-medium leading-relaxed text-slate-600">
              Every cat here lives with a foster who knows them: their quirks, their favorite spot, their whole personality. Ask us anything.
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] lg:block">
          <img
            src="/images/about-hero.png"
            alt="Adopt a cat"
            className="h-full w-full object-cover object-left"
          />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <p className="mb-6 text-base leading-relaxed text-slate-600">
          Every cat below is vetted, vaccinated, microchipped, and ready. Tap Meet Me to start.
        </p>

        <div className="mb-8 flex flex-wrap gap-2">
          {ADOPT_CAT_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                activeFilter === filter.id
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-500">Loading cats...</p>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-12 text-center">
            <p className="text-lg font-medium text-red-700">Couldn't load cats</p>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={loadKittens}
              className="mt-5 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Try again
            </button>
          </div>
        ) : filteredKittens.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-lg font-medium text-slate-700">No cats match this filter right now</p>
            <p className="mt-2 text-sm text-slate-500">Try another filter or check back soon for new arrivals.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filteredKittens.map((kitten) => (
              <PublicKittenCard key={kitten.id} kitten={kitten} />
            ))}
          </div>
        )}
      </div>

      <section className="border-t border-slate-100 bg-slate-50 px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-bold text-slate-900">Success Stories</h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600">
            Real cats, real couches. Every one of these started out of options.
          </p>
          {storiesLoading ? (
            <p className="mt-8 text-slate-500">Loading success stories...</p>
          ) : successStories.length === 0 ? (
            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-12 text-center">
              <p className="text-lg font-medium text-slate-700">No success stories yet</p>
              <p className="mt-2 text-sm text-slate-500">Check back soon for adoption updates from our community.</p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              {successStories.map((story) => (
                <div key={story.id} className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-brand">{story.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {articleExcerpt(story.body, 500)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="px-6 py-10 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col items-center gap-6 rounded-2xl border border-brand/40 bg-white px-8 py-6 text-center sm:flex-row sm:items-start sm:text-left">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-brand">Adoption Application</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Ready to adopt? Submit an application and our team will be in touch to help you meet your new best friend.
              </p>
            </div>
            <div className="mt-2 w-full shrink-0 sm:mt-0 sm:w-auto">
              <Link
                to="/adopt/apply"
                className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-xl bg-brand px-7 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark sm:w-auto"
              >
                Apply to Adopt
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AvailableKittensPage;
