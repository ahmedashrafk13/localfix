import { ChatsCircleIcon, EyeSlashIcon, FlagIcon, HandCoinsIcon, LockKeyIcon, SealCheckIcon, StarIcon } from '@phosphor-icons/react';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { Reveal } from '../../components/ui/Reveal.jsx';
import { useDocumentTitle } from '../../lib/hooks.js';

const PILLARS = [
  { icon: SealCheckIcon, title: 'ID-verified providers', text: 'Every provider uploads a CNIC that an admin checks before they can send an offer. Verified providers carry a blue badge on their profile and offers.' },
  { icon: StarIcon, title: 'Reviews from completed jobs only', text: 'A review can only be written by the customer who hired the provider, once, after confirming the job is complete.' },
  { icon: EyeSlashIcon, title: 'Your address stays private', text: 'Browsing providers see your area and an approximate circle on the map. The exact address and phone number go only to the provider you hire.' },
  { icon: ChatsCircleIcon, title: 'Chat keeps a record', text: 'Offers, price changes and agreements in LocalFix chat are saved, which helps if there is ever a dispute.' },
  { icon: HandCoinsIcon, title: 'No advance payments', text: 'Pay the provider directly after the work. Never send a large advance, and report anyone who pressures you to pay outside the agreed terms.' },
  { icon: FlagIcon, title: 'Report anything', text: 'Every provider, request, chat message and review has a Report button. Moderators review reports within 24 hours and can remove content or suspend accounts.' },
];

export default function Safety() {
  useDocumentTitle('Trust and safety');
  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-bold text-ink sm:text-5xl">Trust and safety</h1>
        <p className="mt-4 text-lg text-ink-2">You are inviting someone into your home, or someone is inviting you into theirs. Here is how LocalFix protects both sides.</p>
      </header>

      <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PILLARS.map((p, i) => (
          <Reveal as="li" key={p.title} delay={(i % 3) * 0.05} className="rounded-card border border-line bg-surface p-6">
            <p.icon size={28} className="text-accent-text" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-bold text-ink">{p.title}</h2>
            <p className="mt-1.5 text-ink-2">{p.text}</p>
          </Reveal>
        ))}
      </ul>

      <div className="mt-16 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="cust-h" className="rounded-card bg-surface-2 p-6 sm:p-8">
          <h2 id="cust-h" className="text-2xl font-bold text-ink">
            Safety tips for customers
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-2">
            <li>Check the Verified badge, reviews and work photos before accepting an offer.</li>
            <li>Agree the full price, what is included and any warranty in chat before work starts.</li>
            <li>Ask the provider to show any old part they replace.</li>
            <li>Keep valuables out of sight and, if possible, have someone else at home.</li>
            <li>Pay after the work is done, and only the agreed amount.</li>
          </ul>
        </section>
        <section aria-labelledby="prov-h" className="rounded-card bg-surface-2 p-6 sm:p-8">
          <h2 id="prov-h" className="text-2xl font-bold text-ink">
            Safety tips for providers
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-2">
            <li>Confirm the job details and the price in chat before travelling.</li>
            <li>Share your location with someone you trust when visiting a new customer.</li>
            <li>If extra work is needed, update your offer so the new price is on record.</li>
            <li>Leave if you feel unsafe, and report the request afterwards.</li>
            <li>Mark the job as done in LocalFix so it counts towards your record.</li>
          </ul>
        </section>
      </div>

      <section aria-labelledby="sec-h" className="mt-16 max-w-3xl">
        <h2 id="sec-h" className="flex items-center gap-2 text-2xl font-bold text-ink">
          <LockKeyIcon size={26} className="text-success" aria-hidden="true" />
          How we protect your data
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-2">
          <li>All traffic is encrypted with HTTPS in production, and session cookies are httpOnly and secure.</li>
          <li>Passwords are stored as bcrypt hashes, never as plain text.</li>
          <li>Role-based access control: customers, providers and admins can only reach what their role allows.</li>
          <li>Uploaded photos are re-encoded on our server, which removes hidden location data (EXIF) from your camera.</li>
          <li>CNIC documents are stored outside the public folder and can only be opened by admins.</li>
          <li>Inputs are validated on the server, and requests are rate-limited to block abuse.</li>
        </ul>
      </section>

      <div className="mt-14 flex flex-wrap gap-3">
        <ButtonLink to="/contact" size="lg">
          Report a safety concern
        </ButtonLink>
        <ButtonLink to="/privacy" variant="secondary" size="lg">
          Read the privacy policy
        </ButtonLink>
      </div>
    </div>
  );
}
