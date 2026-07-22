import { Link, useNavigate } from 'react-router-dom';
import PublicLogo from '../PublicLogo';
import { clearPortalAuthSession, getStoredPortalUser } from '../../services/portalAuthApi';

// Small shared header for the three portal-guarded pages (home, placements,
// documents) - factored out rather than duplicated three times. Not part of
// the original file list in the approved plan, called out separately in the
// build report for that reason.
function PortalNav() {
  const navigate = useNavigate();
  const user = getStoredPortalUser();

  function handleLogout() {
    clearPortalAuthSession();
    navigate('/portal/login', { replace: true });
  }

  return (
    <header className="border-b border-slate-200 bg-white px-6 py-4">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
        <PublicLogo />
        <nav className="flex flex-wrap items-center gap-5 text-sm font-medium text-slate-600">
          <Link to="/portal" className="hover:text-brand">Home</Link>
          <Link to="/portal/placements" className="hover:text-brand">My Placements</Link>
          <Link to="/portal/documents" className="hover:text-brand">Documents</Link>
          <Link to="/portal/profile" className="hover:text-brand">My Profile</Link>
          {user?.firstName && <span className="text-slate-400">Hi, {user.firstName}</span>}
          <button type="button" onClick={handleLogout} className="hover:text-brand">
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}

export default PortalNav;
