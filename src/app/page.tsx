"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CoworkModal } from "@/components/cowork-modal";
import { CheckoutModal } from "@/components/checkout-modal";
import { GenerateWidget } from "@/components/generate-widget";
import { NavAuth } from "@/components/nav-auth";
import { FeatureCard } from "@/components/feature-card";
import { AuthModal } from "@/components/auth-modal";
import { FeedbackModal } from "@/components/feedback-modal";
import { AuthGate } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-provider";
import { TIER_LIMITS } from "@/lib/tiers";
import { getSupabase } from "@/lib/supabase";

const features = [
  {
    title: "Voice Cloning",
    description:
      "Clone your unique voice and tone. Your AI twin writes exactly like you — your slang, your rhythm, your vibe.",
    icon: "🎙️",
    back: (
      <div className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">You wrote</p>
          <p className="text-muted-foreground">&ldquo;just posted a new vid lmk what u think&rdquo;</p>
        </div>
        <div className="border-t border-purple-500/20 pt-3">
          <p className="text-[10px] uppercase tracking-wider text-purple-400 mb-1">Your twin wrote</p>
          <p>&ldquo;New video just dropped. This one&apos;s different — watch it and let me know.&rdquo;</p>
        </div>
      </div>
    ),
  },
  {
    title: "Agentic Autopilot",
    description:
      "Set it and forget it. Your twin posts, replies, and engages autonomously while you focus on what matters.",
    icon: "🤖",
    comingSoon: true,
    back: (
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">While you were away</p>
        <div className="space-y-2">
          <p className="flex items-center gap-2"><span className="text-green-400">✓</span> 3 posts published</p>
          <p className="flex items-center gap-2"><span className="text-green-400">✓</span> 8 replies sent</p>
          <p className="flex items-center gap-2"><span className="text-purple-400">↑</span> 1,240 new impressions</p>
        </div>
      </div>
    ),
  },
  {
    title: "Virality Predictor",
    description:
      "AI scores every post before it goes live. Only bangers get published. Maximize reach, minimize cringe.",
    icon: "📈",
    comingSoon: true,
    back: (
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Post score: <span className="text-green-400 font-bold text-sm">84/100</span></p>
        <div className="space-y-2">
          <p className="flex items-center gap-2"><span className="text-green-400">✓</span> Strong hook</p>
          <p className="flex items-center gap-2"><span className="text-green-400">✓</span> Clear CTA</p>
          <p className="flex items-center gap-2"><span className="text-amber-400">⚠</span> Hashtag coverage</p>
        </div>
      </div>
    ),
  },
  {
    title: "Multi-Platform",
    description: "One post. Every platform.",
    icon: "🌐",
    comingSoon: true,
    back: (
      <div className="space-y-4">
        <div className="flex gap-4 items-center">
          {/* X */}
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-foreground/70" aria-label="X">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          {/* LinkedIn */}
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#0A66C2]" aria-label="LinkedIn">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          {/* Instagram */}
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#E1306C]" aria-label="Instagram">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
          </svg>
          {/* TikTok */}
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-foreground/70" aria-label="TikTok">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
          </svg>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Your twin knows the difference between LinkedIn and Instagram and can reformat your post so you don&apos;t have to.
        </p>
        <p className="mt-3 text-muted-foreground">
          Copy/paste is for suckers.
        </p>
      </div>
    ),
  },
];

