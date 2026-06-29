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
      <PublicPageHeader title="Adopt" subtitle="Find your purr-fect match." />

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

      <section className="border-t border-slate-100 bg-brand-light/50 py-14">
        <div className="mx-auto max-w-2xl px-6 text-center lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900">Ready to Adopt?</h2>
          <p className="mt-3 text-slate-600">Start your adoption application today and meet your new best friend.</p>
          <Link to="/adopt" className="mt-6 inline-block rounded-md bg-brand px-8 py-3 text-sm font-semibold text-white hover:bg-brand-dark">
            Apply to Adopt
          </Link>
        </div>
      </section>
    </div>
  );
}

export default AvailableKittensPage;
