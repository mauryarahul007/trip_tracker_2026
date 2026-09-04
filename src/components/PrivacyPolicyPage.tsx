import { LegalPageLayout } from './LegalPageLayout';

export function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="September 4, 2026">
      <section>
        <h2>Overview</h2>
        <p>
          Trip Tracker is a group expense-tracking app -- it helps travelers log shared expenses and see who
          owes whom. It does not move money: no payments are processed, and no bank or card details are
          collected. This policy explains what data we do collect, why, and what control you have over it.
        </p>
      </section>

      <section>
        <h2>Information We Collect</h2>
        <p><strong>Account information.</strong> When you sign in with Google, we receive your name, email
          address, and profile photo. We use this to create your account and identify you to other members
          of your trips.</p>
        <p><strong>Trip and expense data.</strong> Trip names, dates, destinations, expense entries, amounts,
          categories, notes, and how each expense is split between members. This is the core content of the
          app -- it exists so the app can work, and is visible to the other members of a trip you belong to.</p>
        <p><strong>Receipt photos.</strong> If you attach a receipt to an expense, we store the photo you
          capture or select from your gallery. This is optional -- expenses can be logged without a photo.</p>
        <p><strong>Location data.</strong> If you tag an expense's location or view a trip's map, we store the
          coordinates involved and use them to render maps and route lines. Location access is requested only
          when you use a location-specific feature, never in the background.</p>
        <p><strong>Push notification token.</strong> If you enable notifications, your device is assigned a
          token so we can deliver alerts (new expenses, settlement reminders, invites). We don't use this
          token for anything beyond sending you notifications you've opted into.</p>
        <p><strong>Diagnostic and crash data.</strong> If the app crashes or hits an unexpected error, a report
          containing the error message, stack trace, and basic device/browser info is sent automatically so we
          can fix it. This never includes your expense amounts or photos.</p>
        <p><strong>Locally stored data.</strong> Trip and expense data is cached on your device (browser
          local storage, or IndexedDB for offline receipt photos) so the app keeps working without a
          connection. This local copy stays on your device and syncs back to your account when you're online.</p>
      </section>

      <section>
        <h2>How We Use Your Information</h2>
        <ul>
          <li>To operate the core features of the app -- tracking, splitting, and syncing trip expenses across your devices and trip members.</li>
          <li>To show maps, weather, and location context for a trip.</li>
          <li>To send notifications you've explicitly enabled.</li>
          <li>To diagnose and fix bugs and crashes.</li>
          <li>To maintain basic aggregate usage statistics (e.g. how many trips or expenses exist in total) for our own product decisions -- this is not tied back to an identifiable person in anything we act on.</li>
        </ul>
        <p>We do not sell your personal information, and we do not use your data for advertising.</p>
      </section>

      <section>
        <h2>Third Parties We Work With</h2>
        <p>We use a small number of service providers to run the app. Each only receives the data it needs to
          do its specific job:</p>
        <ul>
          <li><strong>Supabase</strong> -- hosts our database, authentication, and file storage (including receipt photos).</li>
          <li><strong>Google</strong> -- provides sign-in (OAuth). See "Google User Data" below.</li>
          <li><strong>Push notification delivery</strong> -- delivers alerts to your device via your device token.</li>
          <li><strong>Open-Meteo</strong> -- a public weather API used to show forecasts for a trip's destination. We send only the coordinates needed for a forecast, nothing that identifies you.</li>
          <li><strong>Map tile provider (MapLibre)</strong> -- renders the map tiles shown on trip maps.</li>
        </ul>
        <p>None of these providers are permitted to use your data for their own purposes beyond providing the
          service to us.</p>
      </section>

      <section>
        <h2>Google User Data &amp; Limited Use</h2>
        <p>Trip Tracker's use of information received from Google APIs adheres to the
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer"> Google API Services User Data Policy</a>,
          including the Limited Use requirements. Your Google account data (name, email, profile photo) is
          used solely to run the sign-in feature of this app -- it is never used to train any AI or machine
          learning model, and it is never sold or shared for advertising.</p>
      </section>

      <section>
        <h2>Data Retention</h2>
        <p>We keep your data for as long as your account is active. If you delete a trip or an expense, it's
          removed from active use (a short-lived recycle bin may retain it briefly so you can undo an accidental
          delete). If you delete your account, your personal data is deleted or anonymized within a reasonable
          period, except where we're required to retain something by law.</p>
      </section>

      <section>
        <h2>Your Rights &amp; Account Deletion</h2>
        <p>You can access, correct, or export your trip and expense data at any time from within the app.
          To delete your account, go to <strong>Settings &rarr; Delete Account</strong> in the app, or visit
          <a href="/delete-account"> trip-tracker.blackmaroon.in/delete-account</a> from any browser -- no
          install required. Deleting your account also deletes every trip you own; see that page for the
          full detail.</p>
      </section>

      <section>
        <h2>Children's Privacy</h2>
        <p>Trip Tracker is not directed at children, and you must be at least 13 years old to use it (see our
          <a href="/terms"> Terms of Service</a>). We do not knowingly collect personal information from anyone
          under 13. If you believe a child has provided us data, contact us and we'll remove it.</p>
      </section>

      <section>
        <h2>Data Security</h2>
        <p>Data is encrypted in transit between your device and our servers. Access to production data is
          restricted to what's needed to operate and support the app. No system is perfectly secure, but we
          take reasonable, industry-standard steps to protect your information.</p>
      </section>

      <section>
        <h2>International Data Transfers</h2>
        <p>Our infrastructure providers may process data in countries other than your own. Where that happens,
          we rely on our providers' own safeguards (such as standard contractual clauses) for cross-border
          transfers.</p>
      </section>

      <section>
        <h2>India -- Digital Personal Data Protection Act</h2>
        <p>For users in India, we process personal data only for the specific purposes described in this
          policy, retain it only as long as needed for those purposes, and you may withdraw consent or request
          deletion at any time using the contact details below.</p>
      </section>

      <section>
        <h2>Changes to This Policy</h2>
        <p>If we make a material change to this policy, we'll update the date at the top of this page and, for
          significant changes, let you know in the app.</p>
      </section>

      <section>
        <h2>Contact Us</h2>
        <p>Questions, requests, or concerns about this policy: <a href="mailto:mauryarahul007@gmail.com">mauryarahul007@gmail.com</a></p>
      </section>
    </LegalPageLayout>
  );
}
