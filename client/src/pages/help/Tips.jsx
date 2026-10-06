import { ArticleIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States.jsx';
import { formatDate } from '../../lib/format.js';
import { useApi, useDocumentTitle } from '../../lib/hooks.js';

function Meta({ t }) {
  return (
    <p className="text-xs text-muted">
      <time dateTime={t.publishedAt}>{formatDate(t.publishedAt)}</time>, {t.readMins} min read
    </p>
  );
}

export default function Tips() {
  useDocumentTitle('Maintenance tips');
  const { data, loading, error, reload } = useApi('/tips');
  const items = data?.items || [];
  const [first, ...rest] = items;

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-bold text-ink sm:text-5xl">Maintenance tips</h1>
        <p className="mt-4 text-lg text-ink-2">Practical advice from our team to prevent breakdowns and know when to call a professional.</p>
      </header>

      <div className="mt-10">
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-80 rounded-card md:col-span-2" />
            <Skeleton className="h-64 rounded-card" />
            <Skeleton className="h-64 rounded-card" />
          </div>
        ) : !items.length ? (
          <EmptyState icon={ArticleIcon} title="No articles yet" description="New maintenance tips are published every month." />
        ) : (
          <>
            <Link to={`/tips/${first.slug}`} className="group grid overflow-hidden rounded-[1.75rem] border border-line bg-surface md:grid-cols-[1.3fr_1fr]">
              <div className="aspect-[16/10] overflow-hidden bg-surface-3 md:aspect-auto">
                {first.cover && (
                  <img src={first.cover} alt="" width="1400" height="800" decoding="async" className="size-full object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]" />
                )}
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-10">
                <p className="text-sm font-semibold text-accent-text">{first.category?.name}</p>
                <h2 className="mt-2 text-2xl font-bold text-ink group-hover:underline sm:text-3xl">{first.title}</h2>
                <p className="mt-3 text-ink-2">{first.excerpt}</p>
                <div className="mt-5">
                  <Meta t={first} />
                </div>
              </div>
            </Link>
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((t) => (
                <li key={t.id}>
                  <Link to={`/tips/${t.slug}`} className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface">
                    <div className="aspect-[16/9] overflow-hidden bg-surface-3">
                      {t.cover && (
                        <img src={t.cover} alt="" width="800" height="450" loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-xs font-semibold text-accent-text">{t.category?.name}</p>
                      <h2 className="mt-1 text-lg font-bold text-ink group-hover:underline">{t.title}</h2>
                      <p className="mt-2 line-clamp-3 text-sm text-ink-2">{t.excerpt}</p>
                      <div className="mt-auto pt-4">
                        <Meta t={t} />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
