import { ListIcon, MagnifyingGlassIcon, PlusIcon, XIcon } from '@phosphor-icons/react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';
import { ButtonLink, IconButton } from '../ui/Button.jsx';
import { Logo } from '../ui/Logo.jsx';
import { HeaderSearch } from './HeaderSearch.jsx';
import { NotificationBell, ThemeToggle, UserMenu } from './Menus.jsx';
import { topNavFor } from './navItems.js';

export function Header() {
  const { user, ready } = useAuth();
  const { unreadMessages } = useRealtime();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const reduce = useReducedMotion();
  const links = topNavFor(user);
  const canPost = !user || user.role === 'customer';

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 px-2 pt-2 sm:px-3 sm:pt-3">
      <div className="mx-auto flex h-16 max-w-[84rem] items-center gap-2 rounded-full border border-line bg-surface/90 pl-4 pr-2 shadow-soft backdrop-blur-xl supports-[not(backdrop-filter:blur(1px))]:bg-surface sm:gap-3 sm:pl-5">
        <Logo />

        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `relative inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[0.92rem] font-semibold transition-colors duration-200 ${
                  isActive ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:text-ink'
                }`
              }
            >
              {l.label}
              {l.badge === 'messages' && unreadMessages > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[0.7rem] font-bold leading-5 text-on-accent">
                  {unreadMessages}
                  <span className="sr-only"> unread</span>
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <HeaderSearch className="ml-auto hidden w-full max-w-xs md:block lg:hidden xl:block xl:max-w-sm" />

        <div className="ml-auto flex items-center gap-0.5 md:ml-0">
          <IconButton icon={MagnifyingGlassIcon} label="Search" className="md:hidden lg:inline-flex xl:hidden" onClick={() => setSearchOpen((s) => !s)} aria-expanded={searchOpen} />
          <ThemeToggle className="max-sm:hidden" />
          {ready && user && <NotificationBell />}
          {ready && user && <UserMenu />}
          {ready && !user && (
            <Link to="/login" className="hidden h-11 items-center rounded-full px-4 text-[0.92rem] font-semibold text-ink-2 hover:text-ink sm:inline-flex">
              Log in
            </Link>
          )}
          {canPost && (
            <ButtonLink to="/post-request" size="md" icon={PlusIcon} className="max-sm:hidden">
              Post a request
            </ButtonLink>
          )}
          <IconButton icon={menuOpen ? XIcon : ListIcon} label={menuOpen ? 'Close menu' : 'Open menu'} className="lg:hidden" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-controls="mobile-menu" />
        </div>
      </div>

      {searchOpen && (
        <div className="mx-auto mt-2 max-w-[84rem] rounded-3xl border border-line bg-surface p-2 shadow-soft md:max-lg:hidden xl:hidden">
          <HeaderSearch autoFocus onDone={() => setSearchOpen(false)} />
        </div>
      )}

      <AnimatePresence>
        {menuOpen && (
          <m.div
            id="mobile-menu"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-2 max-w-[84rem] overflow-hidden rounded-3xl border border-line bg-surface p-2 shadow-lift lg:hidden"
          >
            <nav aria-label="Mobile">
              <ul>
                {links.map((l, i) => (
                  <m.li key={l.to} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i, duration: 0.3 }}>
                    <NavLink
                      to={l.to}
                      end={l.end}
                      className={({ isActive }) => `flex min-h-12 items-center justify-between rounded-2xl px-4 text-base font-semibold ${isActive ? 'bg-surface-3 text-ink' : 'text-ink-2'}`}
                    >
                      {l.label}
                      {l.badge === 'messages' && unreadMessages > 0 && <span className="rounded-full bg-accent px-2 text-xs font-bold leading-5 text-on-accent">{unreadMessages}</span>}
                    </NavLink>
                  </m.li>
                ))}
                {[
                  { to: '/how-it-works', label: 'How it works' },
                  { to: '/faq', label: 'FAQ' },
                  { to: '/contact', label: 'Contact support' },
                ]
                  .filter((x) => !links.some((l) => l.to === x.to))
                  .map((l) => (
                    <li key={l.to}>
                      <NavLink to={l.to} className="flex min-h-12 items-center rounded-2xl px-4 text-base font-medium text-ink-2">
                        {l.label}
                      </NavLink>
                    </li>
                  ))}
              </ul>
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-line px-2 pt-3">
                <ThemeToggle />
                {!user && (
                  <div className="flex gap-2">
                    <ButtonLink to="/login" variant="secondary" size="sm">
                      Log in
                    </ButtonLink>
                    <ButtonLink to="/register" size="sm">
                      Sign up
                    </ButtonLink>
                  </div>
                )}
              </div>
            </nav>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  );
}
