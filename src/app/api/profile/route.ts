import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

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
