import { SupabaseClient } from "@supabase/supabase-js";
import { getEffectiveTier, TIER_LIMITS, type TierName } from "./tiers";

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

  // Reset daily cowork count if new day
  const today = getTodayDate();
  if (usage.last_cowork_date !== today) {
    await supabase
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

  if (feature === "video") {
    const { data } = await supabase
      .from("usage_tracking")
      .select("video_count")
      .eq("user_id", userId)
      .eq("period", period)
      .single();

    if (data) {
      await supabase
        .from("usage_tracking")
        .update({ video_count: (data.video_count || 0) + 1 })
        .eq("user_id", userId)
        .eq("period", period);
    }
  }

  if (feature === "cowork") {
    const { data } = await supabase
      .from("usage_tracking")
      .select("cowork_sessions, cowork_sessions_today")
      .eq("user_id", userId)
      .eq("period", period)
      .single();

    if (data) {
      await supabase
        .from("usage_tracking")
        .update({
          cowork_sessions: (data.cowork_sessions || 0) + 1,
          cowork_sessions_today: (data.cowork_sessions_today || 0) + 1,
          last_cowork_date: today,
        })
        .eq("user_id", userId)
        .eq("period", period);
    }
  }
}
