import { Link } from 'react-router';
import { useDocumentTitle } from '../../lib/hooks.js';
import { DocLayout, DocSection } from './DocLayout.jsx';

const SECTIONS = [
  { id: 'about', title: 'About these terms' },
  { id: 'eligibility', title: 'Who can use LocalFix' },
  { id: 'accounts', title: 'Your account' },
  { id: 'customers', title: 'Customer responsibilities' },
  { id: 'providers', title: 'Provider responsibilities' },
  { id: 'offers', title: 'Offers and hiring' },
  { id: 'payments', title: 'Payments' },
  { id: 'conduct', title: 'Prohibited conduct' },
  { id: 'reviews', title: 'Reviews' },
  { id: 'moderation', title: 'Moderation and suspension' },
  { id: 'liability', title: 'Limitation of liability' },
  { id: 'changes', title: 'Changes and contact' },
];

export default function Terms() {
  useDocumentTitle('Terms of service');
  return (
    <DocLayout
      title="Terms of service"
      intro="The rules for using LocalFix as a customer or a provider. Please read them before you post a request or send an offer."
      updated="6 October 2026"
      sections={SECTIONS}
    >
      <DocSection id="about" title="About these terms">
        <p>
          LocalFix is an online marketplace that connects people who need home or vehicle services with independent local providers. By creating an account or using the site you agree to these
          terms.
        </p>
        <p>
          LocalFix was built as a student group project for CS 313 Web Engineering. These terms demonstrate how a real marketplace would set its rules and are not a binding legal contract.
        </p>
      </DocSection>
      <DocSection id="eligibility" title="Who can use LocalFix">
        <ul>
          <li>You must be at least 18 years old.</li>
          <li>Providers must be legally allowed to offer the services they list and must complete identity verification before sending offers.</li>
          <li>One person may hold one customer account and one provider account at most.</li>
        </ul>
      </DocSection>
      <DocSection id="accounts" title="Your account">
        <ul>
          <li>Give accurate information, including a working email address and phone number.</li>
          <li>Keep your password private. You are responsible for activity on your account.</li>
          <li>Tell us straight away if you think someone else has used your account.</li>
        </ul>
      </DocSection>
      <DocSection id="customers" title="Customer responsibilities">
        <ul>
          <li>Describe the problem honestly and include accurate photos and location.</li>
          <li>Only accept an offer you intend to go ahead with, and be available at the agreed time.</li>
          <li>Provide a safe working environment and pay the agreed price when the work is done.</li>
        </ul>
      </DocSection>
      <DocSection id="providers" title="Provider responsibilities">
        <ul>
          <li>Send realistic prices and arrival times, and say clearly what is included.</li>
          <li>Do the work to a professional standard and honour any warranty you offer.</li>
          <li>Use customers' contact details only for the job you were hired for.</li>
        </ul>
      </DocSection>
      <DocSection id="offers" title="Offers and hiring">
        <p>
          An offer is an invitation to agree, not a binding contract. You may edit or withdraw an offer while the request is open. When a customer accepts an offer, the request is assigned to that
          provider and the other offers are declined automatically. The agreement for the work itself is between the customer and the provider.
        </p>
      </DocSection>
      <DocSection id="payments" title="Payments">
        <p>
          LocalFix does not process payments in this version. Customers pay providers directly. We recommend paying after the work is complete. Never send an advance payment outside what you agreed
          in your offer, and report anyone who asks you to.
        </p>
      </DocSection>
      <DocSection id="conduct" title="Prohibited conduct">
        <ul>
          <li>Posting fake requests, spam, advertising or job offers unrelated to a service request.</li>
          <li>Harassment, threats, discrimination or abusive language.</li>
          <li>Fake or paid reviews, or reviews about jobs that did not happen.</li>
          <li>Asking for payments or personal data under false pretences.</li>
          <li>Trying to access other accounts, scrape data or interfere with the site.</li>
        </ul>
      </DocSection>
      <DocSection id="reviews" title="Reviews">
        <p>
          Customers can review a provider once per completed job. Reviews must be honest and about the actual job. Providers may publish one public reply. We may hide reviews that break these terms,
          and hidden reviews do not count towards ratings.
        </p>
      </DocSection>
      <DocSection id="moderation" title="Moderation and suspension">
        <p>
          Anyone can report a provider, request, message or review. Our moderators may remove content, hide reviews, decline verification, or suspend accounts that break these terms. Suspended
          accounts are signed out immediately and their pending offers are withdrawn.
        </p>
      </DocSection>
      <DocSection id="liability" title="Limitation of liability">
        <p>
          LocalFix is a marketplace, not a service provider. Providers are independent and are not employees or agents of LocalFix. We verify identity documents but do not guarantee the quality,
          safety or legality of any work. To the extent permitted by law, LocalFix is not liable for losses arising from agreements between customers and providers.
        </p>
      </DocSection>
      <DocSection id="changes" title="Changes and contact">
        <p>
          We may update these terms and will show the new date at the top of this page. Questions? <Link to="/contact" className="font-semibold text-accent-text underline">Contact support</Link> or
          read our <Link to="/privacy" className="font-semibold text-accent-text underline">privacy policy</Link>.
        </p>
      </DocSection>
    </DocLayout>
  );
}
