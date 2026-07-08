import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { fetchPublicKittenById, fetchPublicKittenUpdates } from '../../services/publicApi';
import KittenPhoto from '../../components/KittenPhoto';
import { formatKittenAgeDetailed } from '../../utils/kittenAge';

const SPONSOR_TIERS = [
  {
    id: 'kickstart',
    name: 'Kickstart Kitty',
    price: 15,
    description: 'A vaccine, a dewormer, or a week of formula',
  },
  {
    id: 'shots',
    name: 'Shots & Chips',
    price: 40,
    description: 'Full vaccine set plus a microchip',
  },
  {
    id: 'belly',
    name: 'Belly & Box',
    price: 75,
    description: 'A month of food, litter, and flea prevention',
  },
  {
    id: 'fix',
    name: 'The Big Fix',
    price: 135,
    getDescription: (name) => `Covers ${name}'s spay or neuter surgery`,
  },
  {
    id: 'caboodle',
    name: 'Whole Kitten Caboodle',
    price: 350,
    getDescription: (name) => `Everything, pull to placement. Your name on ${name}'s page.`,
  },
];

const KITTEN_WISHLISTS = [
  {
    field: 'amazonWishlistUrl',
    label: 'Amazon Wishlist',
    description: 'Shop supplies for this kitten',
    buttonClass: 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100',
  },
  {
    field: 'walmartWishlistUrl',
    label: 'Walmart Wishlist',
    description: 'Help with everyday essentials',
    buttonClass: 'border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100',
  },
  {
    field: 'chewyWishlistUrl',
    label: 'Chewy Wishlist',
    description: 'Food, formula, and pet supplies',
    buttonClass: 'border-teal-300 bg-teal-50 text-teal-900 hover:bg-teal-100',
  },
];

function tierDescription(tier, kittenName) {
  if (tier.getDescription) return tier.getDescription(kittenName);
  return tier.description;
}

