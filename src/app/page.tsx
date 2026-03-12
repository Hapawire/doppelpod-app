"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
    tier: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with your AI twin",
    features: [
      "5 AI posts/month",
      "1 platform",
      "Basic voice cloning",
      "Community support",
    ],
    cta: "Start Free",
    highlighted: false,
  },
  {
    tier: "Pro",
    price: "$29",
    period: "/mo",
    description: "For serious creators and founders",
    features: [
      "Unlimited AI posts",
      "3 platforms",
      "Advanced voice cloning",
      "Virality predictor",
      "Auto-engagement",
      "Priority support",
    ],
    cta: "Go Pro",
    highlighted: true,
  },
  {
    tier: "Elite",
    price: "$69",
    period: "/mo",
    description: "Full autopilot for power users",
    features: [
      "Everything in Pro",
      "Unlimited platforms",
      "Custom AI training",
      "DM autopilot",
      "Analytics dashboard",
      "Dedicated account manager",
    ],
    cta: "Go Elite",
    highlighted: false,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export default function Home() {
  const [email, setEmail] = useState("");
  const [waitlistStatus, setWaitlistStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [demoInput, setDemoInput] = useState("");
  const [demoOutput, setDemoOutput] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);

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

  function handleGenerateTwin() {
    if (!demoInput.trim()) return;
    setDemoLoading(true);
    setTimeout(() => {
      const lines = demoInput
        .split("\n")
        .filter((l) => l.trim())
        .slice(0, 3);
      const twinPost =
        lines.length > 0
          ? `AI Twin version:\n\n"${lines[0].trim().replace(/^["']|["']$/g, "")} — but make it 10x more magnetic.\n\nHere's the thing most people won't tell you: consistency beats virality. Your AI twin knows this.\n\n🔥 Drop a follow if this hits different."`
          : "Paste some posts above to see your AI twin in action!";
      setDemoOutput(twinPost);
      setDemoLoading(false);
    }, 1500);
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
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700 transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30"
            onClick={() =>
              document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Join Waitlist
          </Button>
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
              onClick={() =>
                document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Join Waitlist
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 w-full px-8 text-base sm:h-14 sm:w-auto sm:text-lg transition-all hover:scale-105 hover:shadow-lg"
              onClick={() =>
                document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Try Demo
            </Button>
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
              Start free. Scale when you&apos;re ready.
            </p>
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
                  className={`relative h-full transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/10 ${
                    plan.highlighted
                      ? "border-purple-500 bg-gradient-to-b from-purple-950/30 to-card shadow-lg shadow-purple-500/10"
                      : "border-border/50 bg-card/50"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-1 text-xs font-medium text-white">
                      Most Popular
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">{plan.tier}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <p className="text-2xl font-bold sm:text-3xl">
                      {plan.price}
                      <span className="text-sm font-normal text-muted-foreground sm:text-base">
                        {plan.period}
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
                    <Button
                      className={`w-full transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                        plan.highlighted
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 hover:shadow-purple-500/30"
                          : ""
                      }`}
                      variant={plan.highlighted ? "default" : "outline"}
                    >
                      {plan.cta}
                    </Button>
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
              Paste 3-5 of your recent posts and watch the magic happen
            </p>
          </motion.div>
          <Card className="border-border/50 bg-card/50 backdrop-blur transition-all hover:shadow-lg hover:shadow-purple-500/10">
            <CardContent className="space-y-4 p-4 sm:p-6">
              <Textarea
                placeholder="Paste 3-5 of your recent posts here (one per line)..."
                className="min-h-[120px] resize-none sm:min-h-[140px] focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:border-purple-500/50"
                value={demoInput}
                onChange={(e) => setDemoInput(e.target.value)}
              />
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30"
                onClick={handleGenerateTwin}
                disabled={demoLoading || !demoInput.trim()}
              >
                {demoLoading ? "Generating..." : "Generate Twin Post"}
              </Button>
              {demoOutput && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-purple-500/30 bg-purple-950/20 p-4"
                >
                  <p className="mb-2 text-xs font-medium text-purple-400">
                    YOUR AI TWIN WROTE:
                  </p>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed sm:text-sm">
                    {demoOutput}
                  </p>
                </motion.div>
              )}
            </CardContent>
          </Card>
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
    </div>
  );
}
