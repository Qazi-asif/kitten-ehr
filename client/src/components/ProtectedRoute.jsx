import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ permission, anyPermission }) {
  const { isAuthenticated, loading, hasPermission, hasAnyPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
        <p className="mt-2 text-sm text-gray-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  if (anyPermission && !hasAnyPermission(anyPermission)) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
        <p className="mt-2 text-sm text-gray-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;
