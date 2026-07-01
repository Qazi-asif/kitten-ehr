import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchPublicKittenById, fetchPublicKittenPhotos, fetchPublicKittenUpdates } from '../../services/publicApi';
import { getFileUrl } from '../../services/api';
import KittenPhoto from '../../components/KittenPhoto';
import { formatKittenAge } from '../../utils/kittenImages';

const DONATE_STRIPE_URL = 'https://buy.stripe.com/test_placeholder';

const SPONSOR_TIERS = [
  { label: 'One Meal', amount: '$5' },
  { label: 'Week of Food', amount: '$25' },
  { label: 'Spay Surgery', amount: '$125' },
  { label: 'Full Care', amount: '$200' },
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

function PublicKittenProfile() {
  const { id } = useParams();
  const [kitten, setKitten] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([fetchPublicKittenById(id), fetchPublicKittenPhotos(id), fetchPublicKittenUpdates(id)])
      .then(([kittenData, photoData, updateData]) => {
        setKitten(kittenData);
        setPhotos(photoData);
        setUpdates(updateData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-slate-500">Loading...</div>;
  if (error) return <div className="px-6 py-12 text-red-600">{error}</div>;

  const age = formatKittenAge(kitten.dateOfBirth);
  const meta = [age?.replace(' old', ''), kitten.sex, kitten.breed].filter(Boolean).join(' · ');
  const activeWishlists = KITTEN_WISHLISTS.filter((store) => kitten[store.field]);

  return (
    <div className="bg-white">
      <div className="relative aspect-[4/3] max-h-[420px] w-full overflow-hidden bg-slate-100 sm:aspect-[21/9]">
        <KittenPhoto kitten={kitten} allowFallback className="h-full w-full" />
      </div>

      <div className="border-b border-brand/20 bg-gradient-to-r from-brand/10 via-brand-light to-brand/10 px-6 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand">Support {kitten.name}&apos;s care</p>
            <p className="mt-1 text-sm text-slate-700">Every share helps — sponsor or donate today.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              to="/donate"
              className="rounded-md bg-brand px-6 py-3 text-center text-sm font-bold uppercase tracking-wide text-white shadow-sm hover:bg-brand-dark"
            >
              Donate Now
            </Link>
            <a
              href={DONATE_STRIPE_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border-2 border-brand bg-white px-6 py-3 text-center text-sm font-bold uppercase tracking-wide text-brand hover:bg-brand-light"
            >
              Sponsor This Kitten
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8 lg:px-8">
        <Link to="/kittens" className="text-sm font-medium text-brand hover:underline">← Back to Adopt</Link>

        <h1 className="mt-4 text-3xl font-bold text-slate-900">{kitten.name}</h1>
        <p className="mt-1 text-brand">{meta}</p>
        {kitten.websiteFeaturedComment && (
          <p className="mt-3 text-lg font-medium text-slate-700">{kitten.websiteFeaturedComment}</p>
        )}
        <p className="mt-1 text-sm text-slate-500">Available for Adoption</p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link to={`/adopt?kitten=${kitten.name}`} className="rounded-md bg-brand py-3.5 text-center text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark">
            Adopt Me
          </Link>
          <a href={DONATE_STRIPE_URL} target="_blank" rel="noreferrer" className="rounded-md border-2 border-brand py-3.5 text-center text-sm font-bold uppercase tracking-wide text-brand hover:bg-brand-light">
            Sponsor Me
          </a>
          <Link to="/donate" className="rounded-md border border-slate-300 py-3.5 text-center text-sm font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50">
            Wishlist
          </Link>
        </div>

        {photos.length > 1 && (
          <section className="mt-10">
            <h2 className="text-lg font-bold text-slate-900">Photo Gallery</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className={`overflow-hidden rounded-xl border ${
                    photo.isPrimaryPhoto ? 'border-brand ring-2 ring-brand/30' : 'border-slate-100'
                  }`}
                >
                  <img
                    src={getFileUrl(photo.fileUrl)}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {kitten.rescueStory && (
          <section className="mt-10">
            <h2 className="text-lg font-bold text-slate-900">About Me</h2>
            <p className="mt-3 leading-relaxed text-slate-600">{kitten.rescueStory}</p>
          </section>
        )}

        {activeWishlists.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-bold text-slate-900">Sponsor This Kitten&apos;s Needs</h2>
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
          </section>
        )}

        {updates.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-bold text-slate-900">News & Updates</h2>
            <div className="mt-4 space-y-4">
              {updates.map((entry) => (
                <article key={entry.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <time className="text-xs font-semibold uppercase tracking-wide text-brand">
                    {new Date(entry.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{entry.content}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10 rounded-xl border border-slate-100 bg-brand-muted p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Care Goal</h2>
            <span className="text-sm font-semibold text-brand">$425 of $500</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
            <div className="h-full w-[85%] rounded-full bg-brand" />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-slate-900">Sponsorship Tiers</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {SPONSOR_TIERS.map((tier) => (
              <div key={tier.label} className="rounded-lg border border-brand/20 bg-brand-light p-4 text-center">
                <p className="text-xs font-semibold text-brand">{tier.label}</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{tier.amount}</p>
              </div>
            ))}
          </div>
          <a
            href={DONATE_STRIPE_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-6 block w-full rounded-md bg-brand py-3.5 text-center text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-dark"
          >
            Donate Now
          </a>
        </section>
      </div>
    </div>
  );
}

export default PublicKittenProfile;
