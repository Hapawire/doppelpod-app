"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

export function TrialBanner() {
  const { user, effectiveTier, trialDaysLeft, profile } = useAuth();

  if (!user) return null;

  // Active trial
  if (effectiveTier === "trial" && trialDaysLeft > 0) {
    return (
      <div className="w-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white text-center py-2 px-4 text-sm flex items-center justify-center gap-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <strong>{trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left</strong> in your Elite trial
        </span>
        <span className="hidden sm:inline text-white/80">— Full access to all features</span>
        <Button
          size="sm"
          variant="secondary"
          className="ml-2 h-6 px-3 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
          onClick={() => {
            document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          Upgrade Now
        </Button>
      </div>
    );
  }

  // Expired trial
  if (effectiveTier === "expired") {
    return (
      <div className="w-full bg-gradient-to-r from-red-900/80 to-orange-900/80 text-white text-center py-2 px-4 text-sm flex items-center justify-center gap-3">
        <span>⚠️ Your Elite trial has ended</span>
        <Button
          size="sm"
          variant="secondary"
          className="ml-2 h-6 px-3 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
          onClick={() => {
            document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          Upgrade to Continue
        </Button>
      </div>
    );
  }

  return null;
}
