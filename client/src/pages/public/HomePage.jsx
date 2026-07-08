import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Home, Users, Cat } from 'lucide-react';
import { fetchPublicKittens } from '../../services/publicApi';
import { getKittenImageUrl } from '../../utils/kittenImages';

function PawIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className={className}>
      <circle cx="25" cy="30" r="9" />
      <circle cx="43" cy="18" r="10" />
      <circle cx="63" cy="18" r="10" />
      <circle cx="81" cy="32" r="9" />
      <path d="M 52,43 C 33,43 21,57 21,72 C 21,87 34,96 52,96 C 70,96 83,87 83,72 C 83,57 71,43 52,43 Z" />
    </svg>
  );
}

const pillars = [
  {
    icon: Cat,
    title: 'RESCUE',
    text: 'We pull at-risk cats and kittens from euthanasia lists, the streets, and communities across Southern California that have nowhere else to turn.',
  },
  {
    icon: Heart,
    title: 'REHABILITATE',
    text: 'We provide medical treatment, nutrition, and safe foster care so each cat can heal physically and emotionally.',
  },
  {
    icon: Home,
    title: 'RESTORE',
    text: 'We rebuild trust and wellness through patient care, socialization, and support for the people who love them.',
  },
  {
    icon: Users,
    title: 'REACH',
    text: 'We extend education, adoption pathways, foster support, and community resources so more cats and neighbors can thrive.',
  },
];

const howItWorks = [
  {
    title: 'We pull.',
    text: 'When a cat lands on a euthanasia list, is found injured on the street, or comes from a community with no resources, we act fast. We pull them into safety and into our foster network.',
  },
  {
    title: 'We heal.',
    text: 'Every cat receives the medical care, nutrition, and daily support they need to recover—whether that means bottle feeding, treating illness, or giving a shy soul time to trust again.',
  },
  {
    title: 'We place.',
    text: 'Once a cat is ready, we match them with adopters and forever homes, so every rescue becomes a lifeline that continues far beyond our doors.',
  },
];

const rescueNeeds = [
  'Kitten Formula & Bottles',
  'Canned Cat Food (Kittens & Adults)',
  'Litter (Unscented)',
  'Fleece Blankets & Towels',
];

