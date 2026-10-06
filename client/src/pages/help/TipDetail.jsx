import { ArrowLeftIcon, ArticleIcon } from '@phosphor-icons/react';
import { Link, useParams } from 'react-router';
import { Avatar } from '../../components/ui/Avatar.jsx';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States.jsx';
import { formatDate } from '../../lib/format.js';
import { useApi, useDocumentTitle } from '../../lib/hooks.js';

/**
 * Turns the plain-text article format into React elements (no HTML injection possible):
 * blank line = new block, "## " = subheading, consecutive "- " lines = bullet list, otherwise a paragraph.
 */
function renderBody(body) {
  return body
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, i) => {
      if (block.startsWith('## ')) return <h2 key={i}>{block.slice(3)}</h2>;
      const lines = block.split('\n');
      if (lines.every((l) => l.trim().startsWith('- '))) {
        return (
          <ul key={i}>
            {lines.map((l, j) => (
              <li key={j}>{l.trim().slice(2)}</li>
            ))}
          </ul>
        );
      }
      return <p key={i}>{lines.join(' ')}</p>;
    });
}

export default function TipDetail() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useApi(`/tips/${slug}`);
  const t = data?.tip;
  useDocumentTitle(t?.title || 'Maintenance tip');

  if (loading && !data) {
    return (
      <div className="container-page max-w-3xl py-10" role="status" aria-label="Loading article…">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="mt-6 aspect-[16/9] w-full rounded-card" />
        <Skeleton className="mt-6 h-4 w-full" />
        <Skeleton className="mt-3 h-4 w-5/6" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="container-page py-12">
        {error.status === 404 ? (
          <EmptyState icon={ArticleIcon} title="Article not found" description="It may have been moved or unpublished." action={<ButtonLink to="/tips">All maintenance tips</ButtonLink>} />
        ) : (
          <ErrorState error={error} onRetry={reload} />
        )}
      </div>
    );
  }
  if (!t) return null;

  return (
    <article className="container-page max-w-3xl py-8 sm:py-12">
      <Link to="/tips" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeftIcon size={16} aria-hidden="true" /> All tips
      </Link>
      <header className="mt-2">
        {t.category && <p className="text-sm font-semibold text-accent-text">{t.category.name}</p>}
        <h1 className="mt-2 text-4xl font-bold leading-tight text-ink sm:text-5xl">{t.title}</h1>
        {t.excerpt && <p className="mt-4 text-lg text-ink-2">{t.excerpt}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted">
          {t.author && <Avatar src={t.author.avatar} name={t.author.name} size="sm" />}
          <span>
            {t.author ? `${t.author.name}, LocalFix team. ` : ''}Published <time dateTime={t.publishedAt}>{formatDate(t.publishedAt)}</time>. Last updated{' '}
            <time dateTime={t.updatedAt}>{formatDate(t.updatedAt)}</time>. {t.readMins} min read.
          </span>
        </div>
      </header>
      {t.cover && (
        <div className="bezel mt-8">
          <img src={t.cover} alt="" width="1400" height="800" decoding="async" className="aspect-[16/9] w-full object-cover" />
        </div>
      )}
      <div className="prose-lf mt-10 text-[1.06rem] leading-relaxed">{renderBody(t.body)}</div>
      <aside className="mt-12 flex flex-col gap-4 rounded-card bg-accent-soft p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="text-xl font-bold text-ink">Need a professional?</h2>
          <p className="mt-1 text-ink-2">Post a request and compare offers from verified providers near you.</p>
        </div>
        <ButtonLink to={`/post-request${t.category ? `?category=${t.category.slug}` : ''}`} size="lg">
          Post a request
        </ButtonLink>
      </aside>
    </article>
  );
}
