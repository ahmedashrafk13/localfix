import { Navigate, Outlet, useLocation } from 'react-router';
import { dashboardPath, useAuth } from '../../context/AuthContext.jsx';
import { PageFallback } from './Layout.jsx';

/** Only signed-in users (optionally of certain roles) may see the nested routes. */
export function RequireAuth({ roles }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <PageFallback />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={dashboardPath(user)} replace />;
  return <Outlet />;
}

/** Login/register pages bounce signed-in users to their dashboard. */
export function GuestOnly() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <PageFallback />;
  if (user) {
    const next = new URLSearchParams(location.search).get('next');
    return <Navigate to={next && next.startsWith('/') && !next.startsWith('//') ? next : dashboardPath(user)} replace />;
  }
  return <Outlet />;
}

export function DashboardRedirect() {
  const { user, ready } = useAuth();
  if (!ready) return <PageFallback />;
  return <Navigate to={dashboardPath(user)} replace />;
}
