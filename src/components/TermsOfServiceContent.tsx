import { Link } from 'react-router-dom';

type Props = {
  onNavigate?: (screen: 'privacy' | 'terms') => void;
};

/** Shared Terms of Service body — used by the public /terms route and Settings About. */
export function TermsOfServiceContent({ onNavigate }: Props = {}) {
  const renderPrivacyLink = () => {
    if (onNavigate) {
      return (
        <button
          type="button"
          className="link-style-btn"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--primary-accent)',
            textDecoration: 'underline',
            cursor: 'pointer',
            font: 'inherit',
            display: 'inline',
          }}
          onClick={() => onNavigate('privacy')}
        >
          Privacy Policy
        </button>
      );
    }
    return <Link to="/privacy">Privacy Policy</Link>;
  };

  return (
    <>
      <section>
        <h2>Acceptance of Terms</h2>
        <p>By creating an account, signing in, joining a trip, or using Trip Tracker, you agree to be bound by these
          Terms of Service and our {renderPrivacyLink()}. If you do not agree to these terms, please do not use the application.</p>
      </section>

      <section>
        <h2>Description of Service &amp; Financial Disclaimers</h2>
        <p>Trip Tracker is a group record-keeping and mathematical expense-splitting utility designed to help travelers
          coordinate shared costs.</p>
        <p><strong>Not a Payment Service or Financial Intermediary:</strong> Trip Tracker is <strong>not a bank,
          payment aggregator, payment gateway, Non-Banking Financial Company (NBFC), or money transmitter</strong>. The
          application does not process payments, execute monetary transactions, hold funds, or transmit money between users.</p>
        <p><strong>UPI Deep Links &amp; QR Codes:</strong> The application may generate Unified Payments Interface (UPI)
          deep links and dynamic QR codes as a convenience to help users launch their own third-party banking or payment
          apps (such as Google Pay, PhonePe, Paytm, CRED, or BHIM). All payments take place entirely outside of Trip Tracker
          within your independent payment service provider. Trip Tracker does not verify payee identities, does not process
          or record bank transactions, has no access to bank accounts, cannot reverse any payment, and assumes zero liability
          for incorrect UPI IDs entered by users, failed transfers, or interpersonal settlement disputes.</p>
      </section>

      <section>
        <h2>Currency Conversion &amp; Exchange Rates Disclaimer</h2>
        <p>Foreign exchange rates displayed in the app are retrieved from public market feeds (Frankfurter API) and are
          provided strictly as indicative estimates for informational and travel-budgeting convenience. Market rates, credit
          card conversion fees, and bank settlement rates will differ. Trip Tracker does not guarantee exchange rate
          accuracy and is not liable for foreign currency discrepancies.</p>
      </section>

      <section>
        <h2>Eligibility &amp; Age of Majority</h2>
        <p>In India, in compliance with the Digital Personal Data Protection Act 2023, you must be at least 18 years of age
          or possess verifiable parental or legal guardian consent to create an account or use the service. In all other
          jurisdictions, you must be at least 13 years old (or 16 in the European Economic Area/UK). By using the service,
          you represent and warrant that you meet these eligibility requirements.</p>
      </section>

      <section>
        <h2>Your Account &amp; Security</h2>
        <p>You are responsible for safeguarding your login credentials and for all activities that occur under your account.
          You agree to notify us immediately if you suspect any unauthorized access to or compromise of your account.</p>
      </section>

      <section>
        <h2>User-Generated Content &amp; Zero-Tolerance Policy (Apple Guideline 1.2)</h2>
        <p>Users may post expenses, notes, chat messages, and receipt photos ("User Content"). You retain ownership of your
          content, but grant Trip Tracker a limited license to store, process, and display it to members of your shared trips.</p>
        <p><strong>Zero Tolerance for Objectionable Content:</strong> Trip Tracker maintains a strict zero-tolerance policy
          towards objectionable, abusive, or harmful material. You strictly agree not to post, upload, or transmit any content
          that is:</p>
        <ul>
          <li>Defamatory, harassing, threatening, abusive, stalking, or discriminatory against any individual or group.</li>
          <li>Sexually explicit, pornographic, obscene, or promoting sexual violence.</li>
          <li>Promoting illegal acts, fraudulent schemes, or violence.</li>
          <li>Infringing on any third party's intellectual property, privacy, or publicity rights.</li>
        </ul>
        <p><strong>Reporting &amp; Takedown:</strong> If you encounter objectionable content or abusive behavior within a
          trip, report it immediately to our moderation team at <a href="mailto:mauryarahul007@gmail.com">mauryarahul007@gmail.com</a>.
          We review all reports within 24 hours, remove objectionable content, and terminate or eject offending users.</p>
      </section>

      <section>
        <h2>Expense &amp; Tax Disclaimer</h2>
        <p>Expense amounts, categories, and split calculations are entered directly by you and your trip members. We do not
          audit or verify their accuracy. Trip Tracker is not an accounting, tax, or legal advisor, does not generate tax
          invoices, and is not responsible for settling financial disagreements among trip members.</p>
      </section>

      <section>
        <h2>Service Availability &amp; Offline Mode</h2>
        <p>Trip Tracker is provided on an "as is" and "as available" basis. While offline mode allows caching on your device,
          we do not guarantee uninterrupted availability or that offline data will remain preserved in the event of device
          loss or un-synced browser cache clearance.</p>
      </section>

      <section>
        <h2>Account Deletion &amp; Termination</h2>
        <p>You may terminate your account at any time via <strong>Settings &rarr; Delete Account</strong> or through our
          public deletion portal at <Link to="/delete-account">trip-tracker.blackmaroon.in/delete-account</Link>. We reserve
          the right to suspend or permanently ban any account that violates these Terms of Service.</p>
      </section>

      <section>
        <h2>Intellectual Property &amp; Map Data</h2>
        <p>Trip Tracker, its branding, interface design, and underlying code are proprietary to its developer. Map data,
          routing lines, and map tiles are provided by OpenStreetMap contributors under the Open Database License (ODbL).</p>
      </section>

      <section>
        <h2>Disclaimers &amp; Limitation of Liability</h2>
        <p>To the maximum extent permitted by applicable law, Trip Tracker and its developer shall not be liable for any
          indirect, incidental, consequential, or punitive damages, including loss of data, travel disruptions, interpersonal
          disputes, or financial losses arising from your use of the application.</p>
      </section>

      <section>
        <h2>Governing Law &amp; Dispute Resolution</h2>
        <p>These Terms shall be governed by and construed in accordance with the laws of India, with exclusive jurisdiction
          vested in the competent courts of New Delhi, India, without regard to conflict-of-law provisions.</p>
      </section>

      <section>
        <h2>Contact &amp; Grievance Redressal</h2>
        <p>For questions, legal inquiries, or user grievances regarding these Terms of Service, contact our Grievance Officer:
          <br />
          <strong>Email:</strong> <a href="mailto:mauryarahul007@gmail.com">mauryarahul007@gmail.com</a>
        </p>
      </section>
    </>
  );
}

export const TERMS_OF_SERVICE_UPDATED = 'September 20, 2026';
