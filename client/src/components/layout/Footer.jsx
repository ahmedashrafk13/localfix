import { ClockIcon, EnvelopeSimpleIcon, MapPinIcon, PhoneIcon, SealCheckIcon, ShieldCheckIcon, StarIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { Logo } from '../ui/Logo.jsx';

const columns = [
  {
    title: 'For customers',
    links: [
      { to: '/post-request', label: 'Post a request' },
      { to: '/providers', label: 'Find providers' },
      { to: '/how-it-works', label: 'How it works' },
      { to: '/tips', label: 'Maintenance tips' },
    ],
  },
  {
    title: 'For providers',
    links: [
      { to: '/register?role=provider', label: 'Become a provider' },
      { to: '/requests', label: 'Browse open requests' },
      { to: '/faq#providers', label: 'Provider FAQ' },
      { to: '/safety', label: 'Verification and safety' },
    ],
  },
  {
    title: 'LocalFix',
    links: [
      { to: '/about', label: 'About us' },
      { to: '/contact', label: 'Contact support' },
      { to: '/developers', label: 'API and integrations' },
      { to: '/terms', label: 'Terms of service' },
      { to: '/privacy', label: 'Privacy policy' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-14 lg:grid-cols-[1.3fr_2fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Post a repair job, compare offers from verified local providers, and hire with confidence. Serving Islamabad and Rawalpindi.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-ink-2">
            <li className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5">
              <SealCheckIcon size={16} className="text-info" aria-hidden="true" /> ID-verified providers
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5">
              <StarIcon size={16} className="text-amber-500" aria-hidden="true" /> Reviews from real jobs only
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5">
              <ShieldCheckIcon size={16} className="text-success" aria-hidden="true" /> HTTPS and encrypted passwords
            </li>
          </ul>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-sm font-bold text-ink">{col.title}</h2>
              <ul className="mt-3 space-y-1">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="inline-flex min-h-9 items-center text-sm text-muted transition-colors hover:text-ink">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div>
            <h2 className="text-sm font-bold text-ink">Support</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-muted">
              <li>
                <a href="mailto:support@localfix.test" className="inline-flex items-center gap-2 hover:text-ink">
                  <EnvelopeSimpleIcon size={16} aria-hidden="true" /> support@localfix.test
                </a>
              </li>
              <li>
                <a href="tel:+92510000100" className="inline-flex items-center gap-2 hover:text-ink">
                  <PhoneIcon size={16} aria-hidden="true" /> +92 51 0000 100
                </a>
              </li>
              <li className="flex items-start gap-2">
                <ClockIcon size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> Mon to Sat, 9:00 to 18:00
              </li>
              <li className="flex items-start gap-2">
                <MapPinIcon size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> Islamabad and Rawalpindi
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} LocalFix. Group project for CS 313 Web Engineering.</p>
          <p>All people and businesses in the sample data are fictional.</p>
        </div>
      </div>
    </footer>
  );
}
