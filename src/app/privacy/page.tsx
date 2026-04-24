import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Privacy Policy — DoppelPod",
  description: "Privacy Policy for DoppelPod",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-16">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to DoppelPod
          </Link>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: April 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed text-foreground/80">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">1. Who We Are</h2>
            <p>
              DoppelPod is operated by Hapawire. We are committed to protecting your personal information
              and your right to privacy. Questions? Contact us at{" "}
              <a href="mailto:support@doppelpod.io" className="text-purple-400 hover:text-purple-300">
                support@doppelpod.io
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">2. Information We Collect</h2>
            <p>We collect the following types of information:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                <strong className="text-foreground">Account information</strong> — email address, password
                (hashed), and subscription status
              </li>
              <li>
                <strong className="text-foreground">Content you provide</strong> — voice samples, photos,
                scripts, and generated outputs
              </li>
              <li>
                <strong className="text-foreground">Usage data</strong> — features used, generation counts,
                and session logs
              </li>
              <li>
                <strong className="text-foreground">Communications email</strong> — if different from your
                login, used for notifications and billing alerts
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Provide and improve the Service</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send transactional emails (account confirmations, billing, video completion)</li>
              <li>Send service updates and feature announcements (you may opt out at any time)</li>
              <li>Detect and prevent abuse or fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">4. Voice and Biometric Data</h2>
            <p>
              Voice samples you upload are processed by our AI voice provider (ElevenLabs) to create a
              voice clone used solely within your account. We do not sell, share, or use your voice data
              for any purpose other than providing the Service. You may delete your voice clone and all
              associated data at any time from your dashboard.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">5. Data Sharing</h2>
            <p>We share data only with trusted service providers necessary to operate the platform:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li><strong className="text-foreground">Supabase</strong> — database and authentication</li>
              <li><strong className="text-foreground">ElevenLabs</strong> — voice cloning</li>
              <li><strong className="text-foreground">HeyGen</strong> — AI avatar video generation</li>
              <li><strong className="text-foreground">Anthropic</strong> — AI writing (Claude Cowork)</li>
              <li><strong className="text-foreground">Stripe</strong> — payment processing</li>
              <li><strong className="text-foreground">Resend</strong> — transactional email delivery</li>
            </ul>
            <p className="mt-2">We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">6. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. If you delete your account, we
              will delete your personal data and generated content within 30 days, except where retention
              is required by law (e.g., billing records).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Access the data we hold about you (use the Export Data feature in your dashboard)</li>
              <li>Delete your account and all associated data</li>
              <li>Opt out of marketing emails at any time</li>
              <li>Request correction of inaccurate data</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">8. Cookies</h2>
            <p>
              We use essential cookies for authentication and session management. See our{" "}
              <Link href="/cookie-policy" className="text-purple-400 hover:text-purple-300">
                Cookie Policy
              </Link>{" "}
              for details.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes
              by email. Continued use of the Service after changes are posted constitutes acceptance.
            </p>
          </section>
        </div>

      </div>
      <SiteFooter />
    </div>
  );
}
