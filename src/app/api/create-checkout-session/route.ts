import { NextRequest, NextResponse } from "next/server";

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
      // Mock fallback — simulate successful checkout
      console.log("[checkout] No STRIPE_SECRET_KEY — returning mock session");
      return NextResponse.json({
        mock: true,
        tier,
        sessionId: `mock_session_${Date.now()}`,
        message: `Mock checkout for ${tier}. Add STRIPE_SECRET_KEY to enable real payments.`,
      });
    }

    // Real Stripe checkout session
    const origin = req.nextUrl.origin;

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        mode: "subscription",
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        success_url: `${origin}?checkout=success&tier=${tier}`,
        cancel_url: `${origin}?checkout=cancel`,
      }),
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