function HomePage() {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    fetchPublicKittens().then((data) => setFeatured(data.slice(0, 4))).catch(() => { });
  }, []);

  const displayCats = featured.length >= 4
    ? featured.slice(0, 4).map((c) => ({ image: getKittenImageUrl(c, { allowFallback: true }) }))
    : [
      { image: '/images/21.png' },
      { image: '/images/22.png' },
      { image: '/images/18.png' },
      { image: '/images/17.png' },
    ];

  return (
    <div className="overflow-hidden bg-white">
      <section className="relative flex items-center overflow-hidden bg-white py-16 lg:min-h-[640px] lg:py-24">
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="relative z-10 lg:pr-8">
              <div className="mb-8">
                <h1 className="font-serif-brand text-[56px] font-normal lowercase leading-none tracking-tight text-slate-800">
                  pawsitive
                </h1>
                <div className="my-2.5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-brand">
                  <span className="h-[1.5px] w-6 bg-brand" />
                  TRANSFORMATIONS
                  <span className="h-[1.5px] w-6 bg-brand" />
                </div>
                <p className="text-sm font-semibold uppercase tracking-[0.05em] text-slate-600">
                  Cat Rescue & Human Wellness
                </p>
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Every rescue becomes a lifeline.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                We rescue at-risk cats and kittens across Southern California, from euthanasia lists, from the streets, and from communities that have nowhere else to turn, then get them healthy in foster homes and match them with people ready to love them.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to="/kittens"
                  className="inline-flex items-center justify-center rounded-lg bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-brand-dark hover:shadow-lg"
                >
                  Meet the Cats
                </Link>
                <Link
                  to="/get-involved"
                  className="inline-flex items-center justify-center rounded-lg bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-brand-dark hover:shadow-lg"
                >
                  Become a Foster
                </Link>
                <Link
                  to="/donate"
                  className="inline-flex items-center justify-center rounded-lg bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-brand-dark hover:shadow-lg"
                >
                  Support the Mission
                </Link>
              </div>
            </div>

            <div className="relative flex items-center justify-center lg:hidden">
              <div className="relative max-w-sm sm:max-w-md">
                <img
                  src="/images/hero-cat.png"
                  alt="Pawsitive Transformations Cat"
                  className="h-auto w-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 right-0 top-12 z-0 hidden w-[50%] lg:top-20 lg:block">
          <img
            src="/images/hero-cat.png"
            alt="Pawsitive Transformations Cat"
            className="h-full w-full object-contain object-right lg:object-right-bottom"
          />
        </div>
      </section>

      <section className="border-y border-slate-100 bg-brand-muted/30 py-14">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 className="text-center text-sm font-bold uppercase tracking-[0.25em] text-brand">How It Works</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {howItWorks.map(({ title, text }) => (
              <div key={title} className="rounded-2xl border border-brand/15 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-extrabold text-brand">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-100 bg-white py-14">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-brand bg-white text-brand shadow-sm">
                  <Icon className="h-6.5 w-6.5 stroke-[2]" />
                </div>
                <h3 className="mt-5 text-sm font-bold uppercase tracking-[0.25em] text-brand">
                  {title}
                </h3>
                <p className="mt-3 max-w-[220px] text-xs font-semibold leading-relaxed text-slate-500">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-3 lg:gap-8">
            <div className="flex flex-col justify-between pr-0 lg:border-r lg:border-slate-200 lg:pr-10">
              <div>
                <h2 className="flex items-center gap-2.5 text-base font-extrabold uppercase tracking-[0.15em] text-slate-800">
                  <PawIcon className="h-5 w-5 text-brand" />
                  Featured Cats
                </h2>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  {displayCats.map((cat, idx) => (
                    <div key={idx} className="aspect-[3/4] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm transition hover:shadow-md">
                      <img src={cat.image} alt="Featured Kitten" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-10 text-center lg:text-left">
                <Link
                  to="/kittens"
                  className="inline-flex rounded-lg bg-brand px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-brand-dark"
                >
                  Meet the Cats
                </Link>
              </div>
            </div>

            <div className="flex flex-col justify-between px-0 lg:border-r lg:border-slate-200 lg:px-10">
              <div>
                <h2 className="text-base font-extrabold uppercase tracking-[0.15em] text-slate-800">
                  Current Rescue Needs
                </h2>
                <ul className="mt-8 space-y-4 text-slate-600">
                  {rescueNeeds.map((need) => (
                    <li key={need} className="flex items-center gap-3">
                      <PawIcon className="h-4 w-4 shrink-0 text-brand" />
                      <span className="text-xs font-semibold leading-relaxed tracking-wide">{need}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 text-center lg:text-left">
                <Link
                  to="/donate"
                  className="inline-flex rounded-lg bg-brand px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-brand-dark"
                >
                  Support the Mission
                </Link>
              </div>
            </div>

            <div className="flex flex-col justify-between pl-0 lg:pl-10">
              <div>
                <h2 className="flex items-center gap-2 text-base font-extrabold uppercase tracking-[0.15em] text-slate-800">
                  <svg className="h-5 w-5 fill-current text-brand" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  Our Impact
                </h2>
                <div className="mt-8 space-y-8">
                  <div>
                    <p className="text-5xl font-extrabold tracking-tight text-brand">2,450+</p>
                    <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">Cats Rescued</p>
                  </div>
                  <div>
                    <p className="text-5xl font-extrabold tracking-tight text-brand">15,000+</p>
                    <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">Lives Touched</p>
                  </div>
                </div>
              </div>
              <div className="mt-10 text-center lg:text-left">
                <Link
                  to="/about"
                  className="inline-flex rounded-lg bg-brand px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-brand-dark"
                >
                  Our Story
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex w-full leading-[0]">
        <img
          src="/images/below-sec.png"
          alt="Below Section"
          className="h-auto w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0">
          <div className="relative mx-auto h-full w-full max-w-7xl px-6 lg:px-8">
            <img
              src="/images/kittens/cute.png"
              alt="Happy resting cat"
              className="pointer-events-auto absolute bottom-0 right-6 h-32 object-contain object-bottom md:h-48 lg:right-8 lg:h-[22rem] xl:h-[26rem]"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
