import { Navigate, Outlet } from 'react-router-dom';
import { getPortalAuthToken, getStoredPortalUser } from '../services/portalAuthApi';

// Deliberately separate from ProtectedRoute.jsx / AuthContext.jsx - see the
// comment at the top of portalAuthApi.js for why portal sessions can't share
// that machinery. This guard only checks locally-stored session data; there
// is no /api/auth/me-equivalent for portal accounts yet to revalidate
// against, so presence of a token + user is the whole check. Real portal API
// calls (once they exist) still go through the server's requirePortalAuth,
// which is the actual source of truth - this is just client-side routing.
function PortalProtectedRoute() {
  const token = getPortalAuthToken();
  const user = getStoredPortalUser();

  if (!token || !user) {
    return <Navigate to="/portal/login" replace />;
  }

  // Defensive UX check only, not a security boundary - if a non-portal user
  // object somehow ended up in portal storage, send them to the portal login
  // rather than showing the portal placeholder for a staff account.
  if (user.role && user.role.isPortalRole === false) {
    return <Navigate to="/portal/login" replace />;
  }

  return <Outlet />;
}

export default PortalProtectedRoute;
