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
  },
  {
    title: "Agentic Autopilot",
    description:
      "Set it and forget it. Your twin posts, replies, and engages autonomously while you focus on what matters.",
    icon: "🤖",
  },
  {
    title: "Virality Predictor",
    description:
      "AI scores every post before it goes live. Only bangers get published. Maximize reach, minimize cringe.",
    icon: "📈",
  },
  {
    title: "Multi-Platform",
    description:
      "X, LinkedIn, Instagram, TikTok — one twin, every platform. Consistent presence everywhere, effortlessly.",
    icon: "🌐",
  },
];

const pricing = [
  {
    tier: "Trial",
    price: "Free",
    yearlyTotal: null,
    period: "10 days",
    description: "Full Elite access — no credit card required",
    features: [
      "Unlimited voice generation",
      "Unlimited video avatars",
      "Full Claude Cowork (voice + text)",
      "Priority rendering",
      "All Elite features for 10 days",
    ],
    cta: "Start 10-Day Elite Trial",
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
  const [waitlistStatus, setWaitlistStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
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




  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setWaitlistStatus("loading");

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not configured");

      const { error } = await supabase.from("waitlist").insert({ email });

      if (error) throw error;

      setWaitlistStatus("success");
      setEmail("");
    } catch {
      setWaitlistStatus("error");
    }
  }

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
          <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg md:text-xl">
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
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">10,000+</span> creators on the waitlist
            </p>
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
                <Card className="h-full border-border/50 bg-card/50 backdrop-blur transition-all duration-200 hover:border-purple-500/50 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/10">
                  <CardHeader>
                    <div className="mb-2 text-3xl sm:text-4xl">{feature.icon}</div>
                    <CardTitle className="text-lg sm:text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-xs leading-relaxed sm:text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
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
                  className={`relative overflow-visible h-full transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/10 ${
                    plan.highlight === "pro"
                      ? "border-purple-500 bg-gradient-to-b from-purple-950/30 to-card shadow-lg shadow-purple-500/10"
                      : plan.highlight === "elite"
                        ? "border-amber-500/60 bg-gradient-to-b from-amber-950/30 to-card shadow-lg shadow-amber-500/15"
                        : "border-border/50 bg-card/50"
                  }`}
                >
                  {plan.highlight === "pro" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-1 text-xs font-medium text-white">
                      Most Popular
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
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-xs sm:text-sm">
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
                            ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 hover:shadow-purple-500/30"
                            : plan.highlight === "elite"
                              ? "bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-700 hover:to-yellow-600 text-white border-0 hover:shadow-amber-500/30"
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
            <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">
              Type something and watch the magic happen!
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
              onClick={() => user ? setFeedbackOpen(true) : setSignupOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-5 py-2.5 text-sm font-medium text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 transition-all"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Got feedback? We&apos;d love to hear it.
            </button>
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section className="px-4 py-16 sm:py-24" id="waitlist">
        <div className="mx-auto max-w-lg text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold sm:text-3xl md:text-4xl">
              Join the Waitlist
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">
              Be the first to get access when we launch.
            </p>
          </motion.div>
          <form
            onSubmit={handleWaitlist}
            className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row"
          >
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 flex-1 focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:border-purple-500/50"
            />
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full px-8 sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30"
              disabled={
                waitlistStatus === "loading" ||
                !email.includes("@") ||
                email.length < 5
              }
            >
              {waitlistStatus === "loading" ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Joining...
                </span>
              ) : (
                "Join"
              )}
            </Button>
          </form>
          {waitlistStatus === "success" && (
            <p className="mt-4 text-sm text-green-400">
              You&apos;re on the list! We&apos;ll be in touch soon.
            </p>
          )}
          {waitlistStatus === "error" && (
            <p className="mt-4 text-sm text-red-400">
              Something went wrong. Please try again.
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-4 py-8">
        <div className="mx-auto max-w-6xl flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
          <div className="flex items-center gap-4 text-xs">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
            <a href="#demo" className="transition-colors hover:text-foreground">Demo</a>
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
            Powered by AI
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
