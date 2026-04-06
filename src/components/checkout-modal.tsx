"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: string;
  price: string;
  billingPeriod: "monthly" | "yearly";
  features: string[];
  onSuccess: (tier: string) => void;
}

export function CheckoutModal({
  open,
  onOpenChange,
  tier,
  price,
  billingPeriod,
  features,
  onSuccess,
}: CheckoutModalProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Map tiers to Stripe price IDs (set real IDs in production)
  const monthlyPriceIds: Record<string, string> = {
    pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "price_pro_placeholder",
    elite: process.env.NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID || "price_elite_placeholder",
  };
  const yearlyPriceIds: Record<string, string> = {
    pro: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRO_PRICE_ID || "price_yearly_pro_placeholder",
    elite: process.env.NEXT_PUBLIC_STRIPE_YEARLY_ELITE_PRICE_ID || "price_yearly_elite_placeholder",
  };
  const priceIds = billingPeriod === "yearly" ? yearlyPriceIds : monthlyPriceIds;

  async function handleCheckout() {
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, priceId: priceIds[tier.toLowerCase()] }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      if (data.mock) {
        // Mock flow — show success immediately
        setStatus("success");
        setTimeout(() => onSuccess(tier), 1500);
        return;
      }

      // Real Stripe — redirect to checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setErrorMsg(msg);
      setStatus("error");
    }
  }

  function handleClose() {
    setStatus("idle");
    setErrorMsg("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-purple-500/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Upgrade to {tier}
            <span className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-2 py-0.5 text-[10px] font-medium text-white">
              {price}{billingPeriod === "yearly" ? "/yr" : "/mo"}
            </span>
          </DialogTitle>
          <DialogDescription>
            Unlock premium features for your AI twin
          </DialogDescription>
        </DialogHeader>

        {status === "success" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-6"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500">
              <svg
                className="h-8 w-8 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg font-semibold">{tier} features unlocked!</p>
              <p className="text-sm text-muted-foreground">
                Your AI twin just got a serious upgrade.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 px-4 py-1.5">
              <span className="flex h-2 w-2">
                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <span className="text-xs font-medium text-purple-300">
                {tier} Plan Active
              </span>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Feature list */}
            <div className="space-y-3">
              <div className="rounded-lg border border-purple-500/20 bg-purple-950/20 p-3">
                <p className="mb-2 text-[10px] font-medium text-purple-400 uppercase tracking-wider">
                  What you get
                </p>
                <ul className="space-y-1.5">
                  {features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-xs">
                      <svg
                        className="h-3.5 w-3.5 shrink-0 text-purple-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Price summary */}
              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{tier} Plan</p>
                  <p className="text-[10px] text-muted-foreground">
                    {billingPeriod === "yearly" ? "Billed yearly, cancel anytime" : "Billed monthly, cancel anytime"}
                  </p>
                </div>
                <p className="text-xl font-bold">
                  {price}
                  <span className="text-xs font-normal text-muted-foreground">{billingPeriod === "yearly" ? "/yr" : "/mo"}</span>
                </p>
              </div>

              {/* Stripe badge */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" x2="22" y1="10" y2="10" />
                </svg>
                Secure payment via Stripe
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30"
                onClick={handleCheckout}
                disabled={status === "loading"}
              >
                {status === "loading" ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  `Subscribe to ${tier} — ${price}${billingPeriod === "yearly" ? "/yr" : "/mo"}`
                )}
              </Button>
              <button
                onClick={handleClose}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                Maybe later
              </button>
            </div>

            {/* Error */}
            {status === "error" && errorMsg && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-950/20 px-3 py-2"
              >
                <svg className="h-3.5 w-3.5 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
                <p className="text-xs text-red-400">{errorMsg}</p>
              </motion.div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
