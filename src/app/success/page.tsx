"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

function SuccessContent() {
  const params = useSearchParams();
  const tier = params.get("tier") || "Pro";
  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);

  return (
    <div className="flex min-h-screen flex-col bg-background">
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md space-y-6"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
          <svg
            className="h-10 w-10 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Welcome to{" "}
          <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            {tierName}
          </span>
        </h1>

        <p className="text-muted-foreground">
          Your DoppelPod {tierName} plan is now active. You have access to all{" "}
          {tierName} features including{" "}
          {tier === "elite"
            ? "Claude Cowork, advanced video avatars, and priority generation."
            : "unlimited AI posts, advanced voice cloning, and video avatars."}
        </p>

        <div className="rounded-lg border border-purple-500/30 bg-purple-950/20 px-4 py-3">
          <p className="text-sm text-purple-300">
            <span className="font-semibold">{tierName}</span> plan active
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Link href="/#demo">
            <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700">
              Try Your {tierName} Features
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
              Back to Home
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
    <SiteFooter />
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
