import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import { isDonatePageLive } from '../../constants/siteFeatures';
import { fetchPublicSettings, invalidatePublicSettingsCache } from '../../services/publicApi';
import { FOOTER_EIN_DISPLAY } from '../../constants/siteCopy';
import PublicLogo from '../PublicLogo';

const navItems = [
  {
    label: 'Adopt',
    children: [
      { label: 'Available Cats', path: '/kittens' },
      { label: 'Adoption Process', path: '/adopt' },
    ],
  },
  {
    label: 'Foster',
    children: [
      { label: 'Why Foster', path: '/get-involved' },
      { label: 'Foster Application', path: '/foster' },
    ],
  },
  {
    label: 'Get Involved',
    children: [
      { label: 'Donate', path: '/donate' },
      { label: 'Events', path: '/events' },
    ],
  },
  { label: 'Education Hub', path: '/education' },
  {
    label: 'About',
    children: [
      { label: 'Our Mission', path: '/about' },
    ],
  },
  { label: 'Contact', path: '/contact' },
];

const DEFAULT_SOCIAL = {
  facebookUrl: 'https://facebook.com/PawsitiveTransformationsCA',
  instagramUrl: 'https://instagram.com/pawsitivetransformationsCA',
  xUrl: 'https://x.com/pawsitivetrans',
  tiktokUrl: 'https://tiktok.com/@PawsitiveTrans',
};

const DEFAULT_SETTINGS = {
  orgName: 'Pawsitive Transformations',
  orgEin: '',
  contactPhone: '(951) 830-1825',
  contactEmail: 'hello@pawsitivetransformations.org',
  contactAddress: '12523 Limonite, Suite 440412\nMira Loma, CA 91752',
  facebookUrl: DEFAULT_SOCIAL.facebookUrl,
  instagramUrl: DEFAULT_SOCIAL.instagramUrl,
  tiktokUrl: DEFAULT_SOCIAL.tiktokUrl,
  donatePageLive: false,
};

const FOOTER_LINK_COLUMNS = [
  {
    title: 'Adopt',
    links: [
      { label: 'Available Cats', path: '/kittens' },
      { label: 'Adoption Process', path: '/adopt' },
    ],
  },
  {
    title: 'Foster',
    links: [
      { label: 'Why Foster', path: '/get-involved' },
      { label: 'Foster Application', path: '/foster' },
      { label: 'Foster Login', path: '/portal/login' },
    ],
  },
  {
    title: 'Get Involved',
    links: [
      { label: 'Donate', path: '/donate' },
      { label: 'Events', path: '/events' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'Our Mission', path: '/about' },
      { label: 'Contact', path: '/contact' },
    ],
  },
];

function displayEin() {
  return FOOTER_EIN_DISPLAY;
}

function SocialLinks({ settings }) {
  const contactEmail = settings.contactEmail?.trim() || 'hello@pawsitivetransformations.org';
  const facebookUrl = settings.facebookUrl?.trim() || DEFAULT_SOCIAL.facebookUrl;
  const instagramUrl = settings.instagramUrl?.trim() || DEFAULT_SOCIAL.instagramUrl;
  const xUrl = settings.xUrl?.trim() || DEFAULT_SOCIAL.xUrl;
  const tiktokUrl = settings.tiktokUrl?.trim() || DEFAULT_SOCIAL.tiktokUrl;

  return (
    <div className="flex items-center gap-4">
      <a href={facebookUrl} target="_blank" rel="noreferrer" className="text-white/70 transition-colors hover:text-brand-light" aria-label="Facebook">
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
        </svg>
      </a>
      <a href={instagramUrl} target="_blank" rel="noreferrer" className="text-white/70 transition-colors hover:text-brand-light" aria-label="Instagram">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      </a>
      <a href={xUrl} target="_blank" rel="noreferrer" className="text-white/70 transition-colors hover:text-brand-light" aria-label="X">
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
      <a href={tiktokUrl} target="_blank" rel="noreferrer" className="text-white/70 transition-colors hover:text-brand-light" aria-label="TikTok">
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.85.97 1.99 1.66 3.25 1.95v3.91c-1.21-.16-2.36-.67-3.34-1.39-.77-.55-1.4-1.28-1.84-2.14v7.7c0 5.04-4.22 8.78-9.29 8.29-3.9-.38-7.07-3.56-7.44-7.46C-.2 10.02 3.51 5.8 8.55 5.8c.45 0 .9.03 1.35.1v3.96c-1.39-.42-2.92-.09-4.04.83-1.42 1.17-1.78 3.25-.86 4.82.93 1.59 3.01 2.21 4.67 1.41.97-.47 1.58-1.47 1.58-2.55V.02h.27z" />
        </svg>
      </a>
      <a href={`mailto:${contactEmail}`} className="text-white/70 transition-colors hover:text-brand-light" aria-label="Email">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      </a>
    </div>
  );
}

function pathIsActive(pathname, path) {
  if (path === '/') return pathname === '/';
  return pathname === path || pathname.startsWith(`${path}/`);
}

