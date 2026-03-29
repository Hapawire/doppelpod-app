"use client";

import { useAuth } from "@/components/auth-provider";
import { TIER_LIMITS } from "@/lib/tiers";
import { Button } from "@/components/ui/button";

interface FeatureGateProps {
  feature: "voice" | "video" | "cowork" | "coworkVoice";
  children: React.ReactNode;
  fallback?: React.ReactNode;
  inline?: boolean; // show inline message instead of overlay
}

export function FeatureGate({ feature, children, fallback, inline }: FeatureGateProps) {
  const { user, effectiveTier, emailConfirmed, usage } = useAuth();

  if (!user) return <>{children}</>; // Auth gate handles login

  // Email confirmation gate
  if (!emailConfirmed) {
    const confirmMsg = "Confirm your email to unlock this feature. Check your inbox for a confirmation link.";
    if (fallback) return <>{fallback}</>;
    if (inline) {
      return (
        <div className="flex items-center gap-2 text-sm text-yellow-400/80">
          <span>✉️</span>
          <span>{confirmMsg}</span>
        </div>
      );
    }
    return (
      <div className="relative">
        <div className="opacity-40 pointer-events-none blur-[1px]">{children}</div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
          <span className="text-2xl mb-2">✉️</span>
          <p className="text-sm text-white/80 mb-3 text-center px-4">{confirmMsg}</p>
        </div>
      </div>
    );
  }

  const limits = TIER_LIMITS[effectiveTier];

  let blocked = false;
  let message = "";

  switch (feature) {
    case "voice":
      blocked = !limits.voice;
      message = "Voice generation requires Pro or Elite.";
      break;
    case "video":
      if (!limits.video) {
        blocked = true;
        message = "Video avatars require Pro or Elite.";
      } else if (limits.videoLimit !== null && usage && usage.video_count >= limits.videoLimit) {
        blocked = true;
        message = `You've used all ${limits.videoLimit} videos this month. Upgrade to Elite for unlimited.`;
      }
      break;
    case "cowork":
      if (!limits.cowork) {
        blocked = true;
        message = "Claude Cowork requires Pro or Elite.";
      } else if (
        limits.coworkDailyLimit !== null &&
        usage &&
        usage.cowork_sessions_today >= limits.coworkDailyLimit
      ) {
        blocked = true;
        message = `You've used all ${limits.coworkDailyLimit} Cowork sessions today. Upgrade to Elite for unlimited.`;
      }
      break;
    case "coworkVoice":
      blocked = !limits.coworkVoiceChat;
      message = "Voice chat requires Elite plan.";
      break;
  }

  if (!blocked) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  if (inline) {
    return (
      <div className="flex items-center gap-2 text-sm text-yellow-400/80">
        <span>🔒</span>
        <span>{message}</span>
        <Button
          size="sm"
          variant="link"
          className="text-fuchsia-400 hover:text-fuchsia-300 p-0 h-auto text-sm"
          onClick={() => {
            document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          Upgrade →
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="opacity-40 pointer-events-none blur-[1px]">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
        <span className="text-2xl mb-2">🔒</span>
        <p className="text-sm text-white/80 mb-3 text-center px-4">{message}</p>
        <Button
          size="sm"
          className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500"
          onClick={() => {
            document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          Upgrade Plan
        </Button>
      </div>
    </div>
  );
}

/** Badge showing usage count for Pro users */
export function UsageBadge({
  feature,
}: {
  feature: "video" | "cowork";
}) {
  const { effectiveTier, usage } = useAuth();
  const limits = TIER_LIMITS[effectiveTier];

  if (feature === "video" && limits.videoLimit !== null && usage) {
    const remaining = Math.max(0, limits.videoLimit - usage.video_count);
    return (
      <span className="text-xs text-yellow-400/70 ml-2">
        ({remaining}/{limits.videoLimit} left)
      </span>
    );
  }

  if (feature === "cowork" && limits.coworkDailyLimit !== null && usage) {
    const remaining = Math.max(0, limits.coworkDailyLimit - usage.cowork_sessions_today);
    return (
      <span className="text-xs text-yellow-400/70 ml-2">
        ({remaining}/{limits.coworkDailyLimit} today)
      </span>
    );
  }

  return null;
}
