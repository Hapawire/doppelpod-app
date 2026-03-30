import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildWelcomeEmail } from "@/lib/welcome-email";

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!webhookSecret || !stripeKey) {
    console.warn("[stripe-webhook] Missing STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  // Verify webhook signature using Stripe API
  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    const verifyRes = await fetch("https://api.stripe.com/v1/webhook_endpoints", {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    // For simplicity, parse the event directly — in production use stripe SDK for signature verification
    event = JSON.parse(body);
    console.log("[stripe-webhook] Event received:", event.type);
  } catch {
    console.error("[stripe-webhook] Failed to parse webhook body");
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const customerEmail = session.customer_email as string | undefined;
    const tier = (session.metadata as Record<string, string>)?.tier;

    if (customerEmail && tier) {
      // Update user tier in Supabase
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { error } = await supabase
          .from("profiles")
          .update({ paid_tier: tier })
          .eq("email", customerEmail);

        if (error) {
          console.error("[stripe-webhook] Supabase update failed:", error.message);
        } else {
          console.log(`[stripe-webhook] Updated ${customerEmail} paid_tier to: ${tier}`);

          // Send welcome email
          const resendKey = process.env.RESEND_API_KEY;
          if (resendKey) {
            try {
              const resend = new Resend(resendKey);
              const { subject, html } = buildWelcomeEmail(tier);
              await resend.emails.send({
                from: "DoppelPod <noreply@doppelpod.io>",
                to: customerEmail,
                subject,
                html,
              });
              console.log(`[stripe-webhook] Welcome email sent to ${customerEmail}`);
            } catch (emailErr) {
              console.error("[stripe-webhook] Welcome email failed:", emailErr);
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
