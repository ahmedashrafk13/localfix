import { ChatsCircleIcon, EyeSlashIcon, ScalesIcon, StarIcon, StorefrontIcon, UsersThreeIcon } from '@phosphor-icons/react';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { Reveal } from '../../components/ui/Reveal.jsx';
import { Skeleton } from '../../components/ui/States.jsx';
import { initials } from '../../lib/format.js';
import { useApi, useDocumentTitle } from '../../lib/hooks.js';

const PROBLEMS = [
  { icon: UsersThreeIcon, title: 'Word of mouth is slow', text: 'Finding a reliable plumber or electrician still means calling friends, scrolling Facebook groups and hoping someone answers.' },
  { icon: ScalesIcon, title: 'Prices are a guess', text: 'Without competing quotes, customers cannot tell a fair price from an inflated one at the moment they need help.' },
  { icon: StorefrontIcon, title: 'Good tradespeople stay invisible', text: 'Skilled independent providers have no simple way to find steady work or prove their track record.' },
];

const DIFFERENT = [
  { icon: ScalesIcon, text: 'Providers compete with offers, so the price is set by competition, not guesswork.' },
  { icon: ChatsCircleIcon, text: 'Built-in chat lets both sides ask questions and negotiate before anyone commits.' },
  { icon: StarIcon, text: 'Reviews come only from completed jobs, and every provider is ID-checked.' },
  { icon: EyeSlashIcon, text: 'Your exact address is shared only with the provider you hire.' },
];

const TEAM = [
  { name: 'Ahmed Ashraf', role: 'Team lead', focus: 'Requirements, SRS, coordination and the final report' },
  { name: 'Zaid Abbasi', role: 'UI/UX and front end', focus: 'Interface design, React pages and accessibility' },
  { name: 'Muhammad Abdullah', role: 'Back end and database', focus: 'Express API, MongoDB schema and real-time chat' },
];

function LiveStats() {
  const { data, loading, error } = useApi('/stats/public');
  const items = data
    ? [
        { value: data.verifiedProviders, label: 'Verified providers' },
        { value: data.jobsCompleted, label: 'Jobs completed' },
        { value: data.avgRating ? data.avgRating.toFixed(1) : 'New', label: 'Average rating' },
        { value: data.reviewCount, label: 'Reviews from real jobs' },
      ]
    : [];
  if (error) return <p className="text-sm text-muted">Live numbers are unavailable right now.</p>;
  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {loading
        ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-card" />)
        : items.map((it) => (
            <div key={it.label} className="rounded-card border border-line bg-surface p-5">
              <dt className="text-sm text-muted">{it.label}</dt>
              <dd className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">{it.value}</dd>
            </div>
          ))}
    </dl>
  );
}

export default function About() {
  useDocumentTitle('About us');
  return (
    <div className="container-page py-10 sm:py-14">
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold text-ink sm:text-5xl">Fair prices and trusted help, close to home</h1>
          <p className="mt-5 max-w-[52ch] text-lg text-ink-2">
            LocalFix is a marketplace for home and vehicle services in Islamabad and Rawalpindi. You describe the problem once, and verified local providers compete to fix it.
          </p>
        </div>
        <div className="bezel">
          <img src="/uploads/seed/about.webp" alt="Tools laid out on a workbench" width="1400" height="900" loading="lazy" decoding="async" className="aspect-[14/9] w-full object-cover" />
        </div>
      </section>

      <section aria-labelledby="problem-h" className="mt-20">
        <Reveal>
          <h2 id="problem-h" className="text-3xl font-bold text-ink">
            The problem we set out to solve
          </h2>
        </Reveal>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {PROBLEMS.map((p, i) => (
            <Reveal as="li" key={p.title} delay={i * 0.06} className="rounded-card border border-line bg-surface p-6">
              <p.icon size={28} className="text-accent-text" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-bold text-ink">{p.title}</h3>
              <p className="mt-1.5 text-ink-2">{p.text}</p>
            </Reveal>
          ))}
        </ul>
      </section>

      <section aria-labelledby="diff-h" className="mt-20 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <h2 id="diff-h" className="text-3xl font-bold text-ink">
            How LocalFix is different
          </h2>
          <p className="mt-3 max-w-[46ch] text-ink-2">
            Unlike fixed-price catalogues or unmoderated groups, LocalFix combines competitive bidding with verification and honest reviews.
          </p>
        </Reveal>
        <ul className="space-y-3">
          {DIFFERENT.map((d, i) => (
            <Reveal as="li" key={d.text} delay={i * 0.05} className="flex items-start gap-4 rounded-2xl bg-surface-2 p-4">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                <d.icon size={20} aria-hidden="true" />
              </span>
              <p className="pt-1.5 text-ink">{d.text}</p>
            </Reveal>
          ))}
        </ul>
      </section>

      <section aria-labelledby="stats-h" className="mt-20">
        <h2 id="stats-h" className="mb-6 text-3xl font-bold text-ink">
          LocalFix today
        </h2>
        <LiveStats />
      </section>

      <section aria-labelledby="team-h" className="mt-20">
        <h2 id="team-h" className="text-3xl font-bold text-ink">
          The team
        </h2>
        <p className="mt-3 max-w-[60ch] text-ink-2">LocalFix was designed and built as a group project for CS 313 Web Engineering, using MongoDB, Express, React and Node.js.</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {TEAM.map((m) => (
            <li key={m.name} className="rounded-card border border-line bg-surface p-6">
              <span className="inline-flex size-14 items-center justify-center rounded-full bg-accent-soft font-display text-lg font-bold text-accent-text" aria-hidden="true">
                {initials(m.name)}
              </span>
              <h3 className="mt-4 text-lg font-bold text-ink">{m.name}</h3>
              <p className="text-sm font-semibold text-accent-text">{m.role}</p>
              <p className="mt-2 text-sm text-ink-2">{m.focus}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-16 flex flex-wrap gap-3">
        <ButtonLink to="/post-request" size="lg">
          Post a request
        </ButtonLink>
        <ButtonLink to="/contact" variant="secondary" size="lg">
          Contact us
        </ButtonLink>
      </div>
    </div>
  );
}
