import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, PawPrint, ShoppingBag, Sparkles } from 'lucide-react';
import { isDonatePageLive } from '../../constants/siteFeatures';
import {
  DEFAULT_GIVEBUTTER_SPONSOR_EMBED,
  DEFAULT_GIVEBUTTER_SPONSOR_URL,
} from '../../constants/givebutterDefaults';
import { sponsorshipOverflowDisclosure } from '../../constants/donationCopy';
import { WISHLIST_OWNER_TYPES, WISHLIST_RETAILER_META } from '../../constants/wishlists';
import GivebutterDonationWidget from '../../components/GivebutterDonationWidget';
import { fetchPublicKittenById, fetchPublicKittenUpdates, fetchPublicSettings, fetchPublicWishlists } from '../../services/publicApi';
import { markCheckoutSuccessParam } from '../../hooks/useGivebutterCheckout';
import KittenPhoto from '../../components/KittenPhoto';
import { formatKittenAgeDetailed } from '../../utils/kittenAge';

function extractImagesFromContent(content = '') {
  const dataImages = content.match(/data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+/g) || [];
  const urlImages = content.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"'<>]*)?/gi) || [];
  return [...new Set([...dataImages, ...urlImages])];
}

function stripImagesFromContent(content = '') {
  return content
    .replace(/data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+/g, '')
    .replace(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"'<>]*)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatUpdateDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function PublicKittenProfile() {
  const { id } = useParams();
  const sponsorRef = useRef(null);
  const wishlistRef = useRef(null);
  const [kitten, setKitten] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [wishlists, setWishlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sponsorshipComplete, setSponsorshipComplete] = useState(false);
  const [donatePageLive, setDonatePageLive] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchPublicKittenById(id),
      fetchPublicKittenUpdates(id),
      fetchPublicWishlists(WISHLIST_OWNER_TYPES.KITTEN, id),
      fetchPublicSettings(),
    ])
      .then(([kittenData, updateData, wishlistData, settingsData]) => {
        setKitten(kittenData);
        setUpdates(updateData);
        setWishlists(Array.isArray(wishlistData) ? wishlistData : []);
        setDonatePageLive(Boolean(settingsData?.donatePageLive));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSponsorshipSuccess = useCallback(() => {
    setSponsorshipComplete(true);
    markCheckoutSuccessParam('sponsor');
  }, []);

  function scrollToRef(ref) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-gradient-to-b from-brand-light/40 to-white text-slate-500">
        Loading profile...
      </div>
    );
  }

  if (error) return <div className="px-6 py-12 text-red-600">{error}</div>;

  const bondedLabel = kitten.bondedWithKitten?.name || kitten.bondedWithName;
  const detailLine = [
    kitten.sex || 'Unknown sex',
    formatKittenAgeDetailed(kitten.dateOfBirth) || 'Age unknown',
    kitten.breed || 'Mixed',
  ].join(' · ');

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-light/25 via-white to-slate-50">
      <div className="relative h-56 w-full overflow-hidden bg-slate-200 sm:h-72 md:h-80 lg:h-96">
        <KittenPhoto kitten={kitten} allowFallback className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg ring-2 ring-brand/20 sm:h-32 sm:w-32">
              <KittenPhoto kitten={kitten} allowFallback className="h-full w-full object-cover" />
            </div>
            <div className="pb-1">
              <Link to="/kittens" className="text-xs font-semibold text-brand hover:underline">
                ← Back to Adopt
              </Link>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {kitten.name}
              </h1>
              <p className="mt-1 text-sm font-semibold text-brand">{kitten.status}</p>
              <p className="mt-1 text-sm text-slate-600">{detailLine}</p>
              {kitten.isBondedPair && bondedLabel ? (
                <p className="mt-1 text-xs font-medium text-slate-500">Bonded with {bondedLabel}</p>
              ) : null}
              {kitten.isMedicalSpecialNeeds ? (
                <p className="mt-1 text-xs font-semibold text-amber-700">Medical / Special Needs</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pb-1 sm:justify-end">
            <Link
              to={`/adopt/apply?kitten=${encodeURIComponent(kitten.name)}`}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark"
            >
              Adopt Me
            </Link>
            <a
              href={DEFAULT_GIVEBUTTER_SPONSOR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded-xl border-2 border-brand bg-white px-4 py-2.5 text-sm font-bold text-brand transition hover:bg-brand-light ${!isDonatePageLive({ donatePageLive }) ? 'hidden' : ''}`}
            >
              Sponsor Me
            </a>
            <button
              type="button"
              onClick={() => scrollToRef(wishlistRef)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <ShoppingBag className="h-4 w-4" />
              Wishlist
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:gap-8 lg:px-8">
        <div className="space-y-6 lg:col-span-2">
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-brand-light/60 to-white px-5 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <PawPrint className="h-5 w-5 text-brand" />
                About Me
              </h2>
            </div>
            <div className="px-5 py-5">
              <p className="text-base leading-relaxed text-slate-700">
                {kitten.rescueStory
                  || `${kitten.name} is full of personality and ready to meet their person. Every rescue has a story, and ${kitten.name}'s is still being written with love in foster care.`}
              </p>
            </div>
          </section>

          <section
            ref={wishlistRef}
            id="wishlist"
            className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">Wishlist</h2>
            </div>
            <div className="px-5 py-5">
              {wishlists.length > 0 ? (
                <>
                  <p className="text-sm text-slate-600">
                    Send supplies directly to support {kitten.name}&apos;s care through these store wishlists.
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {wishlists.map((item) => {
                      const meta = WISHLIST_RETAILER_META[item.retailer] || {};
                      return (
                        <a
                          key={item.id}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex flex-col rounded-xl border p-4 text-center transition-colors ${meta.buttonClass || 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'}`}
                        >
                          <span className="text-sm font-bold">{item.label || meta.label || item.retailer}</span>
                          <span className="mt-1 text-xs opacity-80">{meta.description || 'Shop wishlist supplies'}</span>
                        </a>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-600">
                  Wishlist links for {kitten.name} are coming soon.{' '}
                  <Link to="/donate" className="font-semibold text-brand hover:underline">
                    Visit our donation page
                  </Link>{' '}
                  to support their care today.
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:sticky lg:top-24">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">Recent Updates</h2>
              <p className="mt-0.5 text-xs text-slate-500">News from foster care</p>
            </div>
            <div className="max-h-[32rem] overflow-y-auto px-4 py-4">
              {updates.length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-slate-500">
                  No public updates yet. Check back soon!
                </p>
              ) : (
                <ol className="space-y-4">
                  {updates.map((entry) => {
                    const images = extractImagesFromContent(entry.content);
                    const text = stripImagesFromContent(entry.content);
                    return (
                      <li
                        key={entry.id}
                        className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm">
                            <KittenPhoto kitten={kitten} allowFallback className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900">{kitten.name}</p>
                            <time className="text-xs font-medium text-slate-500">
                              {formatUpdateDate(entry.createdAt)}
                            </time>
                            {text && (
                              <p className="mt-2 text-sm leading-relaxed text-slate-700">{text}</p>
                            )}
                            {images.length > 0 && (
                              <div className={`mt-3 grid gap-2 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {images.map((src) => (
                                  <img
                                    key={src.slice(0, 48)}
                                    src={src}
                                    alt=""
                                    className="w-full rounded-lg border border-slate-200 object-cover"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        </aside>
      </div>

      {isDonatePageLive({ donatePageLive }) && (
      <section
        ref={sponsorRef}
        id="sponsor"
        className="scroll-mt-24 border-t border-brand/15 bg-gradient-to-b from-white to-brand-light/20 px-4 py-12 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Sponsor {kitten.name}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                Sponsor {kitten.name} through Givebutter to help cover food, vaccines, surgery, and the daily care that gets them to adoption day.
              </p>
            </div>
          </div>

          {!sponsorshipComplete ? (
            <>
              <div className="mt-8 overflow-hidden rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <GivebutterDonationWidget
                  code={DEFAULT_GIVEBUTTER_SPONSOR_EMBED}
                  kittenId={kitten.id}
                  kittenName={kitten.name}
                  sponsor
                  onSuccess={handleSponsorshipSuccess}
                  className="min-h-[420px] w-full"
                />
              </div>
              <p className="mt-4 max-w-3xl text-xs leading-relaxed text-slate-500">
                {sponsorshipOverflowDisclosure(kitten.name)}
              </p>
            </>
          ) : null}
        </div>
      </section>
      )}
    </div>
  );
}

export default PublicKittenProfile;
