import { Link } from 'react-router-dom';

const opportunities = [
  {
    title: 'Foster Opportunities',
    text: 'Open your heart and home to a cat in need.',
    link: '/foster',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-14 w-14 text-brand">
        <path d="M32 52 C32 52 10 40 10 24 C10 16 16 10 24 10 C28 10 31 12.5 32 16 C33 12.5 36 10 40 10 C48 10 54 16 54 24 C54 40 32 52 32 52Z" />
        <path d="M24 30 h16 M32 22 v16" strokeWidth="2" />
        <rect x="20" y="36" width="24" height="14" rx="3" strokeWidth="2.2" />
        <path d="M22 36 v-6 a10 10 0 0 1 20 0 v6" strokeWidth="2.2" />
      </svg>
    ),
  },
  {
    title: 'Volunteer Opportunities',
    text: 'Help with events, transport, social media & more.',
    link: '/contact',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-14 w-14 text-brand">
        <path d="M32 44 C32 44 10 32 10 18 C10 10 16 6 22 6 C26 6 29.5 8 32 12 C34.5 8 38 6 42 6 C48 6 54 10 54 18 C54 32 32 44 32 44Z" />
        <path d="M16 50 C16 50 24 44 32 44 C40 44 48 50 48 50" />
      </svg>
    ),
  },
  {
    title: 'Community Outreach',
    text: 'Help us educate and support our community.',
    link: '/education',
    icon: (
      <svg viewBox="0 0 64 64" fill="currentColor" className="h-14 w-14 text-brand">
        <circle cx="20" cy="22" r="8" />
        <circle cx="44" cy="22" r="8" />
        <circle cx="32" cy="18" r="9" />
        <ellipse cx="20" cy="44" rx="11" ry="8" />
        <ellipse cx="44" cy="44" rx="11" ry="8" />
        <ellipse cx="32" cy="47" rx="12" ry="9" />
      </svg>
    ),
  },
  {
    title: 'Corporate Sponsorships',
    text: 'Partner with us to create a greater impact.',
    link: '/contact',
    icon: (
      <svg viewBox="0 0 64 64" fill="currentColor" className="h-14 w-14 text-brand">
        <rect x="10" y="20" width="44" height="36" rx="2" />
        <rect x="18" y="10" width="10" height="12" rx="1" />
        <rect x="36" y="10" width="10" height="12" rx="1" />
        <rect x="16" y="30" width="6" height="8" rx="1" fill="white" />
        <rect x="29" y="30" width="6" height="8" rx="1" fill="white" />
        <rect x="42" y="30" width="6" height="8" rx="1" fill="white" />
        <rect x="16" y="44" width="6" height="8" rx="1" fill="white" />
        <rect x="29" y="44" width="6" height="8" rx="1" fill="white" />
        <rect x="42" y="44" width="6" height="8" rx="1" fill="white" />
      </svg>
    ),
  },
  {
    title: 'Wellness Partnerships',
    text: 'Support human wellness through our programs.',
    link: '/contact',
    icon: (
      <svg viewBox="0 0 64 64" fill="currentColor" className="h-14 w-14 text-brand">
        <path d="M32 8 C32 8 20 14 14 24 C11 30 12 36 16 40 C20 44 26 44 32 40 C38 44 44 44 48 40 C52 36 53 30 50 24 C44 14 32 8 32 8Z" opacity="0.3" />
        <path d="M32 10 C36 6 44 4 50 10 C56 16 54 26 48 32 C44 36 38 40 32 54 C26 40 20 36 16 32 C10 26 8 16 14 10 C20 4 28 6 32 10Z" opacity="0.5" />
        <circle cx="32" cy="24" r="7" />
        <path d="M24 38 C24 38 28 42 32 42 C36 42 40 38 40 38" strokeWidth="2" fill="none" stroke="currentColor" strokeLinecap="round" />
        <path d="M20 20 C20 20 18 14 22 12" strokeWidth="1.5" fill="none" stroke="currentColor" strokeLinecap="round" />
        <path d="M44 20 C44 20 46 14 42 12" strokeWidth="1.5" fill="none" stroke="currentColor" strokeLinecap="round" />
      </svg>
    ),
  },
];

function GetInvolvedPage() {
  return (
    <div className="bg-white">

      {/* Hero */}
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-6 lg:px-8">
        <h1 className="text-6xl font-extrabold tracking-tight text-brand flex items-center gap-3">
          Get Involved
          <svg viewBox="0 0 100 100" fill="currentColor" className="h-11 w-11 text-brand">
            <circle cx="25" cy="30" r="9" />
            <circle cx="43" cy="18" r="10" />
            <circle cx="63" cy="18" r="10" />
            <circle cx="81" cy="32" r="9" />
            <path d="M 52,43 C 33,43 21,57 21,72 C 21,87 34,96 52,96 C 70,96 83,87 83,72 C 83,57 71,43 52,43 Z" />
          </svg>
        </h1>
        <p className="mt-2 text-lg font-medium text-slate-600">There are many ways to make a difference.</p>
      </div>

      {/* 5 Cards */}
      <div className="mx-auto max-w-7xl px-6 pb-14 lg:px-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {opportunities.map(({ icon, title, text, link }) => (
            <div
              key={title}
              className="flex flex-col items-start rounded-2xl border border-brand/25 bg-white p-6"
            >
              {/* Icon */}
              <div className="mb-4">{icon}</div>

              {/* Title */}
              <h3 className="text-base font-extrabold leading-snug text-brand">{title}</h3>

              {/* Description */}
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{text}</p>

              {/* Button */}
              <Link
                to={link}
                className="mt-5 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                Learn More
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom section — get-involved.png background + get-cat.png overlaid */}
      <div className="relative w-full overflow-hidden leading-[0]">
        {/* Background image */}
        <img
          src="/images/get-involved.png"
          alt="Get Involved background"
          className="w-full h-auto object-cover"
        />

        {/* Overlay: get-cat.png on the left */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="mx-auto h-full w-full max-w-7xl relative px-6 lg:px-8">
            <img
              src="/images/get-cat.png"
              alt="Cat"
              className="absolute bottom-0 left-6 lg:left-8 h-[70%] w-auto object-contain object-bottom"
            />
          </div>
        </div>
      </div>

    </div>
  );
}

export default GetInvolvedPage;
