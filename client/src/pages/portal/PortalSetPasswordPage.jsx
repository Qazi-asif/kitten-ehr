import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import PublicLogo from '../../components/PublicLogo';
import { portalSetPasswordRequest } from '../../services/portalAuthApi';

function PortalSetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await portalSetPasswordRequest(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to set password');
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
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-slate-900">Set Your Password</h1>
            <p className="mt-2 text-sm text-slate-500">Choose a password for your foster portal account</p>
          </div>

          {!token ? (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              This link is missing its token. Please use the link from your invitation email.
            </div>
          ) : success ? (
            <div className="space-y-4 text-center">
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Password set successfully.
              </div>
              <Link
                to="/portal/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/portal/login', { replace: true });
                }}
              >
                Continue to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">New Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Confirm Password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
              <p className="text-xs text-slate-500">
                Must be at least 8 characters and include uppercase, lowercase, a number, and a special character.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                <KeyRound className="h-4 w-4" />
                {submitting ? 'Setting Password...' : 'Set Password'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default PortalSetPasswordPage;
