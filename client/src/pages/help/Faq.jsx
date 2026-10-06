import { CaretDownIcon } from '@phosphor-icons/react';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { useDocumentTitle } from '../../lib/hooks.js';

const GROUPS = [
  {
    id: 'customers',
    title: 'Customers',
    items: [
      ['Does it cost anything to post a request?', 'No. Posting requests, comparing offers and chatting with providers is free for customers.'],
      ['How many offers will I get?', 'It depends on the service and your area. Most requests receive several offers, and the live numbers on our home page show the current average. You will be notified the moment each offer arrives.'],
      ['Is my address shared with every provider?', 'No. Providers browsing requests only see your area and a circle on the map of roughly one kilometre. Your exact address and phone number are shared only with the provider whose offer you accept.'],
      ['How do I pay the provider?', 'Payments are not handled on LocalFix. You pay the provider directly, in cash or by bank transfer, as agreed in your offer. Pay after the work is done whenever possible.'],
      ['What if a provider asks for an advance payment?', 'Do not send money in advance outside the terms you agreed. Use the Report button on the chat message or on their profile, and our moderators will review it within 24 hours.'],
      ['Can I change or cancel my request?', 'Yes. You can edit an open request at any time, and cancel it while it is open or in progress. Providers who sent offers are notified automatically.'],
      ['How do I choose between offers?', 'Use the comparison view to sort by price, rating, experience or arrival time. Look at the warranty, whether materials are included, and the provider\'s reviews and work photos. You can chat with any provider before deciding.'],
    ],
  },
  {
    id: 'providers',
    title: 'Providers',
    items: [
      ['How are providers verified?', 'You upload a photo of your CNIC and your CNIC number. An admin checks the document, usually within one working day. Only the last four digits are shown on your account, and the document is visible to admins only.'],
      ['Does it cost anything to send offers?', 'No. Joining, getting verified and sending offers is free in this version of LocalFix.'],
      ['Can I edit my offer after sending it?', 'Yes, while the request is still open. The customer sees your new price together with the previous one, so negotiations stay transparent.'],
      ['Why can I not send offers yet?', 'Offers unlock once your identity is verified and your email is confirmed. Check the banner on your dashboard for what is still missing.'],
      ['How is my rating calculated?', 'Your rating is the average of all visible reviews from customers who completed a job with you. Each completed job can be reviewed once, and you can publish one public reply to each review.'],
      ['Which requests do I get alerts for?', 'You are alerted about new requests in the services you selected, in your city or in the areas you cover. You can change both on your profile at any time.'],
      ['What happens when a customer accepts my offer?', 'You get a notification, and the request page shows the customer\'s full name, phone number and address. After the work, mark the job as done so the customer can confirm and review.'],
    ],
  },
  {
    id: 'account',
    title: 'Account and privacy',
    items: [
      ['I forgot my password. What do I do?', 'Use "Forgot password?" on the login page. We email you a link that is valid for one hour. Resetting your password signs you out on all other devices.'],
      ['How do I download my data?', 'Go to Account settings and choose "Download my data". You get a file with your profile, requests, offers, reviews, messages and notifications.'],
      ['How do I delete my account?', 'Go to Account settings and choose "Delete account". Open requests are cancelled, pending offers are withdrawn and your personal data is deleted. Reviews you wrote stay on providers\' profiles but show "Deleted user".'],
      ['Who can read my chat messages?', 'Only you and the other person in the conversation. Moderators may review a specific message if someone reports it.'],
      ['How is my password stored?', 'Passwords are never stored as plain text. We store a bcrypt hash, which cannot be turned back into your password.'],
      ['Can I use LocalFix on my phone?', 'Yes. The whole site is designed for phones first, including posting requests with photos, chatting and comparing offers.'],
    ],
  },
];

export default function Faq() {
  useDocumentTitle('Frequently asked questions');
  const location = useLocation();

  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [location.hash]);

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-bold text-ink sm:text-5xl">Frequently asked questions</h1>
        <p className="mt-4 text-lg text-ink-2">Straight answers about requests, offers, payments, verification and your data.</p>
      </header>
      <nav aria-label="FAQ sections" className="mt-8 flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <a key={g.id} href={`#${g.id}`} className="inline-flex min-h-10 items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold text-ink-2 hover:border-ink/30 hover:text-ink">
            {g.title}
          </a>
        ))}
      </nav>
      <div className="mt-10 max-w-3xl space-y-12">
        {GROUPS.map((g) => (
          <section key={g.id} id={g.id} aria-labelledby={`${g.id}-h`} className="scroll-mt-28">
            <h2 id={`${g.id}-h`} className="text-2xl font-bold text-ink">
              {g.title}
            </h2>
            <div className="mt-4 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
              {g.items.map(([q, a]) => (
                <details key={q} className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 [&::-webkit-details-marker]:hidden">
                    {q}
                    <CaretDownIcon size={18} className="shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="px-5 pb-5 text-ink-2">{a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="mt-14 max-w-3xl rounded-card bg-accent-soft p-6 sm:p-8">
        <h2 className="text-xl font-bold text-ink">Still need help?</h2>
        <p className="mt-1 text-ink-2">
          Our support team replies within one working day. You can also read our <Link to="/safety" className="font-semibold text-accent-text underline">safety guide</Link>.
        </p>
        <ButtonLink to="/contact" className="mt-4">
          Contact support
        </ButtonLink>
      </div>
    </div>
  );
}
