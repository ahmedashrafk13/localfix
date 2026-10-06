import {
  BellIcon,
  CalendarBlankIcon,
  ChartLineIcon,
  GearIcon,
  MoonIcon,
  SignOutIcon,
  SquaresFourIcon,
  SunIcon,
  UserCircleIcon,
} from '@phosphor-icons/react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { dashboardPath, useAuth } from '../../context/AuthContext.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { timeAgo } from '../../lib/format.js';
import { useDismiss } from '../../lib/hooks.js';
import { Avatar } from '../ui/Avatar.jsx';
import { IconButton } from '../ui/Button.jsx';

function Popover({ open, children, className = '' }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <m.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className={`absolute right-0 top-full z-40 mt-2 origin-top-right rounded-2xl border border-line bg-surface shadow-lift ${className}`}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  );
}

export function NotificationBell() {
  const { unreadNotifications, latest, markAllNotificationsRead, markNotificationRead } = useRealtime();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  useDismiss(ref, open, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <IconButton
        icon={BellIcon}
        label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : 'Notifications'}
        badge={unreadNotifications}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
      />
      <Popover open={open} className="w-[min(22rem,calc(100vw-1.5rem))]">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="font-bold text-ink">Notifications</p>
          {unreadNotifications > 0 && (
            <button type="button" onClick={markAllNotificationsRead} className="rounded-md text-sm font-semibold text-accent-text hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <ul className="max-h-[22rem] overflow-y-auto p-1.5">
          {latest.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">You are all caught up.</li>}
          {latest.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => {
                  if (!n.read) markNotificationRead(n.id);
                  setOpen(false);
                  if (n.link) navigate(n.link);
                }}
                className="flex w-full gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-3"
              >
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-accent'}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${n.read ? 'text-ink-2' : 'font-semibold text-ink'}`}>
                    {n.title}
                    {!n.read && <span className="sr-only"> (unread)</span>}
                  </span>
                  {n.body && <span className="line-clamp-2 block text-[0.82rem] text-muted">{n.body}</span>}
                  <span className="mt-0.5 block text-xs text-muted">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-line p-1.5">
          <Link to="/notifications" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-center text-sm font-semibold text-ink-2 hover:bg-surface-3">
            See all notifications
          </Link>
        </div>
      </Popover>
    </div>
  );
}

export function ThemeToggle({ className = '' }) {
  const { resolved, toggle } = useTheme();
  return <IconButton icon={resolved === 'dark' ? SunIcon : MoonIcon} label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggle} className={className} />;
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDismiss(ref, open, () => setOpen(false));
  if (!user) return null;

  const items = [{ to: dashboardPath(user), label: 'Dashboard', icon: user.role === 'admin' ? ChartLineIcon : SquaresFourIcon }];
  if (user.role === 'provider') {
    items.push({ to: `/providers/${user.id}`, label: 'My public profile', icon: UserCircleIcon });
    items.push({ to: '/provider/availability', label: 'Availability', icon: CalendarBlankIcon });
  }
  items.push({ to: '/settings', label: 'Account settings', icon: GearIcon });

  const onLogout = async () => {
    setOpen(false);
    await logout();
    toast.success('You have been logged out.');
    navigate('/');
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Account menu"
        className="inline-flex size-11 items-center justify-center rounded-full transition-transform active:scale-95"
      >
        <Avatar src={user.avatar} name={user.name} size="sm" />
      </button>
      <Popover open={open} className="w-64 p-1.5">
        <div className="px-3 pb-2 pt-2.5">
          <p className="truncate font-semibold text-ink">{user.name}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
        <ul className="border-t border-line pt-1.5">
          {items.map((item) => (
            <li key={item.to}>
              <Link to={item.to} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-2 hover:bg-surface-3 hover:text-ink">
                <item.icon size={18} aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-danger hover:bg-danger-soft">
              <SignOutIcon size={18} aria-hidden="true" />
              Log out
            </button>
          </li>
        </ul>
      </Popover>
    </div>
  );
}