const pricing = [
  {
    tier: "Trial",
    price: "Free",
    yearlyTotal: null,
    period: "",
    description: "Unrestricted Elite access for 10 days",
    features: [
      "Unlimited voice generation",
      "Unlimited video avatars",
      "Full Claude Cowork (voice + text)",
      "Priority rendering",
      "All Elite features for 10 days",
    ],
    cta: "Start Trial",
    highlight: null,
    isTrial: true,
  },
  {
    tier: "Pro",
    price: "$29",
    yearlyTotal: "$290",
    period: "/mo",
    description: "For serious creators and founders",
    features: [
      "Unlimited voice generation",
      "10 video avatars/month",
      "Basic Cowork (text-only, 10/day)",
      "3 platforms",
      "Virality predictor",
      "Priority support",
    ],
    cta: "Go Pro",
    highlight: "pro",
    isTrial: false,
  },
  {
    tier: "Elite",
    price: "$69",
    yearlyTotal: "$690",
    period: "/mo",
    description: "Full autopilot for power users",
    features: [
      "Everything in Pro",
      "Unlimited video avatars",
      "Full Cowork (voice chat + unlimited)",
      "Priority rendering",
      "Unlimited platforms",
      "Dedicated account manager",
    ],
    cta: "Go Elite",
    highlight: "elite",
    isTrial: false,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export default function Home() {
  const { user, effectiveTier, usage, refreshProfile } = useAuth();
  const [email, setEmail] = useState("");
  // Cowork modal state
  const [coworkOpen, setCoworkOpen] = useState(false);

  // Checkout modal state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState<{ tier: string; price: string; features: string[]; billingPeriod: "monthly" | "yearly" }>({ tier: "", price: "", features: [], billingPeriod: "monthly" });
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const pendingCheckout = useRef<{ tier: string; price: string; features: string[]; billingPeriod: "monthly" | "yearly" } | null>(null);

  // Auto-open checkout after signup if user clicked a paid plan while unauthenticated
  useEffect(() => {
    if (user && pendingCheckout.current) {
      setCheckoutTier(pendingCheckout.current);
      setBillingPeriod(pendingCheckout.current.billingPeriod);
      setCheckoutOpen(true);
      pendingCheckout.current = null;
    }
  }, [user]);




  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-lg font-bold text-transparent">
            DoppelPod
          </span>
          <div className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
            <a href="#demo" className="transition-colors hover:text-foreground">Demo</a>
          </div>
          <NavAuth />
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-14 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-background to-background" />
        <motion.div
          className="relative z-10 max-w-4xl space-y-6"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.6 }}
        >
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500" />
            </span>
            Now in Early Access
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Your AI Twin
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              Runs Social 24/7
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-base text-foreground/75 sm:text-lg md:text-xl">
            Clone your voice, post, engage — autopilot. Let your AI twin build
            your brand while you sleep.
          </p>

          {/* Social proof */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="flex -space-x-2">
              {["bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-fuchsia-500", "bg-violet-500"].map((bg, i) => (
                <div
                  key={i}
                  className={`h-8 w-8 rounded-full border-2 border-background ${bg} flex items-center justify-center text-[10px] font-bold text-white`}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
          </div>

          <div className="flex w-full flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="h-12 w-full px-8 text-base sm:h-14 sm:w-auto sm:text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30"
              onClick={() => {
                if (user) {
                  document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
                } else {
                  setSignupOpen(true);
                }
              }}
            >
              {user ? "Try Demo" : "Start 10-Day Elite Trial — Free"}
            </Button>
            {!user && (
              <Button
                variant="outline"
                size="lg"
                className="h-12 w-full px-8 text-base sm:h-14 sm:w-auto sm:text-lg transition-all hover:scale-105 hover:shadow-lg"
                onClick={() => {
                  document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Try Demo
              </Button>
            )}
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 sm:py-24 bg-muted/20" id="features">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="mb-12 text-center sm:mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold sm:text-3xl md:text-4xl">
              Everything your AI twin needs
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">
              Powerful features to automate your social media presence
            </p>
          </motion.div>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <FeatureCard
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  back={feature.back}
                  comingSoon={feature.comingSoon}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-4 py-16 sm:py-24" id="pricing">
        <div className="mx-auto max-w-5xl">
          <motion.div
            className="mb-12 text-center sm:mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold sm:text-3xl md:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">
              Try for free. Scale when you&apos;re ready.
            </p>
            <p className="mt-2 text-xs text-green-400">
              Go yearly and get 2 months free.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <span className={`text-sm font-medium transition-colors ${billingPeriod === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "yearly" : "monthly")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  billingPeriod === "yearly" ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    billingPeriod === "yearly" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className={`text-sm font-medium transition-colors ${billingPeriod === "yearly" ? "text-foreground" : "text-muted-foreground"}`}>
                Yearly
              </span>
            </div>
          </motion.div>
          <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
            {pricing.map((plan, i) => (
              <motion.div
                key={plan.tier}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card
                  className={`relative overflow-visible h-full flex flex-col transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/10 ${
                    plan.highlight === "pro"
                      ? "border-purple-500/50 bg-gradient-to-b from-purple-950/25 to-card shadow-md shadow-purple-500/10"
                      : plan.highlight === "elite"
                        ? "border-purple-400/60 bg-gradient-to-b from-purple-900/32 to-card shadow-md shadow-purple-500/18 ring-1 ring-purple-400/13"
                        : "border-border/50 bg-card/50"
                  }`}
                >
                  {plan.highlight === "pro" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-700 to-pink-700 px-4 py-1 text-xs font-medium text-white">
                      Most Popular
                    </div>
                  )}
                  {plan.highlight === "elite" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-1 text-xs font-medium text-white shadow-md shadow-purple-500/40">
                      Best Value
                    </div>
                  )}
                  {plan.isTrial && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-purple-500/40 bg-card px-4 py-1 text-xs font-medium text-white whitespace-nowrap">
                      No card required
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">{plan.tier}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <p className="text-2xl font-bold sm:text-3xl">
                      {billingPeriod === "yearly" && plan.yearlyTotal ? plan.yearlyTotal : plan.price}
                      <span className="text-sm font-normal text-muted-foreground sm:text-base">
                        {billingPeriod === "yearly" && plan.yearlyTotal ? "/year" : plan.period}
                      </span>
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1 space-y-4">
                    <ul className="space-y-2 text-xs sm:text-sm flex-1">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-2">
                          <span className="text-purple-400">&#10003;</span>
                          {feat}
                        </li>
                      ))}
                    </ul>
                    {activePlan === plan.tier ? (
                      <div className="flex items-center justify-center gap-2 rounded-lg border border-green-500/30 bg-green-950/20 py-2 text-xs font-medium text-green-400">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {plan.tier} Active
                      </div>
                    ) : (
                      <Button
                        className={`w-full transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                          plan.highlight === "pro"
                            ? "bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-600 hover:to-pink-600 text-white border-0 hover:shadow-purple-500/20"
                            : plan.highlight === "elite"
                              ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 shadow-sm shadow-purple-500/20 hover:shadow-md hover:shadow-purple-500/35"
                              : ""
                        }`}
                        variant={plan.highlight ? "default" : "outline"}
                        onClick={() => {
                          if (plan.isTrial) {
                            setSignupOpen(true);
                            return;
                          }
                          const displayPrice = billingPeriod === "yearly" && plan.yearlyTotal ? plan.yearlyTotal : plan.price;
                          if (!user) {
                            pendingCheckout.current = { tier: plan.tier, price: displayPrice, features: plan.features, billingPeriod };
                            setSignupOpen(true);
                            return;
                          }
                          setCheckoutTier({ tier: plan.tier, price: displayPrice, features: plan.features, billingPeriod });
                          setCheckoutOpen(true);
                        }}
                      >
                        {plan.cta}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo */}
      <section className="px-4 py-16 sm:py-24 bg-muted/20" id="demo">
        <div className="mx-auto max-w-2xl">
          <motion.div
            className="mb-8 text-center sm:mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold sm:text-3xl md:text-4xl">
              See your AI twin in action
            </h2>
            <p className="mt-3 text-sm text-foreground/70 sm:mt-4 sm:text-base">
              Watch your AI twin transform your content in real time.
            </p>
          </motion.div>
          <AuthGate>
          <Card className="border-border/50 bg-card/50 backdrop-blur transition-all hover:shadow-lg hover:shadow-purple-500/10">
            <CardContent className="p-4 sm:p-6">
              <GenerateWidget onCoworkOpen={() => setCoworkOpen(true)} placeholder="Type or paste your text here..." />
            </CardContent>
          </Card>
          </AuthGate>

          <div className="mt-6 text-center">
            <button
              onClick={() => user ? setFeedbackOpen(true) : undefined}
              disabled={!user}
              title={!user ? "Sign in to leave feedback" : undefined}
              className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-5 py-2.5 text-sm font-medium text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-purple-500/10 disabled:hover:text-purple-300"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Got feedback? We&apos;d love to hear it.
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-4 py-8">
        <div className="mx-auto max-w-6xl flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
            <a href="#demo" className="transition-colors hover:text-foreground">Demo</a>
            <span className="text-muted-foreground/30">|</span>
            <a href="/terms" className="transition-colors hover:text-foreground">Terms</a>
            <a href="/privacy" className="transition-colors hover:text-foreground">Privacy</a>
            <a href="/cookie-policy" className="transition-colors hover:text-foreground">Cookies</a>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4Z" />
              <circle cx="12" cy="15" r="2" />
            </svg>
            Powered by Hapawire
          </div>
          <p>
            &copy; {new Date().getFullYear()} DoppelPod. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Claude Cowork Modal */}
      <CoworkModal
        open={coworkOpen}
        onOpenChange={setCoworkOpen}
        initialScript=""
        onScriptUpdate={() => {}}
        voiceStrength={75}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        tier={checkoutTier.tier}
        price={checkoutTier.price}
        billingPeriod={checkoutTier.billingPeriod}
        features={checkoutTier.features}
        onSuccess={(tier) => {
          setActivePlan(tier);
          setCheckoutOpen(false);
          refreshProfile();
        }}
      />

      {/* Signup Modal (from Start Trial CTAs) */}
      <AuthModal open={signupOpen} onOpenChange={setSignupOpen} defaultTab="signup" />

      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  );
}
