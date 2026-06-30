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
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3 lg:px-8">
          <PublicLogo orgName={settings.orgName} />

          <nav className="hidden items-center gap-6 xl:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.path) ? 'text-brand' : 'text-slate-600 hover:text-brand'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/donate"
              className="hidden rounded-md bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark sm:inline-block"
            >
              Donate
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-50 xl:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link
              to="/login"
              className="hidden rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand sm:inline-block"
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
                className="mt-2 rounded-md bg-brand px-3 py-2.5 text-center text-sm font-semibold text-white"
              >
                Donate
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-md border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold text-slate-700"
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

      <footer className="bg-brand text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-5 sm:flex-row lg:px-8">
          <p className="text-sm font-medium text-white/95">{settings.orgName}</p>
          <div className="flex items-center gap-6 text-sm font-semibold">
            {settings.facebookUrl ? (
              <a href={settings.facebookUrl} target="_blank" rel="noreferrer" className="text-white/90 hover:text-white">
                Facebook
              </a>
            ) : null}
            {settings.instagramUrl ? (
              <a href={settings.instagramUrl} target="_blank" rel="noreferrer" className="text-white/90 hover:text-white">
                Instagram
              </a>
            ) : null}
            <a href="mailto:hello@pawsitivetransformations.org" className="text-white/90 hover:text-white" aria-label="Email">
              <Mail className="h-5 w-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PublicLayout;
