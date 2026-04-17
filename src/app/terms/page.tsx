import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Terms of Service — DoppelPod",
  description: "Terms of Service for DoppelPod",
};

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: April 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-sm leading-relaxed text-foreground/80">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing or using DoppelPod ("the Service"), you agree to be bound by these Terms of
              Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">2. Description of Service</h2>
            <p>
              DoppelPod is an AI-powered content creation platform that allows users to clone their voice,
              generate written content, create AI avatar videos, and collaborate with AI writing tools.
              The Service is operated by Hapawire.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">3. User Accounts</h2>
            <p>
              You must create an account to access most features. You are responsible for maintaining the
              security of your account credentials. You must provide accurate information and keep it
              up to date. You may not share your account with others.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">4. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Create content that is illegal, defamatory, or harassing</li>
              <li>Impersonate another person or entity without their consent</li>
              <li>Generate spam, misinformation, or deceptive content</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Attempt to circumvent usage limits or security measures</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">5. Voice and Content Data</h2>
            <p>
              When you upload voice samples, images, or other content, you grant DoppelPod a limited
              license to process that content solely for providing the Service. You retain ownership of
              your original content. You represent that you have the rights to any content you upload.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">6. Subscriptions and Billing</h2>
            <p>
              Paid plans are billed monthly. Subscriptions renew automatically unless cancelled. You may
              cancel at any time; cancellation takes effect at the end of the current billing period.
              Refunds are not provided for partial billing periods except where required by law.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">7. Limitation of Liability</h2>
            <p>
              The Service is provided "as is." To the maximum extent permitted by law, DoppelPod and
              Hapawire are not liable for any indirect, incidental, or consequential damages arising from
              your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">8. Changes to Terms</h2>
            <p>
              We may update these Terms at any time. Continued use of the Service after changes are posted
              constitutes acceptance of the updated Terms. We will notify you of material changes by email.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">9. Contact</h2>
            <p>
              Questions about these Terms? Contact us at{" "}
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
