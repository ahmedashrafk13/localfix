/** Layout for long policy pages: title, "last updated" stamp, sticky table of contents. */
export function DocLayout({ title, intro, updated, sections, children }) {
  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-3xl">
        <h1 className="text-4xl font-bold text-ink sm:text-5xl">{title}</h1>
        {intro && <p className="mt-4 text-lg text-ink-2">{intro}</p>}
        {updated && (
          <p className="mt-3 text-sm text-muted">
            Last updated: <time>{updated}</time>
          </p>
        )}
      </header>
      <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="On this page" className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-sm font-bold text-ink">On this page</p>
          <ol className="mt-3 space-y-1 border-l border-line">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-sm text-muted transition-colors hover:border-accent hover:text-ink">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="prose-lf max-w-[70ch]">{children}</article>
      </div>
    </div>
  );
}

export function DocSection({ id, title, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-28">
      <h2 id={`${id}-h`}>{title}</h2>
      {children}
    </section>
  );
}
