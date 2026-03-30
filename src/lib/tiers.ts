export type TierName = "trial" | "expired" | "pro" | "elite";

export interface UserProfile {
  id: string;
  email: string | null;
  tier: TierName;
  paid_tier: TierName | null;
  trial_end: string | null;
  voice_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  email_confirmed: boolean;
}

export interface UsageData {
  video_count: number;
  cowork_sessions: number;
  cowork_sessions_today: number;
  last_cowork_date: string | null;
}

export interface TierLimits {
  voice: boolean;
  video: boolean;
  videoLimit: number | null; // null = unlimited
  cowork: boolean;
  coworkVoiceChat: boolean;
  coworkDailyLimit: number | null; // null = unlimited
  priorityRendering: boolean;
}

export const TIER_LIMITS: Record<TierName, TierLimits> = {
  trial: {
    voice: true,
    video: true,
    videoLimit: null,
    cowork: true,
    coworkVoiceChat: true,
    coworkDailyLimit: null,
    priorityRendering: true,
  },
  expired: {
    voice: false,
    video: false,
    videoLimit: 0,
    cowork: false,
    coworkVoiceChat: false,
    coworkDailyLimit: 0,
    priorityRendering: false,
  },
  pro: {
    voice: true,
    video: true,
    videoLimit: 10,
    cowork: true,
    coworkVoiceChat: false,
    coworkDailyLimit: 10,
    priorityRendering: false,
  },
  elite: {
    voice: true,
    video: true,
    videoLimit: null,
    cowork: true,
    coworkVoiceChat: true,
    coworkDailyLimit: null,
    priorityRendering: true,
  },
};

export function getEffectiveTier(profile: {
  tier: string;
  paid_tier?: string | null;
  trial_end: string | null;
}): TierName {
  if (profile.tier === "trial") {
    if (profile.trial_end && new Date(profile.trial_end) > new Date()) {
      return "trial"; // active trial = Elite access
    }
    // Trial expired — fall to paid tier if they subscribed, otherwise expired
    if (profile.paid_tier) {
      return profile.paid_tier.toLowerCase() as TierName;
    }
    return "expired";
  }
  return profile.tier as TierName;
}

export function getTrialDaysLeft(trialEnd: string | null): number {
  if (!trialEnd) return 0;
  const diff = new Date(trialEnd).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getLimitsForUser(profile: {
  tier: string;
  paid_tier?: string | null;
  trial_end: string | null;
}): TierLimits {
  return TIER_LIMITS[getEffectiveTier(profile)];
}
