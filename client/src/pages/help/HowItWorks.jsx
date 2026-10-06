import {
  ArrowRightIcon,
  ChatsCircleIcon,
  ClipboardTextIcon,
  HandshakeIcon,
  IdentificationCardIcon,
  InfoIcon,
  ListMagnifyingGlassIcon,
  MedalIcon,
  PaperPlaneTiltIcon,
  StarIcon,
  TagIcon,
  TrophyIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { Tabs } from '../../components/ui/Nav.jsx';
import { Reveal } from '../../components/ui/Reveal.jsx';
import { useDocumentTitle } from '../../lib/hooks.js';

const JOURNEYS = {
  customer: [
    { icon: ClipboardTextIcon, title: 'Post a request', text: 'Choose a service, describe the problem, add photos and pin your area on the map. It takes about two minutes and is free.' },
    { icon: TagIcon, title: 'Compare offers', text: 'Verified providers nearby send a price, an arrival time, a warranty and what is included. Sort by price, rating, experience or arrival.' },
    { icon: ChatsCircleIcon, title: 'Chat and agree', text: 'Ask questions and negotiate in the built-in chat. When a provider changes their price, you see the old and the new amount.' },
    { icon: HandshakeIcon, title: 'Hire one provider', text: 'Accept the offer you like. Only now does that provider see your exact address and phone number. The others are told politely.' },
    { icon: StarIcon, title: 'Review the job', text: 'Once you confirm the work is done, rate the provider. Reviews can only come from completed jobs, so they stay honest.' },
  ],
  provider: [
    { icon: IdentificationCardIcon, title: 'Sign up and get verified', text: 'Create a free provider account, choose your services and areas, and upload your CNIC. Our team usually verifies you within a working day.' },
    { icon: ListMagnifyingGlassIcon, title: 'Find matching requests', text: 'You get an alert when someone in your area posts a job in your trade. Browse with filters by service, area, distance and date.' },
    { icon: PaperPlaneTiltIcon, title: 'Send an offer', text: 'Set your own price and arrival time, say what is included and any warranty. You can edit or withdraw it while the request is open.' },
    { icon: TrophyIcon, title: 'Win the job', text: 'When the customer accepts, you get their address and phone number. Do the work, then mark the job as done.' },
    { icon: MedalIcon, title: 'Build your reputation', text: 'Every completed job adds to your record. Good reviews and a strong gallery move you up in the provider directory.' },
  ],
};

export default function HowItWorks() {
  useDocumentTitle('How it works');
  const [tab, setTab] = useState('customer');
  const steps = JOURNEYS[tab];

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-bold text-ink sm:text-5xl">How LocalFix works</h1>
        <p className="mt-4 text-lg text-ink-2">Customers post the job once. Local providers compete with offers. Everyone sees the price, the reviews and the record before they commit.</p>
      </header>

      <Tabs
        className="mt-8"
        label="Choose a guide"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'customer', label: 'I need something fixed' },
          { value: 'provider', label: 'I am a provider' },
        ]}
      />

      <ol className="relative mt-10 max-w-3xl" key={tab}>
        <span className="absolute bottom-6 left-6 top-6 w-px bg-line" aria-hidden="true" />
        {steps.map((s, i) => (
          <Reveal as="li" key={s.title} delay={i * 0.05} className="relative flex gap-5 pb-8 last:pb-0">
            <span className="relative z-10 inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface text-accent-text shadow-soft">
              <s.icon size={24} aria-hidden="true" />
            </span>
            <div className="pt-1.5">
              <h2 className="text-xl font-bold text-ink">{s.title}</h2>
              <p className="mt-1.5 max-w-[60ch] text-ink-2">{s.text}</p>
            </div>
          </Reveal>
        ))}
      </ol>

      <div className="mt-10 flex flex-wrap gap-3">
        {tab === 'customer' ? (
          <ButtonLink to="/post-request" size="lg" trailingIcon={ArrowRightIcon}>
            Post a request
          </ButtonLink>
        ) : (
          <ButtonLink to="/register?role=provider" size="lg" trailingIcon={ArrowRightIcon}>
            Become a provider
          </ButtonLink>
        )}
        <ButtonLink to="/faq" variant="secondary" size="lg">
          Read the FAQ
        </ButtonLink>
      </div>

      <Reveal className="mt-16 max-w-3xl rounded-card border border-line bg-surface p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
          <InfoIcon size={22} className="text-info" aria-hidden="true" />
          What LocalFix does not do (yet)
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-2">
          <li>Payments are not processed on LocalFix. You pay the provider directly, ideally after the work is done.</li>
          <li>We do not run criminal background checks. We verify identity documents and rely on reviews from real jobs.</li>
          <li>There is no mobile app yet. The website works fully on phones and tablets.</li>
          <li>We currently cover Islamabad and Rawalpindi. More cities will follow.</li>
        </ul>
      </Reveal>
    </div>
  );
}
