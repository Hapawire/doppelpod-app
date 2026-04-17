import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Cookie Policy — DoppelPod",
  description: "Cookie Policy for DoppelPod",
};

export default function CookiePolicyPage() {
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
          <h1 className="text-3xl font-bold">Cookie Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: April 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed text-foreground/80">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">What Are Cookies?</h2>
            <p>
              Cookies are small text files stored in your browser when you visit a website. They help
              websites remember you and your preferences between visits.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Cookies We Use</h2>
            <p>DoppelPod uses only essential cookies required to operate the Service:</p>
            <div className="mt-4 overflow-hidden rounded-lg border border-border/50">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="px-4 py-2.5 text-left font-medium text-foreground">Cookie</th>
                    <th className="px-4 py-2.5 text-left font-medium text-foreground">Purpose</th>
                    <th className="px-4 py-2.5 text-left font-medium text-foreground">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/30">
                    <td className="px-4 py-2.5 font-mono text-purple-400">sb-*</td>
                    <td className="px-4 py-2.5">Authentication session (Supabase)</td>
                    <td className="px-4 py-2.5">Session / 7 days</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-purple-400">__stripe_*</td>
                    <td className="px-4 py-2.5">Fraud prevention during checkout (Stripe)</td>
                    <td className="px-4 py-2.5">Session</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">What We Do Not Use</h2>
            <p>We do not use:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Advertising or tracking cookies</li>
              <li>Third-party analytics cookies (e.g., Google Analytics)</li>
              <li>Social media tracking pixels</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Managing Cookies</h2>
            <p>
              Because we only use essential cookies, disabling them via your browser settings will prevent
              the Service from functioning correctly (you will not be able to stay logged in). You can
              clear cookies at any time through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Contact</h2>
            <p>
              Questions about our cookie practices? Email us at{" "}
              <a href="mailto:support@doppelpod.io" className="text-purple-400 hover:text-purple-300">
                support@doppelpod.io
              </a>
              .
            </p>
          </section>
        </div>

      </div>
      <SiteFooter />
    </div>
  );
}
