import {
  ChartLineIcon,
  ClipboardTextIcon,
  FlagIcon,
  IdentificationCardIcon,
  ArticleIcon,
  SquaresFourIcon,
  StarIcon,
  TrayIcon,
  UsersIcon,
} from '@phosphor-icons/react';
import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useApi } from '../../lib/hooks.js';

const NAV = [
  { to: '/admin', label: 'Overview', icon: ChartLineIcon, end: true },
  { to: '/admin/users', label: 'Users', icon: UsersIcon },
  { to: '/admin/verifications', label: 'Verifications', icon: IdentificationCardIcon, badge: 'pendingVerifications' },
  { to: '/admin/reports', label: 'Reports', icon: FlagIcon, badge: 'openReports' },
  { to: '/admin/requests', label: 'Requests', icon: ClipboardTextIcon },
  { to: '/admin/reviews', label: 'Reviews', icon: StarIcon },
  { to: '/admin/categories', label: 'Categories', icon: SquaresFourIcon },
  { to: '/admin/tips', label: 'Tips (content)', icon: ArticleIcon },
  { to: '/admin/inbox', label: 'Support inbox', icon: TrayIcon, badge: 'openInbox' },
];

export default function AdminLayout() {
  const location = useLocation();
  const { data, reload } = useApi('/admin/stats');
  const totals = data?.totals || {};

  useEffect(() => {
    reload();
  }, [location.pathname, reload]);

  const badge = (key) =>
    key && totals[key] > 0 ? (
      <span className="ml-auto rounded-full bg-accent px-2 text-xs font-bold leading-5 text-on-accent">
        {totals[key]}
        <span className="sr-only"> waiting</span>
      </span>
    ) : null;

  return (
    <div className="container-page py-6 sm:py-8">
      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
        <nav aria-label="Admin" className="lg:sticky lg:top-28 lg:self-start">
          <p className="mb-3 hidden px-3 text-xs font-bold uppercase tracking-[0.14em] text-muted lg:block">Admin panel</p>
          <ul className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {NAV.map((n) => (
              <li key={n.to} className="shrink-0">
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center gap-2.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors lg:rounded-2xl lg:px-3 ${
                      isActive ? 'bg-ink text-bg' : 'border border-line bg-surface text-ink-2 hover:text-ink lg:border-0 lg:bg-transparent lg:hover:bg-surface-3'
                    }`
                  }
                >
                  <n.icon size={18} aria-hidden="true" />
                  {n.label}
                  {badge(n.badge)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0">
          <Outlet context={{ totals, reloadStats: reload }} />
        </div>
      </div>
    </div>
  );
}
