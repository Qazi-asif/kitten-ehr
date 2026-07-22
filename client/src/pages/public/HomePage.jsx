import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Home, Users, Cat } from 'lucide-react';
import { fetchPublicKittens } from '../../services/publicApi';
import { getKittenImageUrl } from '../../utils/kittenImages';

const pillars = [
  {
    icon: Cat,
    title: 'RESCUE',
    text: 'We pull cats and kittens from euthanasia lists, streets, and communities out of options.',
  },
  {
    icon: Heart,
    title: 'REHABILITATE',
    text: 'Vetting, vaccines, spay and neuter, and foster care until they\'re healthy and ready for a home.',
  },
  {
    icon: Home,
    title: 'RESTORE',
    text: 'The bond between a cat and a person heals them both. That two-way rescue is the heart of what we do.',
  },
  {
    icon: Users,
    title: 'REACH',
    text: 'Free resources on kitten care, colonies, and keeping cats safe and healthy, out in the community.',
  },
];

const howItWorks = [
  {
    title: 'We pull.',
    text: 'From shelter euthanasia lists, from parking lots and backyards, from colonies and porches. Kittens too young to survive on their own, moms with litters, cats who just ran out of time and options. Wherever a cat is out of chances, that\'s where we start.',
  },
  {
    title: 'We heal.',
    text: 'Every cat goes into a foster home, not a cage. Vetting, vaccines, spay or neuter, microchip, and as much couch time as it takes.',
  },
  {
    title: 'We place.',
    text: 'Adopters are screened, cats are matched, and every adoption comes with a lifetime promise: if life changes, that cat always has a home with us. No time limit, no judgment.',
  },
];

function HomePage() {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    fetchPublicKittens(4)
      .then((data) => setFeatured(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const displayCats = featured.length > 0
    ? featured.slice(0, 4).map((c) => ({
      id: c.id,
      name: c.name,
      image: getKittenImageUrl(c, { allowFallback: true }),
    }))
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
                  to="/available"
                  className="inline-flex items-center justify-center rounded-lg bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-brand-dark hover:shadow-lg"
                >
                  Meet the Cats
                </Link>
                <Link
                  to="/whyfoster"
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
        <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
          <h2 className="text-2xl font-extrabold text-brand">Fostering is the whole engine.</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            You provide the spare room and the love; we cover the rest. One foster home can save a dozen lives a year.
          </p>
          <Link
            to="/whyfoster"
            className="mt-8 inline-flex rounded-lg bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-brand-dark"
          >
            Become a Foster
          </Link>
        </div>
      </section>

      <section className="border-b border-slate-100 bg-slate-50 py-12">
        <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
          <p className="text-base leading-relaxed text-slate-600">
            Pawsitive Transformations is a California nonprofit based in the Inland Empire. Every dollar, every share, every foster application takes a cat off a list or off the street, and puts it on a couch.
          </p>
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

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col items-center gap-8 text-center">
            <h2 className="text-base font-extrabold uppercase tracking-[0.15em] text-slate-800">
              Meet the Cats
            </h2>
            <div className="grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
              {displayCats.map((cat, idx) => {
                const image = (
                  <img
                    src={cat.image}
                    alt={cat.name ? `${cat.name}` : 'Featured cat'}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                );
                return (
                  <div
                    key={cat.id ?? idx}
                    className="aspect-[3/4] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm"
                  >
                    {cat.id ? (
                      <Link to={`/kittens/${cat.id}`} className="block h-full w-full" aria-label={`View ${cat.name || 'kitten'} profile`}>
                        {image}
                      </Link>
                    ) : (
                      image
                    )}
                  </div>
                );
              })}
            </div>
            <Link
              to="/available"
              className="inline-flex rounded-lg bg-brand px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-brand-dark"
            >
              Meet the Cats
            </Link>
          </div>
        </div>
      </section>

      <section className="relative flex w-full leading-[0]">
        <img
          src="/images/below-sec.png"
          alt=""
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
