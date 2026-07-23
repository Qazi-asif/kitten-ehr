import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Lock, PawPrint } from 'lucide-react';
import PublicLogo from '../../components/PublicLogo';
import {
  getPortalAuthToken,
  getStoredPortalUser,
  portalLoginRequest,
  setPortalAuthSession,
} from '../../services/portalAuthApi';

// Mirrors the staff LoginPage.jsx pattern/tone deliberately, but is fully
// self-contained - it does not use AuthContext or authApi.js. See the
// comment at the top of portalAuthApi.js for why portal sessions are kept
// isolated from the staff auth layer.
function PortalLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (getPortalAuthToken() && getStoredPortalUser()) {
    return <Navigate to="/portal" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const data = await portalLoginRequest(email, password);

      if (data.user?.role && data.user.role.isPortalRole === false) {
        setError('This login is for foster portal accounts. Staff should use the staff login.');
        return;
      }

      setPortalAuthSession({ token: data.token, user: data.user, remember: rememberMe });
      navigate('/portal', { replace: true });
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
            <h1 className="mt-4 text-2xl font-bold text-slate-900">Foster Portal Login</h1>
            <p className="mt-2 text-sm text-slate-500">Sign in to your foster account</p>
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
                autoComplete="username"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="you@example.com"
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
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-brand focus:ring-brand/30"
              />
              Keep me logged in on this device
            </label>
            <p className="text-xs text-slate-500">
              Your session is shared across tabs in this browser. Sign in again if you switch to a different browser.
            </p>
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
            Need access? Contact your foster coordinator.
          </p>
        </div>
      </main>
    </div>
  );
}

export default PortalLoginPage;
