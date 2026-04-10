import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildWelcomeEmail } from "@/lib/welcome-email";
import { buildPaymentFailedEmail } from "@/lib/payment-failed-email";
import { buildActionRequiredEmail } from "@/lib/action-required-email";

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getEmailByCustomerId(supabase: SupabaseClient, customerId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("email, comms_email")
    .eq("stripe_customer_id", customerId)
    .single();
  return data ? (data.comms_email ?? data.email) : null;
}

async function sendEmail(to: string, template: { subject: string; html: string }) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;
  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: "DoppelPod <noreply@doppelpod.io>",
      to,
      subject: template.subject,
      html: template.html,
    });
    console.log(`[stripe-webhook] Email sent to ${to}: ${template.subject}`);
  } catch (err) {
    console.error(`[stripe-webhook] Email failed for ${to}:`, err);
  }
}

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

  // Verify webhook signature
  const stripe = new Stripe(stripeKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log("[stripe-webhook] Event verified:", event.type);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("[stripe-webhook] Supabase not configured");
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  // Idempotency — deduplicate retried events
  const { error: insertErr } = await supabase
    .from("stripe_events")
    .insert({ event_id: event.id });

  if (insertErr?.code === "23505") {
    // Already processed — return 200 to stop Stripe retrying
    console.log(`[stripe-webhook] Duplicate event ignored: ${event.id}`);
    return NextResponse.json({ received: true });
  }

  // --- checkout.session.completed ---
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerEmail = session.customer_email;
    const tier = session.metadata?.tier?.toLowerCase();
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

    if (customerEmail && tier) {
      // Update paid_tier and store stripe_customer_id
      const updates: Record<string, unknown> = { paid_tier: tier };
      if (customerId) updates.stripe_customer_id = customerId;

      const { data: updatedProfile, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("email", customerEmail)
        .select("comms_email")
        .single();

      if (error) {
        console.error("[stripe-webhook] Supabase update failed:", error.message);
      } else {
        const sendTo = updatedProfile?.comms_email ?? customerEmail;
        console.log(`[stripe-webhook] Updated ${customerEmail} paid_tier to: ${tier}`);
        await sendEmail(sendTo, buildWelcomeEmail(tier));
      }
    }
  }

  // --- invoice.payment_failed ---
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    let email = invoice.customer_email;
    const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

    if (!email && customerId) {
      email = await getEmailByCustomerId(supabase, customerId);
    }

    if (email) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.doppelpod.io";
      await sendEmail(email, buildPaymentFailedEmail(`${baseUrl}/dashboard`));
    }
  }

  // --- invoice.payment_action_required (3D Secure) ---
  if (event.type === "invoice.payment_action_required") {
    const invoice = event.data.object as Stripe.Invoice;
    let email = invoice.customer_email;
    const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    const hostedUrl = invoice.hosted_invoice_url;

    if (!email && customerId) {
      email = await getEmailByCustomerId(supabase, customerId);
    }

    if (email && hostedUrl) {
      await sendEmail(email, buildActionRequiredEmail(hostedUrl));
    }
  }

  return NextResponse.json({ received: true });
}
