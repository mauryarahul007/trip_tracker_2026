import { Link } from 'react-router-dom';

type Props = {
  onNavigate?: (screen: 'privacy' | 'terms') => void;
};

/** Shared Privacy Policy body — used by the public /privacy route and Settings About. */
export function PrivacyPolicyContent({ onNavigate }: Props = {}) {
  const renderTermsLink = () => {
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
          onClick={() => onNavigate('terms')}
        >
          Terms of Service
        </button>
      );
    }
    return <Link to="/terms">Terms of Service</Link>;
  };

  return (
    <>
      <section>
        <h2>Overview</h2>
        <p>
          Trip Tracker is a group expense-tracking application designed to help travelers log shared expenses,
          calculate fair splits, and see balances. It does not move money: no payments are processed, and no
          bank accounts, credit cards, or financial credentials are collected or held. This policy explains what
          data we collect, how it is used, where it is stored, and your rights under applicable privacy laws.
        </p>
      </section>

      <section>
        <h2>Information We Collect</h2>
        <p><strong>Account information.</strong> When you sign in with Google, we receive your name, email
          address, and profile photo. We use this to create your account and identify you to other members
          of your trips.</p>
        <p><strong>Trip and expense data.</strong> Trip names, dates, destinations, expense entries, amounts,
          categories, notes, and how each expense is split between members. This information is visible to the
          other members of trips you join.</p>
        <p><strong>Receipt photos &amp; on-device OCR.</strong> If you attach a receipt to an expense, the image is
          stored in our secure cloud storage. If you use the receipt scanner, optical character recognition (OCR)
          is performed entirely on your device using client-side WebAssembly (Tesseract.js). Receipt images and text
          are never shared with third-party AI or machine learning models.</p>
        <p><strong>Document Vault (passports, visas, IDs).</strong> If you store scans of travel documents
          (passports, visas, insurance, or national ID cards) in the Document Vault, these files are saved
          <strong> strictly in your local device storage (IndexedDB)</strong>. They are <strong>never uploaded to or
          stored on our cloud servers</strong>, and are accessible only on your device, optionally protected by
          biometric screen lock.</p>
        <p><strong>Location data &amp; live location sharing.</strong> If you tag an expense with a location, view a
          trip map, or resolve place names, coordinates are used to render routes and contextual information. If you
          explicitly enable Live Location Sharing for a trip, your device broadcasts foreground GPS coordinates to the
          other members of that specific trip via a live heartbeat. Location sharing can be stopped at any time.</p>
        <p><strong>Device Contacts (optional).</strong> If you use the "Invite from Contacts" feature in the Share
          Trip modal, the app uses your operating system's contact picker so you can choose a recipient for a trip invite
          link. We receive only the contact name and phone number you explicitly select to compose the invite message.
          We never upload, scan, or store your address book.</p>
        <p><strong>Biometric credentials.</strong> If you enable Biometric Screen Lock, authentication is performed
          locally on your device by the operating system via standard W3C WebAuthn. Biometric measurements (fingerprints,
          Face ID) remain in your device hardware enclave and are never accessible to Trip Tracker or transmitted over
          the network.</p>
        <p><strong>Push notification tokens.</strong> If you opt in to notifications, a device token is assigned to
          deliver alerts regarding new expenses, settlements, and invites. It is not used for any other purpose.</p>
        <p><strong>Diagnostic &amp; crash data.</strong> If an error occurs, an automated technical report containing
          the error message, stack trace, and browser/device environment is logged to help us fix the bug. Diagnostic logs
          never contain personal expense amounts, receipt photos, or document scans.</p>
        <p><strong>Locally stored data.</strong> Trip data and preferences are cached on your device (LocalStorage and
          IndexedDB) so the application functions seamlessly offline. Local data syncs back to your account when an
          internet connection is available.</p>
      </section>

      <section>
        <h2>How We Use Your Information</h2>
        <ul>
          <li>To operate core features: tracking, splitting, and synchronizing trip expenses with your group.</li>
          <li>To display maps, routes, weather context, and location details for trips.</li>
          <li>To deliver push notifications and live alerts you have explicitly enabled.</li>
          <li>To diagnose, resolve, and prevent technical bugs and application crashes.</li>
          <li>To maintain basic aggregate usage metrics (e.g. total trip count) for product development.</li>
        </ul>
        <p>We do not sell your personal data, and we do not use your information for targeted advertising.</p>
      </section>

      <section>
        <h2>Third Parties &amp; Sub-Processors</h2>
        <p>We work with trusted third-party service providers to deliver the app. Each receives only the minimum data
          necessary to fulfill its role:</p>
        <ul>
          <li><strong>Supabase</strong> -- provides secure cloud database hosting, authentication, and encrypted object storage for receipt photos.</li>
          <li><strong>Google Identity</strong> -- provides secure user sign-in (OAuth). See Google User Data below.</li>
          <li><strong>Push notification services (FCM &amp; Web Push)</strong> -- delivers alerts to your device via your device push token.</li>
          <li><strong>Open-Meteo &amp; Komoot Photon</strong> -- provides weather forecasts and place search suggestions. Requests send search terms or coordinates; no personal identifiers are shared.</li>
          <li><strong>OpenStreetMap &amp; OSRM</strong> -- renders map tiles and calculates overland travel routes. Map data is &copy; OpenStreetMap contributors (ODbL).</li>
          <li><strong>Frankfurter API</strong> -- provides public exchange rate reference data for foreign currency conversions.</li>
          <li><strong>Cloudflare Turnstile</strong> -- provides privacy-preserving bot detection and CAPTCHA verification to protect accounts against automated abuse.</li>
        </ul>
      </section>

      <section>
        <h2>Google User Data &amp; Limited Use</h2>
        <p>Trip Tracker's use and transfer to any other app of information received from Google APIs adheres to the
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer"> Google API Services User Data Policy</a>,
          including the Limited Use requirements. Your Google account profile is used exclusively to identify you to your
          trip companions, and is never sold, transferred to data brokers, or used to train AI models.</p>
      </section>

      <section>
        <h2>Data Retention &amp; Right to Erasure</h2>
        <p>We retain your account data for as long as your account is active. When you delete a trip or expense, it is
          moved to a temporary recycle bin for accidental recovery and permanently purged thereafter. When you delete your
          account via <strong>Settings &rarr; Delete Account</strong> or our public deletion portal at{' '}
          <Link to="/delete-account">trip-tracker.blackmaroon.in/delete-account</Link>, all trips you own, profile records,
          push registrations, and local client-side vaults are permanently wiped.</p>
      </section>

      <section>
        <h2>Children's Privacy &amp; Age of Majority</h2>
        <p>Trip Tracker is not directed to children, and usage is subject to our {renderTermsLink()}. In India, in compliance with the Digital Personal Data Protection Act
          2023, users must be at least 18 years of age or possess verifiable parental or legal guardian consent. In other
          jurisdictions, users must be at least 13 years old (or 16 in the European Economic Area and UK). We do not knowingly
          collect personal data from children below these ages. If you believe a child has provided us data, please contact
          our Grievance Officer and we will promptly delete it.</p>
      </section>

      <section>
        <h2>Data Security</h2>
        <p>All data transmitted between your device and our servers is encrypted in transit using industry-standard TLS
          (HTTPS) with 256-bit encryption, and stored in secure, encrypted cloud databases. Access to production systems is
          strictly restricted. Sensitive document vault scans remain strictly on your local device.</p>
      </section>

      <section>
        <h2>International Data Transfers</h2>
        <p>Our cloud infrastructure is hosted with global providers (such as Supabase). When data is processed across
          borders, we rely on established legal safeguards, including Standard Contractual Clauses (SCCs), to protect
          your information.</p>
      </section>

      <section>
        <h2>India -- Digital Personal Data Protection Act (DPDP Act 2023)</h2>
        <p>For users in India, we process personal data in accordance with the Digital Personal Data Protection Act 2023.
          You have the right to access a summary of your personal data, request correction or erasure of your data, nominate
          an individual in the event of death or incapacity, and access grievance redressal as detailed below.</p>
      </section>

      <section>
        <h2>Grievance Redressal Officer &amp; Contact Information</h2>
        <p>In accordance with the Information Technology Act, IT Rules 2021, and the DPDP Act 2023, the designated Grievance
          Redressal Officer for Trip Tracker is:</p>
        <p style={{ margin: '8px 0', lineHeight: 1.6 }}>
          <strong>Name:</strong> Rahul Maurya<br />
          <strong>Designation:</strong> Grievance Redressal Officer &amp; Privacy Lead<br />
          <strong>Email:</strong> <a href="mailto:mauryarahul007@gmail.com">mauryarahul007@gmail.com</a><br />
          <strong>Location:</strong> New Delhi, India<br />
          <strong>Grievance Resolution Timeline:</strong> Grievances and data deletion requests are acknowledged and resolved within 30 days.
        </p>
      </section>

      <section>
        <h2>Changes to This Policy</h2>
        <p>If we make material changes to this Privacy Policy, we will update the date at the top of this document and provide
          prominent notice within the application.</p>
      </section>
    </>
  );
}

export const PRIVACY_POLICY_UPDATED = 'September 20, 2026';
