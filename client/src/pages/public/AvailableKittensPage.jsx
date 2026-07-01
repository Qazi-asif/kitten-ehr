import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicKittenCard from '../../components/PublicKittenCard';
import PublicPageHeader from '../../components/PublicPageHeader';
import { fetchPublicKittens } from '../../services/publicApi';

const TABS = [
  { id: 'cats', label: 'Available Cats' },
  { id: 'faq', label: 'Adoption FAQ' },
  { id: 'stories', label: 'Success Stories' },
  { id: 'gallery', label: 'Gallery' },
];

const FAQ_ITEMS = [
  { q: 'What is the adoption process?', a: 'Submit an application, meet your kitten, complete a home check, and sign adoption paperwork.' },
  { q: 'What is the adoption fee?', a: 'Fees cover spay/neuter, vaccines, and microchip. Contact us for current rates.' },
  { q: 'Can I adopt if I rent?', a: 'Yes, with landlord approval. We are happy to provide documentation for your lease.' },
  { q: 'Do you adopt out of state?', a: 'We prioritize local adopters but consider out-of-area homes on a case-by-case basis.' },
];

const SUCCESS_STORIES = [
  { name: 'Mochi', text: 'Found her forever home after 3 weeks in foster care. Now rules the couch!' },
  { name: 'Pepper', text: 'A shy tabby who blossomed with patience — adopted by a wonderful family with two kids.' },
  { name: 'Whiskers', text: 'Bottle baby turned cuddle bug. His adopters send us updates every month.' },
];

const GALLERY = [
  '/images/kittens/biscuit.jpg',
  '/images/kittens/gravy.jpg',
  '/images/kittens/nugget.jpg',
  '/images/gallery/rescue-1.jpg',
  '/images/gallery/rescue-2.jpg',
  '/images/hero.jpg',
];

function AvailableKittensPage() {
  const [kittens, setKittens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cats');

  useEffect(() => {
    fetchPublicKittens()
      .then(setKittens)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative z-0 bg-white border-b border-slate-100 overflow-hidden h-[200px] lg:h-[350px]">
        {/* Left Content */}
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative z-10 py-12 lg:py-14 max-w-sm">
            <h1 className="text-6xl font-extrabold tracking-tight text-brand lg:text-7xl flex items-center gap-3">
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

        {/* Right Image — pinned to right edge, no border, no shadow, pill-left clipped */}
        <div className="hidden lg:block absolute inset-y-0 right-0 w-[58%] pointer-events-none">
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
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${activeTab === tab.id
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
                <h3 className="font-bold text-brand">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'stories' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {SUCCESS_STORIES.map((story) => (
              <div key={story.name} className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-brand">{story.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{story.text}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {GALLERY.map((src) => (
              <div key={src} className="aspect-square overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5">
                <img src={src} alt="Rescue kitten" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      <section className="py-10 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6 rounded-2xl border border-brand/40 bg-white px-8 py-6">
            {/* Heart + Paw Icon */}
            <div className="shrink-0">
              <svg viewBox="0 0 64 64" fill="none" className="h-16 w-16 text-brand" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M32 56 C32 56 8 40 8 22 C8 14 14 8 22 8 C26.5 8 30.5 10.5 32 14 C33.5 10.5 37.5 8 42 8 C50 8 56 14 56 22 C56 40 32 56 32 56Z" />
                <circle cx="26" cy="25" r="2.5" fill="currentColor" stroke="none" />
                <circle cx="32" cy="22" r="2.5" fill="currentColor" stroke="none" />
                <circle cx="38" cy="25" r="2.5" fill="currentColor" stroke="none" />
                <path d="M24 31 C24 27 40 27 40 31 C40 36 35 39 32 39 C29 39 24 36 24 31Z" fill="currentColor" stroke="none" />
              </svg>
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-brand">Adoption Application</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Ready to adopt? Submit an application and our team will be in touch to help you meet your new best friend.
              </p>
            </div>

            {/* CTA Button */}
            <div className="shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
              <Link
                to="/adopt"
                className="inline-flex items-center justify-center w-full rounded-xl bg-brand px-7 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark whitespace-nowrap"
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
