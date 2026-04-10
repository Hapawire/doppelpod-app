import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const { tier, priceId } = await req.json();

    if (!tier || !priceId) {
      return NextResponse.json(
        { error: "Missing tier or priceId." },
        { status: 400 }
      );
    }

    // Validate tier is a purchasable value — reject anything else
    const VALID_TIERS = ["pro", "elite"] as const;
    if (!VALID_TIERS.includes(tier)) {
      return NextResponse.json({ error: "Invalid tier." }, { status: 400 });
    }

    // Validate priceId format (Stripe price IDs start with "price_")
    if (typeof priceId !== "string" || !priceId.startsWith("price_")) {
      return NextResponse.json({ error: "Invalid priceId." }, { status: 400 });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      console.error("[checkout] STRIPE_SECRET_KEY is not configured");
      return NextResponse.json({ error: "Payment processing is not available." }, { status: 503 });
    }

    // Stripe checkout session — require auth
    const supabaseReal = await createServerSupabaseClient();
    const { data: { user: stripeUser } } = await supabaseReal.auth.getUser();
    if (!stripeUser) {
      return NextResponse.json(
        { error: "You must be signed in to subscribe." },
        { status: 401 }
      );
    }

    // Rate limit: 10 checkout attempts per hour per user
    const rl = checkRateLimit(`checkout:${stripeUser.id}`, 10, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again." },
        { status: 429 }
      );
    }

    const origin = req.nextUrl.origin;

    const params: Record<string, string> = {
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${origin}/success?tier=${tier}`,
      cancel_url: `${origin}?checkout=cancel`,
      "metadata[tier]": tier,
    };

    if (stripeUser.email) {
      params.customer_email = stripeUser.email;
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[checkout] Stripe error:", res.status, errText);
      return NextResponse.json(
        { error: `Stripe error: ${res.status}` },
        { status: res.status }
      );
    }

    const session = await res.json();
    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[checkout] Error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}
