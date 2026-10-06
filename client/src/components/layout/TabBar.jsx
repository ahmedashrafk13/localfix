import { NavLink } from 'react-router';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';
import { tabBarFor } from './navItems.js';

/** Phone-only bottom navigation. The primary action sits in the middle of the thumb zone. */
export function TabBar() {
  const { user, ready } = useAuth();
  const { unreadMessages } = useRealtime();
  if (!ready) return null;
  const items = tabBarFor(user);

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl supports-[not(backdrop-filter:blur(1px))]:bg-surface md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-semibold ${isActive ? 'text-accent-text' : 'text-muted'}`
              }
            >
              {item.primary ? (
                <span className="inline-flex size-11 items-center justify-center rounded-full bg-accent text-on-accent shadow-soft">
                  <item.icon size={22} weight="bold" aria-hidden="true" />
                </span>
              ) : (
                <item.icon size={24} aria-hidden="true" />
              )}
              <span className={item.primary ? 'sr-only' : ''}>{item.label}</span>
              {item.badge === 'messages' && unreadMessages > 0 && (
                <span className="absolute right-[calc(50%-1.4rem)] top-2 min-w-[1.1rem] rounded-full bg-accent px-1 text-center text-[0.65rem] font-bold leading-[1.1rem] text-on-accent">
                  {unreadMessages}
                  <span className="sr-only"> unread</span>
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