function itemIsActive(pathname, item) {
  if (item.path) return pathIsActive(pathname, item.path);
  return item.children?.some((child) => pathIsActive(pathname, child.path));
}

function NavDropdown({ item, pathname, onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = itemIsActive(pathname, item);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${
          active ? 'text-brand font-bold' : 'text-slate-800 hover:text-brand'
        }`}
        aria-expanded={open}
      >
        {item.label}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[220px] overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
          {item.children.map((child) => (
            <Link
              key={child.path}
              to={child.path}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className={`block px-4 py-2.5 text-sm transition-colors ${
                pathIsActive(pathname, child.path)
                  ? 'bg-brand/10 font-semibold text-brand'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-brand'
              }`}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileNavSection({ item, pathname, onNavigate }) {
  const [open, setOpen] = useState(itemIsActive(pathname, item));

  if (item.path) {
    return (
      <Link
        to={item.path}
        onClick={onNavigate}
        className={`rounded-md px-3 py-2.5 text-sm font-medium ${
          pathIsActive(pathname, item.path) ? 'bg-brand-light text-brand' : 'text-slate-700 hover:bg-slate-50'
        }`}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div className="rounded-md border border-slate-100">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium ${
          itemIsActive(pathname, item) ? 'text-brand' : 'text-slate-700'
        }`}
      >
        {item.label}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-slate-100 bg-slate-50/70 py-1">
          {item.children.map((child) => (
            <Link
              key={child.path}
              to={child.path}
              onClick={onNavigate}
              className={`block px-4 py-2 text-sm ${
                pathIsActive(pathname, child.path)
                  ? 'font-semibold text-brand'
                  : 'text-slate-600 hover:text-brand'
              }`}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/donate') {
      invalidatePublicSettingsCache();
    }
    fetchPublicSettings()
      .then((data) => setSettings({ ...DEFAULT_SETTINGS, ...data }))
      .catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  const donationsLive = isDonatePageLive(settings);

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-700">
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
          <PublicLogo />

          <nav className="hidden items-center gap-7 lg:flex">
            {navItems.map((item) => (
              item.path ? (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`text-sm font-medium transition-colors ${
                    pathIsActive(location.pathname, item.path)
                      ? 'text-brand font-bold'
                      : 'text-slate-800 hover:text-brand'
                  }`}
                >
                  {item.label}
                </Link>
              ) : (
                <NavDropdown key={item.label} item={item} pathname={location.pathname} />
              )
            ))}
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
            {donationsLive ? (
              <Link
                to="/donate"
                className="hidden rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-md sm:inline-block"
              >
                Donate
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="rounded-md p-2 text-slate-800 hover:bg-slate-50 lg:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link
              to="/portal/login"
              className="hidden rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-brand hover:text-brand md:inline-block"
            >
              Foster Login
            </Link>
            <Link
              to="/login"
              className="hidden rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-brand hover:text-brand md:inline-block"
            >
              Staff Login
            </Link>
          </div>
        </div>

        {mobileOpen && (
          <nav className="border-t border-slate-100 bg-white px-6 py-4 lg:hidden">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <MobileNavSection
                  key={item.label}
                  item={item}
                  pathname={location.pathname}
                  onNavigate={closeMobileMenu}
                />
              ))}
              {donationsLive ? (
                <Link
                  to="/donate"
                  onClick={closeMobileMenu}
                  className="mt-2 rounded-full bg-brand px-3 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Donate
                </Link>
              ) : null}
              <Link
                to="/portal/login"
                onClick={closeMobileMenu}
                className="rounded-full border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold text-slate-700"
              >
                Foster Login
              </Link>
              <Link
                to="/login"
                onClick={closeMobileMenu}
                className="rounded-full border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold text-slate-700"
              >
                Staff Login
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet context={{ settings }} />
      </main>

      <footer className="border-t border-brand-dark/20 bg-brand-dark text-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="mb-10 flex flex-col items-start justify-between gap-6 border-b border-white/15 pb-10 sm:flex-row sm:items-center">
            <div>
              <p className="text-lg font-semibold text-white">Pawsitive Transformations</p>
              <p className="mt-1 text-sm text-brand-light/90">Cat Rescue &amp; Human Wellness</p>
            </div>
            <SocialLinks settings={settings} />
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {FOOTER_LINK_COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-light">{column.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.path}>
                      <Link
                        to={link.path}
                        className="text-sm text-white/75 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 bg-brand px-6 py-4 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-2 text-center text-xs text-white/80">
            <p>
              &copy; 2026 Pawsitive Transformations. All rights reserved. Pawsitive Transformations is a 501(c)(3) non-profit organization. EIN {displayEin()}.
            </p>
            <p>
              This site uses AI-assisted tools to support our operations.{' '}
              <Link to="/privacy" className="text-brand-light underline-offset-2 transition-colors hover:text-white hover:underline">
                Learn more in our Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 bg-brand-dark px-6 py-3 lg:px-8">
          <p className="mx-auto max-w-7xl text-right text-[11px] text-brand-light/90">
            <span className="transition-colors hover:text-white">Engineered by Wolke Consultancy LLC</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default PublicLayout;
