import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Lock, PawPrint } from 'lucide-react';
import PublicLogo from '../components/PublicLogo';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const legacyAdminPaths = new Set([
    '/admin/content',
    '/admin/social',
    '/admin/sponsorships',
    '/admin/reports',
  ]);
  const requestedFrom = location.state?.from;
  const redirectTo =
    requestedFrom?.startsWith('/admin') && !legacyAdminPaths.has(requestedFrom)
      ? requestedFrom
      : '/admin';

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-muted">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <PublicLogo />
          <Link to="/" className="text-sm font-medium text-slate-600 hover:text-brand">
            ← Back to website
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-xl border border-slate-100 bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand">
              <PawPrint className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-slate-900">Staff Login</h1>
            <p className="mt-2 text-sm text-slate-500">Sign in to the Pawsitive EHR admin portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="you@pawsitivetransformations.org"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              <Lock className="h-4 w-4" />
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Default admin: admin@pawsitivetransformations.org / Admin123!
          </p>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;
