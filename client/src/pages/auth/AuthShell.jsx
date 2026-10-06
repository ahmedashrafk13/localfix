import { Card } from '../../components/ui/Card.jsx';

/** Shared two-column frame for login, register and password pages. */
export function AuthShell({ title, description, children, aside }) {
  return (
    <div className="container-page grid gap-8 py-8 sm:py-12 lg:grid-cols-[minmax(0,30rem)_1fr] lg:items-start lg:gap-12">
      <Card className="shadow-soft sm:p-8">
        <h1 className="text-[1.9rem] font-bold leading-tight text-ink">{title}</h1>
        {description && <p className="mt-2 text-muted">{description}</p>}
        <div className="mt-7">{children}</div>
      </Card>
      {aside && <aside className="lg:pt-2">{aside}</aside>}
    </div>
  );
}
