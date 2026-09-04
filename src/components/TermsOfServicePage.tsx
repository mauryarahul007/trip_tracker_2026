import { LegalPageLayout } from './LegalPageLayout';

export function TermsOfServicePage() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="September 4, 2026">
      <section>
        <h2>Acceptance of Terms</h2>
        <p>By creating an account or using Trip Tracker, you agree to these Terms of Service and our
          <a href="/privacy"> Privacy Policy</a>. If you don't agree, please don't use the app.</p>
      </section>

      <section>
        <h2>Description of Service</h2>
        <p>Trip Tracker is a tool for tracking and splitting shared trip expenses among a group. It is a
          record-keeping and calculation tool -- <strong>it is not a payment service, does not process
          transactions, and does not move money between users.</strong> Any settling up happens outside the
          app, between the people involved.</p>
      </section>

      <section>
        <h2>Eligibility</h2>
        <p>You must be at least 13 years old to create an account or use Trip Tracker.</p>
      </section>

      <section>
        <h2>Your Account</h2>
        <p>You're responsible for the activity that happens under your account and for keeping your sign-in
          credentials secure. Let us know right away if you suspect unauthorized access.</p>
      </section>

      <section>
        <h2>Your Content</h2>
        <p>You keep ownership of the trip and expense data, notes, and photos you add to the app ("your
          content"). By adding it, you give us permission to store, process, and display it back to you and to
          the other members of the trips you share it in -- that's what makes the app work. We don't use your
          content for anything beyond operating the service, as described in our Privacy Policy.</p>
      </section>

      <section>
        <h2>Acceptable Use</h2>
        <p>Don't use Trip Tracker to:</p>
        <ul>
          <li>Harass, abuse, or harm another member of a trip.</li>
          <li>Upload content you don't have the right to share, or that's unlawful, fraudulent, or misleading.</li>
          <li>Misuse the invite/QR join flow to gain access to a trip you weren't invited to.</li>
          <li>Attempt to disrupt, reverse engineer, or gain unauthorized access to the app or its infrastructure.</li>
        </ul>
        <p>We may suspend or terminate accounts that violate this section.</p>
      </section>

      <section>
        <h2>Expense Data Disclaimer</h2>
        <p>Expense amounts, splits, and balances are entered by you and your trip's members -- we don't verify
          their accuracy. Trip Tracker is a convenience tool, not a substitute for accounting, tax, or legal
          advice, and we're not responsible for disputes between trip members over who owes what.</p>
      </section>

      <section>
        <h2>Service Availability</h2>
        <p>Trip Tracker is built and maintained on a best-effort, indie-project basis. We don't guarantee
          uninterrupted availability, and offline mode is provided as a convenience, not a guarantee your data
          is backed up until it syncs.</p>
      </section>

      <section>
        <h2>Termination</h2>
        <p>You can stop using the app and request account deletion at any time (see our
          <a href="/privacy"> Privacy Policy</a>). We may suspend or terminate an account that violates these
          terms.</p>
      </section>

      <section>
        <h2>Intellectual Property</h2>
        <p>The Trip Tracker app, its design, and its underlying code belong to its developer. These terms
          don't grant you any rights to that beyond what's needed to use the app as intended.</p>
      </section>

      <section>
        <h2>Disclaimers &amp; Limitation of Liability</h2>
        <p>Trip Tracker is provided "as is," without warranties of any kind. To the extent permitted by law,
          we aren't liable for indirect, incidental, or consequential damages arising from your use of the
          app, including disputes over expense splits or data loss.</p>
      </section>

      <section>
        <h2>Governing Law</h2>
        <p>These terms are governed by the laws of India, without regard to conflict-of-law principles.</p>
      </section>

      <section>
        <h2>Changes to These Terms</h2>
        <p>If we make a material change, we'll update the date at the top of this page and, for significant
          changes, let you know in the app.</p>
      </section>

      <section>
        <h2>Contact Us</h2>
        <p>Questions about these terms: <a href="mailto:mauryarahul007@gmail.com">mauryarahul007@gmail.com</a></p>
      </section>
    </LegalPageLayout>
  );
}
