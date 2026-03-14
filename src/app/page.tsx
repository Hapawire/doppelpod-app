"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
import { Waveform } from "@/components/waveform";
import { Slider } from "@/components/ui/slider";
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
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [copied, setCopied] = useState(false);
  const [voiceStrength, setVoiceStrength] = useState(75);
  const [voicePreset, setVoicePreset] = useState<"creative" | "balanced" | "clone" | "custom">("balanced");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track audio progress
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      progressInterval.current = setInterval(() => {
        const a = audioRef.current;
        if (a && a.duration && isFinite(a.duration)) {
          setAudioProgress(a.currentTime / a.duration);
          setAudioDuration(a.duration);
        }
      }, 50);
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
    }
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isPlaying]);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setIsPlaying(false);
    setAudioReady(false);
    setAudioProgress(0);
    setAudioDuration(0);
    setTtsError("");
  }, []);

  function copyOutput() {
    if (!demoOutput) return;
    navigator.clipboard.writeText(demoOutput).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function handlePresetChange(preset: "creative" | "balanced" | "clone" | "custom") {
    setVoicePreset(preset);
    const presetValues = { creative: 20, balanced: 50, clone: 90, custom: voiceStrength };
    if (preset !== "custom") setVoiceStrength(presetValues[preset]);
  }

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

  async function handleGenerateTwin() {
    if (!demoInput.trim()) return;
    setDemoLoading(true);
    cleanupAudio();
    setDemoOutput("");

    try {
      console.log("[demo] Calling /api/generate-twin...");
      const res = await fetch("/api/generate-twin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts: demoInput }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      if (data.fallback || !data.text) {
        // Mock fallback when no API key
        console.log("[demo] Using mock fallback (no API key configured)");
        const lines = demoInput.split("\n").filter((l) => l.trim()).slice(0, 3);
        const twinPost =
          lines.length > 0
            ? `AI Twin version:\n\n"${lines[0].trim().replace(/^["']|["']$/g, "")} — but make it 10x more magnetic.\n\nHere's the thing most people won't tell you: consistency beats virality. Your AI twin knows this.\n\n🔥 Drop a follow if this hits different."`
            : "Paste some posts above to see your AI twin in action!";
        setDemoOutput(twinPost);
      } else {
        console.log("[demo] Got AI-generated twin post");
        setDemoOutput(data.text);
      }
    } catch (err) {
      console.error("[demo] Generate error:", err);
      setDemoOutput("Something went wrong generating your twin post. Please try again.");
    } finally {
      setDemoLoading(false);
    }
  }

  async function handleTextToSpeech() {
    if (!demoOutput) return;
    setTtsLoading(true);
    setTtsError("");
    cleanupAudio();

    try {
      console.log("[demo] Calling /api/text-to-speech...");
      const res = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: demoOutput, stability: voiceStrength / 100 }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errData.error || `TTS failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setAudioProgress(1);
      });
      audio.addEventListener("canplaythrough", () => {
        setAudioReady(true);
        setTtsLoading(false);
        console.log("[demo] Audio ready — auto-playing");
        // Auto-play
        audio.play().then(() => setIsPlaying(true)).catch(() => {
          console.log("[demo] Auto-play blocked by browser, user must click play");
        });
      }, { once: true });
      audio.addEventListener("error", () => {
        setTtsError("Failed to load audio.");
        setTtsLoading(false);
        console.error("[demo] Audio element error");
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "TTS failed";
      console.error("[demo] TTS error:", msg);
      setTtsError(msg);
      setTtsLoading(false);
    }
  }

  function togglePlayback() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
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
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700 transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30"
            onClick={() => {
              console.log("Scrolling to waitlist");
              document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
            }}
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
              onClick={() => {
                console.log("Scrolling to waitlist");
                document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Join Waitlist
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 w-full px-8 text-base sm:h-14 sm:w-auto sm:text-lg transition-all hover:scale-105 hover:shadow-lg"
              onClick={() => {
                console.log("Scrolling to demo");
                document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
              }}
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
                {demoLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Cloning your voice...
                  </span>
                ) : (
                  "Generate Twin Post"
                )}
              </Button>

              {/* Twin output card */}
              {demoOutput && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 rounded-lg border border-purple-500/30 bg-purple-950/20 p-4"
                >
                  {/* Header row with label + copy button */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-purple-400">
                      YOUR AI TWIN WROTE:
                    </p>
                    <button
                      onClick={copyOutput}
                      className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium text-purple-400 transition-all hover:bg-purple-500/10 hover:text-purple-300 active:scale-95"
                      title="Copy to clipboard"
                    >
                      {copied ? (
                        <>
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="14" height="14" x="8" y="8" rx="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>

                  {/* Output text */}
                  <p className="whitespace-pre-wrap text-xs leading-relaxed sm:text-sm">
                    {demoOutput}
                  </p>

                  {/* Voice section */}
                  <div className="border-t border-purple-500/20 pt-4 space-y-4">
                    {/* Voice Preset + Strength — visible before audio is generated */}
                    {!audioReady && (
                      <div className="space-y-3">
                        {/* Preset buttons */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-medium text-purple-400">Voice Preset</span>
                          <div className="grid grid-cols-4 gap-1.5">
                            {([
                              { key: "creative" as const, label: "Creative", icon: "✨" },
                              { key: "balanced" as const, label: "Balanced", icon: "⚖️" },
                              { key: "clone" as const, label: "Clone", icon: "🧬" },
                              { key: "custom" as const, label: "Custom", icon: "🎛️" },
                            ]).map((p) => (
                              <button
                                key={p.key}
                                onClick={() => handlePresetChange(p.key)}
                                className={`flex flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 text-[10px] font-medium transition-all duration-150 hover:scale-105 ${
                                  voicePreset === p.key
                                    ? "border-purple-500 bg-purple-500/15 text-purple-300 shadow-sm shadow-purple-500/20"
                                    : "border-border/50 text-muted-foreground hover:border-purple-500/30 hover:text-purple-400"
                                }`}
                              >
                                <span className="text-sm">{p.icon}</span>
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Strength slider */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-purple-400">
                              Voice Strength
                            </span>
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {voiceStrength}%
                            </span>
                          </div>
                          <Slider
                            value={voiceStrength}
                            onValueChange={(v) => {
                              setVoiceStrength(v);
                              setVoicePreset("custom");
                            }}
                            min={0}
                            max={100}
                            step={5}
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground/60">
                            <span>Creative</span>
                            <span>Clone-like</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {!audioReady && !ttsLoading && (
                      <Button
                        variant="outline"
                        className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20"
                        onClick={handleTextToSpeech}
                      >
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" x2="12" y1="19" y2="22" />
                        </svg>
                        Hear My Twin Speak It
                      </Button>
                    )}

                    {ttsLoading && (
                      <div className="flex flex-col items-center gap-2 py-3">
                        <div className="flex items-center gap-3">
                          <svg className="h-5 w-5 animate-spin text-purple-400" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span className="text-sm text-purple-300">Generating voice...</span>
                        </div>
                        {/* Indeterminate progress bar */}
                        <div className="h-1 w-full overflow-hidden rounded-full bg-purple-950/50">
                          <motion.div
                            className="h-full w-1/3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                            animate={{ x: ["-100%", "400%"] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                          />
                        </div>
                      </div>
                    )}

                    {audioReady && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        {/* Waveform with progress tracking */}
                        <Waveform isPlaying={isPlaying} progress={audioProgress} className="rounded" />

                        {/* Progress bar + time */}
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] tabular-nums text-muted-foreground min-w-[28px]">
                            {formatTime(audioProgress * audioDuration)}
                          </span>
                          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-purple-950/50">
                            <div
                              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-100"
                              style={{ width: `${audioProgress * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] tabular-nums text-muted-foreground min-w-[28px] text-right">
                            {formatTime(audioDuration)}
                          </span>
                        </div>

                        {/* Play / Pause button */}
                        <Button
                          variant="outline"
                          className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200 transition-all duration-200 hover:scale-105"
                          onClick={togglePlayback}
                        >
                          {isPlaying ? (
                            <span className="flex items-center gap-2">
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" rx="1" />
                                <rect x="14" y="4" width="4" height="16" rx="1" />
                              </svg>
                              Pause
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5,3 19,12 5,21" />
                              </svg>
                              {audioProgress >= 1 ? "Replay" : "Play"}
                            </span>
                          )}
                        </Button>
                      </motion.div>
                    )}

                    {ttsError && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-2 flex items-center justify-center gap-2 rounded-md border border-red-500/20 bg-red-950/20 px-3 py-2"
                      >
                        <svg className="h-3.5 w-3.5 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" x2="12" y1="8" y2="12" />
                          <line x1="12" x2="12.01" y1="16" y2="16" />
                        </svg>
                        <p className="text-xs text-red-400">{ttsError}</p>
                      </motion.div>
                    )}
                  </div>
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
