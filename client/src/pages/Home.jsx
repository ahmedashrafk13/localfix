import {
  ArrowRightIcon,
  ChatsCircleIcon,
  ClipboardTextIcon,
  EyeSlashIcon,
  FlagIcon,
  HandshakeIcon,
  ListMagnifyingGlassIcon,
  SealCheckIcon,
  StarIcon,
} from '@phosphor-icons/react';
import { m, useReducedMotion } from 'motion/react';
import { Link } from 'react-router';
import { ProviderCard } from '../components/ProviderCard.jsx';
import { ButtonLink } from '../components/ui/Button.jsx';
import { Reveal } from '../components/ui/Reveal.jsx';
import { Skeleton } from '../components/ui/States.jsx';
import { Stars } from '../components/ui/Stars.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate, timeAgo } from '../lib/format.js';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { CategoryIcon } from '../lib/icons.jsx';

function Hero() {
  const reduce = useReducedMotion();
  const { user } = useAuth();
  const isProvider = user?.role === 'provider';
  const enter = (i) =>
    reduce ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] } };

  return (
    <section className="container-page grid items-center gap-10 pb-16 pt-8 sm:pt-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-24 lg:pt-16">
      <div className="max-w-xl">
        <m.h1 {...enter(0)} className="text-[2.5rem] font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-[3.6rem]">
          Post the job. <span className="text-accent-text">Local pros compete</span> for it.
        </m.h1>
        <m.p {...enter(1)} className="mt-5 max-w-[46ch] text-lg leading-relaxed text-ink-2">
          Describe the problem, get offers from ID-verified providers nearby, compare prices and hire the one you trust.
        </m.p>
        <m.div {...enter(2)} className="mt-8 flex flex-wrap items-center gap-3">
          {isProvider ? (
            <ButtonLink to="/provider/requests" size="lg" trailingIcon={ArrowRightIcon}>
              Find work near you
            </ButtonLink>
          ) : (
            <ButtonLink to="/post-request" size="lg" trailingIcon={ArrowRightIcon}>
              Post a request
            </ButtonLink>
          )}
          <ButtonLink to="/providers" variant="secondary" size="lg">
            Browse providers
          </ButtonLink>
        </m.div>
      </div>
      <m.div
        initial={reduce ? false : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="bezel lg:rotate-[1.2deg]"
      >
        <img
          src="/hero-960.webp"
          srcSet="/hero-640.webp 640w, /hero-960.webp 960w, /hero-1280.webp 1280w"
          sizes="(min-width: 1024px) 46vw, 100vw"
          width="1280"
          height="880"
          alt="A technician repairing a kitchen appliance with a screwdriver"
          fetchPriority="high"
          decoding="async"
          className="aspect-[16/11] w-full object-cover"
        />
      </m.div>
    </section>
  );
}

