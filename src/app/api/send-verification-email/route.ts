import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Resend } from "resend";
import { buildVerificationEmail } from "@/lib/verification-email";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check if already confirmed
  const { data: profile } = await supabase
    .from("profiles")
    .select("email_confirmed")
    .eq("id", user.id)
    .single();

  if (profile?.email_confirmed) {
    return NextResponse.json({ already_confirmed: true });
  }

  // Generate token and store it
  const token = crypto.randomUUID();
  await supabase
    .from("profiles")
    .update({ verification_token: token })
    .eq("id", user.id);

  // Send email
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log("[verify] No RESEND_API_KEY — skipping email send");
    return NextResponse.json({ sent: false, reason: "no_api_key" });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.doppelpod.io";
  const verificationUrl = `${baseUrl}/api/verify-email?token=${token}`;

  try {
    const resend = new Resend(resendKey);
    const { subject, html } = buildVerificationEmail(verificationUrl);
    await resend.emails.send({
      from: "DoppelPod <noreply@doppelpod.io>",
      to: user.email!,
      subject,
      html,
    });
    console.log(`[verify] Verification email sent to ${user.email}`);
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[verify] Failed to send verification email:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
