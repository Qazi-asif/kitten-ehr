import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Calendar,
  Cat,
  ClipboardList,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Mail,
  Search,
  Settings,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin', permission: 'dashboard.view' },
  { label: 'Kittens', icon: Cat, path: '/admin/kittens', permission: 'kittens.view' },
  { label: 'Fosters', icon: Users, path: '/admin/fosters', permission: 'fosters.view' },
  { label: 'Applications', icon: ClipboardList, path: '/admin/applications', permission: 'applications.view' },
  { label: 'Calendar', icon: Calendar, path: '/admin/calendar', permission: 'events.view' },
  { label: 'Finance', icon: DollarSign, path: '/admin/finance', permission: 'donations.view' },
  { label: 'Emails', icon: Mail, path: '/admin/emails', permission: 'emails.view' },
  { label: 'Settings', icon: Settings, path: '/admin/settings' },
];

const pageMeta = [
  { match: (p) => p === '/admin', title: 'Dashboard' },
  { match: (p) => p.startsWith('/admin/kittens/'), title: 'Kitten Profile', subtitle: 'Medical records, publishing, and adoption details.' },
  { match: (p) => p === '/admin/kittens', title: 'Kittens', subtitle: 'Manage kittens and link them to litter intake groups.' },
  { match: (p) => p.startsWith('/admin/fosters'), title: 'Fosters', subtitle: 'Foster home contacts and placements.' },
  { match: (p) => p.startsWith('/admin/applications'), title: 'Applications', subtitle: 'Review adoption and foster applications.' },
  { match: (p) => p.startsWith('/admin/calendar'), title: 'Calendar', subtitle: 'Public events and staff schedule.' },
  { match: (p) => p.startsWith('/admin/finance') || p.startsWith('/admin/donations'), title: 'Finance', subtitle: 'Track income, expenses, and monthly rescue balance.' },
  { match: (p) => p.startsWith('/admin/emails'), title: 'Emails', subtitle: 'Automatic email templates, delivery settings, and send log.' },
  { match: (p) => p.startsWith('/admin/settings'), title: 'Settings', subtitle: 'Organization settings, user accounts, roles, and permissions.' },
];

function getPageMeta(pathname, user) {
  const meta = pageMeta.find((m) => m.match(pathname)) ?? { title: 'Admin', subtitle: '' };

  if (pathname === '/admin') {
    const name = user?.firstName?.trim() || 'there';
    return {
      ...meta,
      subtitle: `Good morning, ${name} — here is what needs your attention today.`,
    };
  }

  return meta;
}

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasPermission, hasAnyPermission } = useAuth();
  const { title, subtitle } = getPageMeta(location.pathname, user);

  const visibleNavItems = navItems.filter((item) => {
    if (item.path === '/admin/settings') {
      return hasAnyPermission(['users.view', 'roles.manage', 'settings.manage']);
    }
    if (item.permission) return hasPermission(item.permission);
    return true;
  });

  function isActive(path) {
    if (path === '/admin') return location.pathname === '/admin';
    if (path === '/admin/kittens') {
      return location.pathname === '/admin/kittens' || location.pathname.startsWith('/admin/kittens/');
    }
    return location.pathname.startsWith(path);
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const hideHeaderActions = location.pathname.startsWith('/admin/kittens/') && location.pathname !== '/admin/kittens';

  return (
    <div className="min-h-screen bg-[#F4F7F6]">
      <aside className="fixed left-0 top-0 z-40 flex h-full w-[260px] flex-col bg-sidebar text-white print:hidden">
        <div className="border-b border-sidebar-border px-6 py-5">
          <Link to="/admin" className="block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-brand">pawsitive</span>
            <span className="mt-0.5 block text-sm font-bold text-white">EHR Dashboard</span>
          </Link>
          <Link to="/" className="mt-2 block text-xs text-slate-400 hover:text-white">← Public site</Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {visibleNavItems.map(({ label, icon: Icon, path }) => (
              <li key={label}>
                <Link
                  to={path}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
                    isActive(path)
                      ? 'bg-brand text-white shadow-sm'
                      : 'text-slate-300 hover:bg-sidebar-hover hover:text-white'
                  }`}
                >
                  <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={2} />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border px-4 py-4">
          <div className="flex items-center gap-3 rounded-lg bg-sidebar-hover/50 px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
              {user?.firstName?.[0] || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {user ? `${user.firstName} ${user.lastName}` : 'User'}
              </p>
              <p className="truncate text-xs text-slate-400">{user?.roleName || 'Staff'}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-sidebar-hover hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-[260px] min-h-screen print:ml-0">
        <header className="border-b border-slate-200 bg-white px-8 py-5 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
              {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
            </div>
            {!hideHeaderActions && (
              <div className="flex items-center gap-2">
                <div className="hidden items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    placeholder="Search..."
                    className="ml-2 w-40 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
                <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
                  <Bell className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
            {hideHeaderActions && (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            )}
          </div>
        </header>

        <div className="p-8 print:p-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
