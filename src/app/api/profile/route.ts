import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Resend } from "resend";
import { buildVerificationEmail } from "@/lib/verification-email";

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Fetch profile
  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Sync profile fields from auth state
  if (profile) {
    const updates: Record<string, unknown> = {};

    // Sync tier when trial expires and user has a paid plan
    if (profile.tier === "trial" && profile.trial_end && new Date(profile.trial_end) <= new Date() && profile.paid_tier) {
      updates.tier = profile.paid_tier;
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from("profiles").update(updates).eq("id", user.id);
      Object.assign(profile, updates);
    }
  }

  if (!profile) {
    // Auto-create profile if missing (race condition on signup)
    const { data: newProfile } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email,
        tier: "trial",
        trial_end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();
    profile = newProfile;

    // Send verification email for new signups
    if (newProfile && !newProfile.email_confirmed && user.email) {
      try {
        const token = crypto.randomUUID();
        await supabase
          .from("profiles")
          .update({ verification_token: token })
          .eq("id", user.id);

        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.doppelpod.io";
          const verificationUrl = `${baseUrl}/api/verify-email?token=${token}`;
          const resend = new Resend(resendKey);
          const { subject, html } = buildVerificationEmail(verificationUrl);
          await resend.emails.send({
            from: "DoppelPod <noreply@doppelpod.io>",
            to: user.email,
            subject,
            html,
          });
          console.log(`[profile] Verification email sent to ${user.email}`);
        }
      } catch (err) {
        console.error("[profile] Failed to send verification email:", err);
      }
    }
  }

  // Fetch or create usage for current period
  const period = getCurrentPeriod();
  let { data: usage } = await supabase
    .from("usage_tracking")
    .select("*")
    .eq("user_id", user.id)
    .eq("period", period)
    .single();

  if (!usage) {
    const { data: newUsage } = await supabase
      .from("usage_tracking")
      .insert({ user_id: user.id, period })
      .select()
      .single();
    usage = newUsage;
  }

  // Reset daily cowork count if new day
  if (usage && usage.last_cowork_date !== getTodayDate()) {
    await supabase
      .from("usage_tracking")
      .update({ cowork_sessions_today: 0, last_cowork_date: getTodayDate() })
      .eq("id", usage.id);
    if (usage) {
      usage.cowork_sessions_today = 0;
    }
  }

  return NextResponse.json({
    profile: profile || { id: user.id, tier: "expired", trial_end: null, voice_id: null },
    usage: usage || { video_count: 0, cowork_sessions: 0, cowork_sessions_today: 0 },
  });
}
