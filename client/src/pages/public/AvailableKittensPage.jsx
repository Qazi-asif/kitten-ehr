import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicKittenCard from '../../components/PublicKittenCard';
import {
  CONTENT_CATEGORY_SUCCESS_STORY,
  articleExcerpt,
} from '../../constants/educationCategories';
import { fetchPublicContent, fetchPublicKittens } from '../../services/publicApi';

const TABS = [
  { id: 'cats', label: 'Available Cats' },
  { id: 'faq', label: 'Adoption FAQ' },
  { id: 'stories', label: 'Success Stories' },
];

const FAQ_ITEMS = [
  {
    q: 'What is the adoption process?',
    a: 'Submit an application, we review it and reach out, you meet the cat, and if it\'s a match you sign the adoption agreement and pay the fee. Most adoptions wrap up within about a week.',
  },
  {
    q: 'What is the adoption fee?',
    a: '$150, due at adoption. It covers spay or neuter, age-appropriate vaccines, deworming, microchip, and the care that got your cat healthy. It\'s an adoption fee, not a purchase price, and it\'s a fraction of what the same vetting costs out of pocket.',
  },
  {
    q: 'Do I have to keep my cat indoors?',
    a: 'Yes. Every adoption is indoor-only. Catios and supervised harness time are wonderful; free roaming is not. Indoor cats live longer, healthier lives, and it\'s a condition of every adoption.',
  },
  {
    q: 'What about declawing?',
    a: 'Never. Declawing is an amputation, not a nail trim, and it\'s illegal in California. Our adoption agreement prohibits it anywhere.',
  },
  {
    q: 'Can I adopt if I rent?',
    a: 'Yes, as long as your lease or landlord allows cats. Confirming that is your responsibility, and we\'re glad to help with documentation.',
  },
  {
    q: 'What do I know about my cat\'s health?',
    a: 'Everything we know, you know: full medical records, history, and quirks. Rescue cats come from unknown backgrounds, so we can\'t guarantee the future, but we never hide the past.',
  },
  {
    q: 'What if it doesn\'t work out?',
    a: 'Bring the cat back to us. Every adoption comes with a lifetime return promise: any reason, any time, no judgment. Please never rehome a Pawsitive cat on your own, and never surrender one to a shelter. They always have a home with us.',
  },
  {
    q: 'Can I adopt as a gift or surprise?',
    a: 'No. Cats are adopted to the household they\'ll live in, so bring the actual adopter through the process. We promise it\'s painless.',
  },
  {
    q: 'Do you adopt outside the area?',
    a: 'We prioritize homes in the Inland Empire and greater Southern California. Out-of-area applications are considered case by case.',
  },
];

function AvailableKittensPage() {
  const [kittens, setKittens] = useState([]);
  const [successStories, setSuccessStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cats');

  useEffect(() => {
    fetchPublicKittens()
      .then(setKittens)
      .finally(() => setLoading(false));

    fetchPublicContent(CONTENT_CATEGORY_SUCCESS_STORY)
      .then((data) => setSuccessStories(Array.isArray(data) ? data : []))
      .catch(() => setSuccessStories([]))
      .finally(() => setStoriesLoading(false));
  }, []);

  return (
    <div>
      <section className="relative z-0 h-[200px] overflow-hidden border-b border-slate-100 bg-white lg:h-[350px]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative z-10 max-w-sm py-12 lg:py-14">
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
            <p className="mt-3 text-lg font-medium text-slate-600">Find your purr-fect match.</p>
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

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-2 px-6 py-4 lg:px-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {activeTab === 'cats' && (
          <>
            <p className="mb-8 text-base leading-relaxed text-slate-600">
              Every cat below is vetted, vaccinated, microchipped, and ready. Tap Meet Me to start.
            </p>
            {loading ? (
              <p className="text-slate-500">Loading cats...</p>
            ) : kittens.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
                <p className="text-lg font-medium text-slate-700">No cats available right now</p>
                <p className="mt-2 text-sm text-slate-500">Check back soon for new arrivals.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {kittens.map((kitten) => (
                  <PublicKittenCard key={kitten.id} kitten={kitten} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'faq' && (
          <div className="mx-auto max-w-3xl space-y-6">
            {FAQ_ITEMS.map((item) => (
              <div key={item.q} className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="font-bold text-slate-900">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'stories' && (
          <>
            <p className="mb-8 text-base leading-relaxed text-slate-600">
              Real cats, real couches. Every one of these started out of options.
            </p>
            {storiesLoading ? (
              <p className="text-slate-500">Loading success stories...</p>
            ) : successStories.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
                <p className="text-lg font-medium text-slate-700">No success stories yet</p>
                <p className="mt-2 text-sm text-slate-500">Check back soon for adoption updates from our community.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
          </>
        )}
      </div>

      <section className="px-6 py-10 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col items-center gap-6 rounded-2xl border border-brand/40 bg-white px-8 py-6 text-center sm:flex-row sm:items-start sm:text-left">
            <div className="shrink-0">
              <svg viewBox="0 0 64 64" fill="none" className="h-16 w-16 text-brand" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M32 56 C32 56 8 40 8 22 C8 14 14 8 22 8 C26.5 8 30.5 10.5 32 14 C33.5 10.5 37.5 8 42 8 C50 8 56 14 56 22 C56 40 32 56 32 56Z" />
                <circle cx="26" cy="25" r="2.5" fill="currentColor" stroke="none" />
                <circle cx="32" cy="22" r="2.5" fill="currentColor" stroke="none" />
                <circle cx="38" cy="25" r="2.5" fill="currentColor" stroke="none" />
                <path d="M24 31 C24 27 40 27 40 31 C40 36 35 39 32 39 C29 39 24 36 24 31Z" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-brand">Adoption Application</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Ready to adopt? Submit an application and our team will be in touch to help you meet your new best friend.
              </p>
            </div>
            <div className="mt-2 w-full shrink-0 sm:mt-0 sm:w-auto">
              <Link
                to="/adopt"
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
