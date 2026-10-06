import { CompassIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { ButtonLink } from '../components/ui/Button.jsx';
import { useDocumentTitle } from '../lib/hooks.js';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="container-page flex min-h-[60dvh] flex-col items-start justify-center py-16">
      <CompassIcon size={48} className="text-accent-text" aria-hidden="true" />
      <h1 className="mt-5 text-4xl font-bold text-ink sm:text-5xl">This page does not exist</h1>
      <p className="mt-3 max-w-[48ch] text-lg text-ink-2">The link may be old or mistyped. Here are a few places to go instead.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink to="/">Go to the home page</ButtonLink>
        <ButtonLink to="/providers" variant="secondary">
          Find providers
        </ButtonLink>
      </div>
      <p className="mt-6 text-sm text-muted">
        Think something is broken?{' '}
        <Link to="/contact" className="font-semibold text-accent-text underline">
          Tell us
        </Link>
        .
      </p>
    </div>
  );
}
