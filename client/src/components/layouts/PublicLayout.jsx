import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Mail, Menu, X } from 'lucide-react';
import { fetchPublicSettings } from '../../services/publicApi';
import PublicLogo from '../PublicLogo';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Adopt', path: '/kittens' },
  { label: 'Foster', path: '/foster' },
  { label: 'Get Involved', path: '/get-involved' },
  { label: 'Education', path: '/education' },
  { label: 'Donate', path: '/donate' },
  { label: 'Contact', path: '/contact' },
];

const DEFAULT_SETTINGS = {
  orgName: 'Pawsitive Transformations',
  facebookUrl: '',
  instagramUrl: '',
};

function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const location = useLocation();

  useEffect(() => {
    fetchPublicSettings()
      .then(setSettings)
      .catch(() => {});
  }, []);

  function isActive(path) {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-700">
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
          <PublicLogo />

          <nav className="hidden items-center gap-6 xl:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.path) ? 'text-brand font-bold' : 'text-slate-800 hover:text-brand'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              to="/donate"
              className="hidden rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-md sm:inline-block"
            >
              Donate
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="rounded-md p-2 text-slate-800 hover:bg-slate-50 xl:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link
              to="/login"
              className="hidden rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-brand hover:text-brand sm:inline-block"
            >
              Staff Login
            </Link>
          </div>
        </div>

        {mobileOpen && (
          <nav className="border-t border-slate-100 bg-white px-6 py-4 xl:hidden">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-md px-3 py-2.5 text-sm font-medium ${
                    isActive(link.path) ? 'bg-brand-light text-brand' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/donate"
                onClick={() => setMobileOpen(false)}
                className="mt-2 rounded-full bg-brand px-3 py-2.5 text-center text-sm font-semibold text-white"
              >
                Donate
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
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

      <footer className="bg-brand text-white border-t border-brand-dark/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row lg:px-8">
          <div className="flex items-center gap-4">
            <p className="text-sm font-semibold text-white/95">{settings.orgName || 'Pawsitive Transformations'}</p>
            <span className="hidden sm:inline-block h-4 w-px bg-white/20"></span>
            <p className="text-sm font-semibold text-white/95">EIN: 46-4005576</p>
          </div>
          <div className="flex items-center gap-5">
            {settings.facebookUrl ? (
              <a href={settings.facebookUrl} target="_blank" rel="noreferrer" className="text-white/90 hover:text-white transition-colors" aria-label="Facebook">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
            ) : null}
            {settings.instagramUrl ? (
              <a href={settings.instagramUrl} target="_blank" rel="noreferrer" className="text-white/90 hover:text-white transition-colors" aria-label="Instagram">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
            ) : null}
            <a href="https://tiktok.com" target="_blank" rel="noreferrer" className="text-white/90 hover:text-white transition-colors" aria-label="TikTok">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.85.97 1.99 1.66 3.25 1.95v3.91c-1.21-.16-2.36-.67-3.34-1.39-.77-.55-1.4-1.28-1.84-2.14v7.7c0 5.04-4.22 8.78-9.29 8.29-3.9-.38-7.07-3.56-7.44-7.46C-.2 10.02 3.51 5.8 8.55 5.8c.45 0 .9.03 1.35.1v3.96c-1.39-.42-2.92-.09-4.04.83-1.42 1.17-1.78 3.25-.86 4.82.93 1.59 3.01 2.21 4.67 1.41.97-.47 1.58-1.47 1.58-2.55V.02h.27z" />
              </svg>
            </a>
            <a href="mailto:hello@pawsitivetransformations.org" className="text-white/90 hover:text-white transition-colors" aria-label="Email">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PublicLayout;