function PublicKittenProfile() {
  const { id } = useParams();
  const sponsorRef = useRef(null);
  const wishlistRef = useRef(null);
  const [kitten, setKitten] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTierId, setSelectedTierId] = useState(SPONSOR_TIERS[0].id);
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    Promise.all([fetchPublicKittenById(id), fetchPublicKittenUpdates(id)])
      .then(([kittenData, updateData]) => {
        setKitten(kittenData);
        setUpdates(updateData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  function scrollToRef(ref) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-slate-500">Loading...</div>;
  if (error) return <div className="px-6 py-12 text-red-600">{error}</div>;

  const activeWishlists = KITTEN_WISHLISTS.filter((store) => kitten[store.field]);
  const selectedTier = SPONSOR_TIERS.find((tier) => tier.id === selectedTierId) || SPONSOR_TIERS[0];
  const sponsorAmount = customAmount.trim() || String(selectedTier.price);

  const infoPills = [
    { label: 'Age', value: formatKittenAgeDetailed(kitten.dateOfBirth) },
    { label: 'Sex', value: kitten.sex || 'Unknown' },
    { label: 'Breed', value: kitten.breed || 'Mixed' },
    { label: 'Fixed', value: kitten.fixedStatus || 'Pending' },
  ];

  return (
    <div className="bg-gradient-to-b from-brand-light/30 to-white">
      <div className="relative aspect-[16/9] max-h-[480px] w-full overflow-hidden bg-slate-100 sm:aspect-[21/8]">
        <KittenPhoto kitten={kitten} allowFallback className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 py-8 lg:px-10">
          <Link to="/kittens" className="text-sm font-medium text-white/90 hover:text-white">← Back to Adopt</Link>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">{kitten.name}</h1>
          {kitten.websiteFeaturedComment && (
            <p className="mt-2 max-w-2xl text-lg font-medium text-white/95">{kitten.websiteFeaturedComment}</p>
          )}
        </div>
      </div>

      <div className="border-b border-brand/15 bg-white/90 px-6 py-4 backdrop-blur-sm lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-brand">Ready to welcome {kitten.name} home?</p>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/adopt?kitten=${encodeURIComponent(kitten.name)}`}
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-dark"
            >
              Adopt Me
            </Link>
            <button
              type="button"
              onClick={() => scrollToRef(sponsorRef)}
              className="rounded-lg border-2 border-brand bg-white px-5 py-2.5 text-sm font-bold text-brand hover:bg-brand-light"
            >
              Sponsor Me
            </button>
            <button
              type="button"
              onClick={() => scrollToRef(wishlistRef)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <ShoppingBag className="h-4 w-4" />
              Wishlist
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-5 lg:px-10">
        <div className="space-y-8 lg:col-span-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">About Me</h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              {kitten.rescueStory || `${kitten.name} is waiting for a loving family. Ask us about their personality, care needs, and adoption process.`}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {infoPills.map((pill) => (
                <span
                  key={pill.label}
                  className="inline-flex items-center rounded-full border border-brand/20 bg-brand-light/50 px-3 py-1.5 text-xs font-semibold text-brand"
                >
                  {pill.label}: {pill.value}
                </span>
              ))}
            </div>
          </section>

          <section ref={wishlistRef} id="wishlist" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Wishlist</h2>
            {activeWishlists.length > 0 ? (
              <>
                <p className="mt-2 text-sm text-slate-600">
                  Send supplies directly to support {kitten.name}&apos;s care through these store wishlists.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {activeWishlists.map((store) => (
                    <a
                      key={store.field}
                      href={kitten[store.field]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex flex-col rounded-xl border p-4 text-center transition-colors ${store.buttonClass}`}
                    >
                      <span className="text-sm font-bold">{store.label}</span>
                      <span className="mt-1 text-xs opacity-80">{store.description}</span>
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                Wishlist links for {kitten.name} are coming soon.{' '}
                <Link to="/donate" className="font-semibold text-brand hover:underline">
                  Visit our donation page
                </Link>{' '}
                to support their care today.
              </p>
            )}
          </section>
        </div>

        <section className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-xl font-bold text-slate-900">Recent Updates</h2>
            {updates.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No public updates yet — check back soon for news from foster care.</p>
            ) : (
              <ol className="mt-5 space-y-5">
                {updates.map((entry) => (
                  <li key={entry.id} className="relative border-l-2 border-brand/30 pl-4">
                    <time className="text-xs font-semibold uppercase tracking-wide text-brand">
                      {new Date(entry.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{entry.content}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>

      <section ref={sponsorRef} id="sponsor" className="scroll-mt-24 border-t border-brand/15 bg-white px-6 py-12 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Sponsor {kitten.name}</h2>
              <p className="mt-1 text-sm text-slate-600">Choose a care package or name your own amount.</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SPONSOR_TIERS.map((tier) => {
              const selected = selectedTierId === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => {
                    setSelectedTierId(tier.id);
                    setCustomAmount('');
                  }}
                  className={`rounded-2xl border p-5 text-left transition-all ${
                    selected
                      ? 'border-brand bg-brand-light/40 shadow-md ring-2 ring-brand/30'
                      : 'border-slate-200 bg-white hover:border-brand/40 hover:shadow-sm'
                  }`}
                >
                  <p className="text-sm font-bold text-brand">{tier.name}</p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900">${tier.price}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {tierDescription(tier, kitten.name)}
                  </p>
                </button>
              );
            })}

            <label className="flex flex-col rounded-2xl border border-dashed border-brand/40 bg-brand-light/20 p-5">
              <span className="text-sm font-bold text-brand">Name your own amount</span>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-2xl font-bold text-slate-500">$</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="50"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg font-semibold text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <span className="mt-2 text-xs text-slate-500">Enter any amount to sponsor {kitten.name}&apos;s care.</span>
            </label>
          </div>

          <Link
            to={`/donate?kitten=${encodeURIComponent(kitten.name)}&amount=${encodeURIComponent(sponsorAmount)}`}
            className="mt-8 block w-full rounded-xl bg-brand py-4 text-center text-sm font-bold uppercase tracking-wide text-white shadow-md transition hover:bg-brand-dark sm:max-w-md"
          >
            Sponsor {kitten.name} · ${sponsorAmount}
          </Link>

          <p className="mt-4 max-w-3xl text-xs leading-relaxed text-slate-500">
            Sponsorships help cover {kitten.name}&apos;s care. Once {kitten.name} is fully funded or finds a home,
            additional gifts support kittens just like them. Pawsitive Transformations directs all sponsorship
            funds where the cats need them most.
          </p>
        </div>
      </section>
    </div>
  );
}

export default PublicKittenProfile;
