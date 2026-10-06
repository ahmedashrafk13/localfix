import { Link } from 'react-router';
import { useDocumentTitle } from '../../lib/hooks.js';
import { DocLayout, DocSection } from './DocLayout.jsx';

const SECTIONS = [
  { id: 'summary', title: 'In short' },
  { id: 'collect', title: 'What we collect and why' },
  { id: 'visibility', title: 'Who can see what' },
  { id: 'cookies', title: 'Cookies and local storage' },
  { id: 'security', title: 'How we protect data' },
  { id: 'retention', title: 'How long we keep data' },
  { id: 'rights', title: 'Your rights' },
  { id: 'contact', title: 'Contact' },
];

const DATA = [
  ['Name, email, phone number and password', 'When you register', 'To create your account, send notifications and let the person you hire contact you. Passwords are stored only as bcrypt hashes.'],
  ['Request details: category, description, location and photos', 'When you post a request', 'To show your request to matching providers. Photos are re-encoded and their location metadata removed.'],
  ['Offers: price, arrival time and details', 'When a provider sends an offer', 'So customers can compare offers and decide.'],
  ['Provider profile: services, areas, experience, certifications, availability and work photos', 'When a provider completes their profile', 'For the public profile, search and matching.'],
  ['CNIC number and ID document photo', 'When a provider applies for verification', 'To verify identity. Only the last 4 digits are kept on the account, and the document is visible to admins only.'],
  ['Chat messages', 'When you send a message', 'To let you negotiate, and as a record if there is a dispute or report.'],
  ['Ratings and reviews', 'After a completed job', 'For provider reputation and quality control.'],
  ['Anonymous usage analytics: page views and searches', 'Automatically', 'To improve the platform. No IP address or user id is stored, only the type of visitor, and the data is deleted after 180 days.'],
];

export default function Privacy() {
  useDocumentTitle('Privacy policy');
  return (
    <DocLayout title="Privacy policy" intro="What data LocalFix collects, why, who can see it and how you stay in control." updated="6 October 2026" sections={SECTIONS}>
      <DocSection id="summary" title="In short">
        <ul>
          <li>We collect only what the marketplace needs to work.</li>
          <li>Your exact address and phone number are shared only with the provider you hire.</li>
          <li>We do not sell your data or show third-party advertising.</li>
          <li>You can download all your data or delete your account from Account settings at any time.</li>
        </ul>
        <p>LocalFix is a student project for CS 313 Web Engineering, so this policy is a demonstration of good practice.</p>
      </DocSection>
      <DocSection id="collect" title="What we collect and why">
        <div className="not-prose -mx-1 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-separate border-spacing-0 overflow-hidden rounded-2xl border border-line text-left text-sm">
            <caption className="sr-only">Data collected by LocalFix</caption>
            <thead className="bg-surface-2 text-ink">
              <tr>
                <th scope="col" className="border-b border-line px-4 py-3 font-semibold">Data</th>
                <th scope="col" className="border-b border-line px-4 py-3 font-semibold">When</th>
                <th scope="col" className="border-b border-line px-4 py-3 font-semibold">Why</th>
              </tr>
            </thead>
            <tbody className="text-ink-2">
              {DATA.map(([what, when, why]) => (
                <tr key={what}>
                  <th scope="row" className="border-b border-line px-4 py-3 align-top font-medium text-ink">{what}</th>
                  <td className="border-b border-line px-4 py-3 align-top">{when}</td>
                  <td className="border-b border-line px-4 py-3 align-top">{why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocSection>
      <DocSection id="visibility" title="Who can see what">
        <ul>
          <li>Anyone can see open requests with the area, an approximate map circle and the customer's first name and initial.</li>
          <li>Only the hired provider sees the customer's full name, exact address and phone number.</li>
          <li>Customers see the providers who bid on their request, with their public profile, rating and offers.</li>
          <li>Chat messages are visible only to the two people in the conversation, and to moderators if a message is reported.</li>
          <li>Admins can see account details, reports and verification documents to run and protect the marketplace.</li>
        </ul>
      </DocSection>
      <DocSection id="cookies" title="Cookies and local storage">
        <p>We use one cookie: an httpOnly session cookie that keeps you signed in. It cannot be read by scripts on the page and expires after 12 hours of inactivity.</p>
        <p>We also use your browser's local storage, which stays on your device, for three conveniences: your light or dark theme choice, the draft of a request you have not posted yet, and your recent searches.</p>
      </DocSection>
      <DocSection id="security" title="How we protect data">
        <ul>
          <li>HTTPS encryption in production, plus security headers such as a Content Security Policy.</li>
          <li>Passwords hashed with bcrypt, and sessions invalidated when you change your password.</li>
          <li>Role-based access control on every API endpoint.</li>
          <li>Server-side validation of every input, protection against NoSQL injection, and rate limiting.</li>
          <li>Uploaded images re-encoded and stripped of metadata. ID documents kept outside the public folder.</li>
        </ul>
      </DocSection>
      <DocSection id="retention" title="How long we keep data">
        <p>
          We keep your account data while your account is open. Anonymous analytics are deleted automatically after 180 days. When you delete your account, your profile, photos and notifications are
          deleted straight away. Completed-job records and reviews are kept without your name so other users' histories stay accurate.
        </p>
      </DocSection>
      <DocSection id="rights" title="Your rights">
        <ul>
          <li>Access and portability: download everything we hold about you from Account settings.</li>
          <li>Correction: edit your profile at any time.</li>
          <li>Deletion: delete your account from Account settings.</li>
          <li>Objection: contact us if you disagree with how your data is used.</li>
        </ul>
      </DocSection>
      <DocSection id="contact" title="Contact">
        <p>
          Questions about privacy? Email support@localfix.test or use the <Link to="/contact" className="font-semibold text-accent-text underline">contact form</Link>.
        </p>
      </DocSection>
    </DocLayout>
  );
}
