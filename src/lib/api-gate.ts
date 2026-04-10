import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { getEffectiveTier, TIER_LIMITS, type TierName } from "./tiers";

function getAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

type Feature = "voice" | "video" | "cowork";

interface AccessResult {
  allowed: boolean;
  error?: string;
  effectiveTier: TierName;
  profile: Record<string, unknown> | null;
  usage: Record<string, unknown> | null;
  coworkVoiceChat?: boolean;
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export async function checkFeatureAccess(
  supabase: SupabaseClient,
  userId: string,
  feature: Feature
): Promise<AccessResult> {
  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return {
      allowed: false,
      error: "Profile not found. Please log in again.",
      effectiveTier: "expired",
      profile: null,
      usage: null,
    };
  }

  // Check email confirmation
  if (!profile.email_confirmed) {
    return {
      allowed: false,
      error: "Please confirm your email before using this feature. Check your inbox for a confirmation link.",
      effectiveTier: "expired",
      profile,
      usage: null,
    };
  }

  const effectiveTier = getEffectiveTier(profile);
  const limits = TIER_LIMITS[effectiveTier];

  // Basic feature access check
  if (feature === "voice" && !limits.voice) {
    return {
      allowed: false,
      error: "Voice generation requires a Pro or Elite plan. Upgrade to continue.",
      effectiveTier,
      profile,
      usage: null,
    };
  }

  if (feature === "video" && !limits.video) {
    return {
      allowed: false,
      error: "Video generation requires a Pro or Elite plan. Upgrade to continue.",
      effectiveTier,
      profile,
      usage: null,
    };
  }

  if (feature === "cowork" && !limits.cowork) {
    return {
      allowed: false,
      error: "Claude Cowork requires a Pro or Elite plan. Upgrade to continue.",
      effectiveTier,
      profile,
      usage: null,
    };
  }

  // Fetch/create usage for current period
  const period = getCurrentPeriod();
  let { data: usage } = await supabase
    .from("usage_tracking")
    .select("*")
    .eq("user_id", userId)
    .eq("period", period)
    .single();

  if (!usage) {
    const { data: newUsage } = await supabase
      .from("usage_tracking")
      .insert({ user_id: userId, period })
      .select()
      .single();
    usage = newUsage;
  }

  if (!usage) {
    // If still no usage row, allow but skip limit checks
    return { allowed: true, effectiveTier, profile, usage: null, coworkVoiceChat: limits.coworkVoiceChat };
  }

  // Reset daily cowork count if new day — admin client (UPDATE removed from user RLS)
  const today = getTodayDate();
  if (usage.last_cowork_date !== today) {
    await getAdmin()
      .from("usage_tracking")
      .update({ cowork_sessions_today: 0, last_cowork_date: today })
      .eq("id", usage.id);
    usage.cowork_sessions_today = 0;
    usage.last_cowork_date = today;
  }

  // Check usage limits
  if (feature === "video" && limits.videoLimit !== null) {
    if (usage.video_count >= limits.videoLimit) {
      return {
        allowed: false,
        error: `You've used all ${limits.videoLimit} videos this month. Upgrade to Elite for unlimited videos.`,
        effectiveTier,
        profile,
        usage,
      };
    }
  }

  if (feature === "cowork" && limits.coworkDailyLimit !== null) {
    if (usage.cowork_sessions_today >= limits.coworkDailyLimit) {
      return {
        allowed: false,
        error: `You've used all ${limits.coworkDailyLimit} Cowork sessions today. Upgrade to Elite for unlimited sessions.`,
        effectiveTier,
        profile,
        usage,
      };
    }
  }

  return {
    allowed: true,
    effectiveTier,
    profile,
    usage,
    coworkVoiceChat: limits.coworkVoiceChat,
  };
}

export async function incrementUsage(
  supabase: SupabaseClient,
  userId: string,
  feature: "video" | "cowork"
) {
  const period = getCurrentPeriod();
  const today = getTodayDate();

  // All usage increments use service role — UPDATE policy removed from user RLS
  const admin = getAdmin();

  // Atomic upsert via DB function — eliminates read-then-write race condition
  if (feature === "video") {
    await admin.rpc("increment_video_usage", { p_user_id: userId, p_period: period });
  }

  if (feature === "cowork") {
    await admin.rpc("increment_cowork_usage", {
      p_user_id: userId,
      p_period: period,
      p_today: today,
    });
  }
}