function Categories() {
  const { categories, loaded } = useAppData();
  return (
    <section aria-labelledby="cat-heading" className="container-page py-12 lg:py-16">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="cat-heading" className="text-3xl font-bold text-ink sm:text-4xl">
            What needs fixing?
          </h2>
          <Link to="/providers" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent-text hover:underline">
            All providers <ArrowRightIcon size={16} aria-hidden="true" />
          </Link>
        </div>
      </Reveal>
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        {!loaded &&
          Array.from({ length: 10 }, (_, i) => (
            <li key={i}>
              <Skeleton className="aspect-[4/5] rounded-card" />
            </li>
          ))}
        {categories.map((c, i) => (
          <Reveal as="li" key={c.id} delay={Math.min(i, 6) * 0.04} y={16}>
            <Link
              to={`/post-request?category=${c.slug}`}
              className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-card bg-surface-3 p-4 text-white"
            >
              {c.image && (
                <img
                  src={c.image}
                  alt=""
                  width="400"
                  height="500"
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.05]"
                />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/30 to-transparent" aria-hidden="true" />
              <span className="relative inline-flex size-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                <CategoryIcon name={c.icon} size={22} />
              </span>
              <span className="relative mt-3 font-display text-lg font-bold leading-tight">{c.name}</span>
              <span className="relative mt-0.5 text-[0.8rem] text-white/85">
                {c.providers} verified {c.providers === 1 ? 'pro' : 'pros'}
              </span>
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

const STEPS = [
  { icon: ClipboardTextIcon, title: 'Describe the problem', text: 'Pick a service, add photos and your area. It takes about two minutes.' },
  { icon: ListMagnifyingGlassIcon, title: 'Receive offers', text: 'Verified providers nearby send a price, an arrival time and what is included.' },
  { icon: ChatsCircleIcon, title: 'Compare and chat', text: 'Sort by price, rating or arrival time. Ask questions and negotiate in chat.' },
  { icon: HandshakeIcon, title: 'Hire and review', text: 'Accept one offer. Only then is your exact address shared. Rate the job afterwards.' },
];

function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="container-page py-12 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <h2 id="how-heading" className="text-3xl font-bold text-ink sm:text-4xl">
            Prices drop when pros compete
          </h2>
          <p className="mt-4 max-w-[42ch] text-ink-2">
            Instead of calling around, you post once and the offers come to you. You stay in control until you choose.
          </p>
          <Link to="/how-it-works" className="mt-6 inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent-text hover:underline">
            See the full guide <ArrowRightIcon size={16} aria-hidden="true" />
          </Link>
        </Reveal>
        <ol className="relative space-y-4">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 0.06} className="relative flex gap-5 rounded-card border border-line bg-surface p-5 sm:p-6">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent-text">
                <s.icon size={26} aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-ink">{s.title}</h3>
                <p className="mt-1 text-ink-2">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

function LiveNumbers({ stats, loading }) {
  const items = stats
    ? [
        { value: stats.verifiedProviders, label: 'ID-verified providers' },
        { value: stats.jobsCompleted, label: 'jobs completed' },
        { value: stats.avgRating ? `${stats.avgRating.toFixed(1)}/5` : 'New', label: `average rating from ${stats.reviewCount} reviews` },
        { value: stats.avgOffersPerRequest ?? '0', label: 'offers per request on average' },
      ]
    : [];
  return (
    <section aria-labelledby="numbers-heading" className="container-page py-8">
      <Reveal className="rounded-[1.75rem] border border-line bg-surface p-6 sm:p-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="numbers-heading" className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-muted">
            Live on LocalFix
          </h2>
          {stats && <p className="text-xs text-muted">Updated {timeAgo(stats.updatedAt)} from real platform data</p>}
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4 lg:divide-x lg:divide-line">
          {loading &&
            Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-2 lg:px-6 lg:first:pl-0">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          {items.map((it) => (
            <div key={it.label} className="lg:px-6 lg:first:pl-0">
              <dt className="sr-only">{it.label}</dt>
              <dd className="font-display text-4xl font-bold tabular-nums text-ink sm:text-5xl">{it.value}</dd>
              <dd className="mt-1 text-sm text-muted">{it.label}</dd>
            </div>
          ))}
        </dl>
        {stats?.medianFirstOfferMins !== null && stats?.medianFirstOfferMins !== undefined && (
          <p className="mt-6 border-t border-line pt-5 text-sm text-ink-2">
            Half of all requests receive their first offer within <strong className="text-ink">{stats.medianFirstOfferMins} minutes</strong>.
          </p>
        )}
      </Reveal>
    </section>
  );
}

function FeaturedProviders({ providers, loading }) {
  if (!loading && !providers?.length) return null;
  return (
    <section aria-labelledby="pros-heading" className="py-12 lg:py-20">
      <div className="container-page">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="pros-heading" className="text-3xl font-bold text-ink sm:text-4xl">
              Top-rated near you
            </h2>
            <Link to="/providers?sort=rating" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent-text hover:underline">
              See all providers <ArrowRightIcon size={16} aria-hidden="true" />
            </Link>
          </div>
        </Reveal>
      </div>
      <div className="container-page mt-8">
        <ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
          {loading &&
            Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="w-[80%] shrink-0 snap-start sm:w-[45%] lg:w-auto">
                <Skeleton className="h-64 rounded-card" />
              </li>
            ))}
          {providers?.slice(0, 8).map((p) => (
            <li key={p.id} className="w-[80%] shrink-0 snap-start sm:w-[45%] lg:w-auto">
              <ProviderCard provider={p} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const TRUST = [
  { icon: SealCheckIcon, title: 'Every provider is ID-checked', text: 'Our team reviews CNIC documents before a provider can send a single offer.' },
  { icon: StarIcon, title: 'Reviews come from real jobs', text: 'Only customers who completed a job with a provider can rate them.' },
  { icon: EyeSlashIcon, title: 'Your address stays private', text: 'Providers see your area only. The exact address goes to the one you hire.' },
  { icon: FlagIcon, title: 'Report anything, anytime', text: 'Flag a provider, request, message or review and a moderator steps in.' },
];

function Trust() {
  return (
    <section aria-labelledby="trust-heading" className="container-page py-12 lg:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal className="bezel order-last lg:order-first lg:-rotate-[1deg]">
          <img src="/uploads/seed/about.webp" alt="A technician's tools laid out on a workbench" width="1400" height="900" loading="lazy" decoding="async" className="aspect-[14/10] w-full object-cover" />
        </Reveal>
        <div>
          <Reveal>
            <h2 id="trust-heading" className="text-3xl font-bold text-ink sm:text-4xl">
              Built for trust, not guesswork
            </h2>
            <p className="mt-4 max-w-[48ch] text-ink-2">Word of mouth and Facebook groups leave you guessing. LocalFix gives you proof before you open the door.</p>
          </Reveal>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
            {TRUST.map((t, i) => (
              <Reveal as="li" key={t.title} delay={i * 0.05}>
                <t.icon size={28} className="text-accent-text" aria-hidden="true" />
                <h3 className="mt-3 font-bold text-ink">{t.title}</h3>
                <p className="mt-1 text-sm text-ink-2">{t.text}</p>
              </Reveal>
            ))}
          </ul>
          <Link to="/safety" className="mt-8 inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent-text hover:underline">
            How we keep LocalFix safe <ArrowRightIcon size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Testimonials({ reviews }) {
  if (!reviews?.length) return null;
  return (
    <section aria-labelledby="reviews-heading" className="container-page py-12 lg:py-20">
      <Reveal>
        <h2 id="reviews-heading" className="max-w-xl text-3xl font-bold text-ink sm:text-4xl">
          What customers say after the job
        </h2>
      </Reveal>
      <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {reviews.slice(0, 6).map((r, i) => (
          <Reveal key={r.id} delay={(i % 3) * 0.06} className="mb-4 break-inside-avoid">
            <figure className="rounded-card border border-line bg-surface p-6">
              <Stars value={r.rating} size={16} />
              <blockquote className="mt-3 line-clamp-4 text-[1.02rem] leading-relaxed text-ink">&ldquo;{r.comment}&rdquo;</blockquote>
              <figcaption className="mt-4 text-sm">
                <span className="font-semibold text-ink">{r.customer.name}</span>
                <span className="text-muted">
                  {r.customer.city ? `, ${r.customer.city}` : ''}
                  {r.request?.category ? `. ${r.request.category.name} job` : ''}
                  {r.provider?.name ? ` with ${r.provider.name}` : ''}
                </span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function ProviderCta() {
  return (
    <section aria-labelledby="pro-cta-heading" className="container-page py-12 lg:py-16">
      <Reveal className="grid gap-8 overflow-hidden rounded-[1.75rem] bg-accent-soft p-7 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:p-14">
        <div>
          <p className="text-[0.78rem] font-bold uppercase tracking-[0.16em] text-accent-text">For tradespeople</p>
          <h2 id="pro-cta-heading" className="mt-3 text-3xl font-bold text-ink sm:text-4xl">
            Steady local jobs, no cold calls
          </h2>
          <p className="mt-4 max-w-[48ch] text-ink-2">
            Get alerts for requests in your trade and area, send your own price, and build a reputation customers can see.
          </p>
          <ButtonLink to="/register?role=provider" size="lg" className="mt-7" trailingIcon={ArrowRightIcon}>
            Become a provider
          </ButtonLink>
        </div>
        <ul className="grid gap-3 text-[0.95rem]">
          {['Free to join and send offers', 'You set your own prices', 'Verified badge after an ID check', 'Chat with customers before you commit'].map((t) => (
            <li key={t} className="flex items-center gap-3 rounded-2xl bg-surface/80 px-4 py-3 font-medium text-ink">
              <SealCheckIcon size={20} weight="fill" className="shrink-0 text-accent-text" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

function LatestTips() {
  const { data } = useApi('/tips');
  const tips = data?.items?.slice(0, 3) || [];
  if (!tips.length) return null;
  return (
    <section aria-labelledby="tips-heading" className="container-page py-12 lg:py-20">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="tips-heading" className="text-3xl font-bold text-ink sm:text-4xl">
            Maintenance tips
          </h2>
          <Link to="/tips" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent-text hover:underline">
            All articles <ArrowRightIcon size={16} aria-hidden="true" />
          </Link>
        </div>
      </Reveal>
      <ul className="mt-8 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        {tips.map((t, i) => (
          <Reveal as="li" key={t.id} delay={i * 0.06} className={i === 0 ? 'md:row-span-2' : ''}>
            <Link to={`/tips/${t.slug}`} className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface">
              <div className={`overflow-hidden bg-surface-3 ${i === 0 ? 'aspect-[16/10]' : 'aspect-[16/7]'}`}>
                {t.cover && (
                  <img src={t.cover} alt="" width="800" height="500" loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]" />
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs font-semibold text-accent-text">{t.category?.name}</p>
                <h3 className={`mt-1 font-bold text-ink group-hover:underline ${i === 0 ? 'text-xl' : 'text-base'}`}>{t.title}</h3>
                {i === 0 && <p className="mt-2 text-sm text-ink-2">{t.excerpt}</p>}
                <p className="mt-auto pt-3 text-xs text-muted">
                  {formatDate(t.publishedAt)}, {t.readMins} min read
                </p>
              </div>
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

export default function Home() {
  useDocumentTitle('');
  const { data: stats, loading } = useApi('/stats/public');
  return (
    <>
      <Hero />
      <Categories />
      <HowItWorks />
      <LiveNumbers stats={stats} loading={loading} />
      <FeaturedProviders providers={stats?.featuredProviders} loading={loading} />
      <Trust />
      <Testimonials reviews={stats?.testimonials} />
      <ProviderCta />
      <LatestTips />
    </>
  );
}
