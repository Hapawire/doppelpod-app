import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { tier, priceId } = await req.json();

    if (!tier || !priceId) {
      return NextResponse.json(
        { error: "Missing tier or priceId." },
        { status: 400 }
      );
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      // Mock fallback — simulate successful checkout + update profile
      console.log("[checkout] No STRIPE_SECRET_KEY — returning mock session");

      // Update the user's tier in Supabase for mock flow
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const tierLower = tier.toLowerCase();
        await supabase
          .from("profiles")
          .update({ tier: tierLower })
          .eq("id", user.id);
        console.log(`[checkout] Mock: updated ${user.email} to tier: ${tierLower}`);
      }

      return NextResponse.json({
        mock: true,
        tier,
        sessionId: `mock_session_${Date.now()}`,
        message: `Mock checkout for ${tier}. Add STRIPE_SECRET_KEY to enable real payments.`,
      });
    }

    // Real Stripe checkout session — require auth
    const supabaseReal = await createServerSupabaseClient();
    const { data: { user: stripeUser } } = await supabaseReal.auth.getUser();
    if (!stripeUser) {
      return NextResponse.json(
        { error: "You must be signed in to subscribe." },
        { status: 401 }
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
