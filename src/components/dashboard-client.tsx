"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { CheckoutModal } from "@/components/checkout-modal";
import { FeedbackModal } from "@/components/feedback-modal";
import { GenerateWidget } from "@/components/generate-widget";
import { TIER_LIMITS } from "@/lib/tiers";
import Link from "next/link";

interface Generation {
  id: string;
  input_text: string;
  output_text: string;
  created_at: string;
}

interface DashboardClientProps {
  user: { id: string; email: string };
  profile: { tier: string; voice_id: string | null };
  initialGenerations: Generation[];
}

function ExpiredOverlay({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm">
      <div className="text-center space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Your trial has ended</p>
        <Button
          size="sm"
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
          onClick={onUpgrade}
        >
          Upgrade to Continue
        </Button>
      </div>
    </div>
  );
}

export function DashboardClient({
  user,
  profile,
  initialGenerations,
}: DashboardClientProps) {
  const { signOut, effectiveTier, emailConfirmed, trialDaysLeft, usage, refreshProfile, updatePassword, deleteAccount } = useAuth();
  const limits = TIER_LIMITS[effectiveTier];
  const [generations] = useState<Generation[]>(initialGenerations);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState<"pro" | "elite">("pro");
  const [activePlan, setActivePlan] = useState(profile.tier);

  const tierInfo = {
    pro: {
      price: "$29/mo",
      features: [
        "Unlimited AI posts",
        "All platforms",
        "Advanced voice cloning",
        "Basic video avatars",
        "Priority support",
      ],
    },
    elite: {
      price: "$69/mo",
      features: [
        "Everything in Pro",
        "Claude Cowork",
        "Advanced video avatars",
        "Priority generation",
        "Dedicated account manager",
      ],
    },
  };
  // Account management state
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  async function handleChangePassword() {
    if (!newPassword || !confirmPassword) {
      setPasswordStatus({ type: "error", message: "Both fields are required." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", message: "Passwords don't match." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus({ type: "error", message: "Password must be at least 6 characters." });
      return;
    }
    setPasswordLoading(true);
    setPasswordStatus(null);
    const result = await updatePassword(newPassword);
    if (result.error) {
      setPasswordStatus({ type: "error", message: result.error });
    } else {
      setPasswordStatus({ type: "success", message: "Password updated." });
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setShowChangePassword(false), 1500);
    }
    setPasswordLoading(false);
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE") return;
    setDeleteLoading(true);
    const result = await deleteAccount();
    if (result.error) {
      setPasswordStatus({ type: "error", message: result.error });
      setDeleteLoading(false);
    }
    // If successful, deleteAccount redirects to homepage
  }

  async function handleBillingPortal() {
    setBillingLoading(true);
    try {
      const res = await fetch("/api/account/billing-portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPasswordStatus({ type: "error", message: data.error || "Could not open billing portal." });
      }
    } catch {
      setPasswordStatus({ type: "error", message: "Something went wrong." });
    } finally {
      setBillingLoading(false);
    }
  }

  async function handleExportData() {
    setExportLoading(true);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `doppelpod-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setPasswordStatus({ type: "error", message: "Export failed. Try again." });
    } finally {
      setExportLoading(false);
    }
  }

  const [voiceUploading, setVoiceUploading] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(
    profile.voice_id ? "Voice sample uploaded" : null
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const tierColors: Record<string, string> = {
    expired: "bg-red-500/20 text-red-400 border-red-500/30",
    trial: "bg-green-500/20 text-green-400 border-green-500/30",
    pro: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    elite: "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-400 border-pink-500/30",
  };

  async function handleVoiceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setVoiceUploading(true);
    setVoiceStatus(null);

    try {
      const formData = new FormData();
      formData.append("audio", file);

      const res = await fetch("/api/voice/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setVoiceStatus("Voice sample uploaded successfully!");
      } else {
        const data = await res.json();
        setVoiceStatus(`Error: ${data.error || "Upload failed"}`);
      }
    } catch {
      setVoiceStatus("Error: Failed to upload voice sample.");
    } finally {
      setVoiceUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link
            href="/"
            className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-lg font-bold text-transparent"
          >
            DoppelPod
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user.email}
            </span>
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700 transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30"
              onClick={() => setFeedbackOpen(true)}
            >
              <svg className="h-4 w-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Feedback
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              onClick={() => signOut()}
            >
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 pt-24 pb-16 space-y-8">
        {!emailConfirmed && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-950/20 p-4 flex items-center gap-3">
            <span className="text-xl">✉️</span>
            <div>
              <p className="text-sm font-medium text-yellow-400">Confirm your email to unlock all features</p>
              <p className="text-xs text-muted-foreground mt-0.5">Check your inbox for a confirmation link. Voice generation, video, Cowork, and data export are locked until confirmed.</p>
            </div>
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your AI twin, view past generations, and upgrade your plan.
          </p>
        </motion.div>

        {/* Account Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Account</CardTitle>
              <button
                  onClick={() => setShowAccountSettings(!showAccountSettings)}
                  className="flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-[11px] font-medium text-purple-400 uppercase tracking-wider hover:bg-purple-500/15 hover:text-purple-300 transition-all"
                >
                  <svg
                    className={`h-3 w-3 transition-transform duration-200 ${showAccountSettings ? "rotate-90" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  Account Settings
                </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground">Plan:</span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${
                    tierColors[effectiveTier] || tierColors.expired
                  }`}
                >
                  {effectiveTier === "trial"
                    ? `Trial (${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} left)`
                    : effectiveTier}
                </span>
                {(effectiveTier === "expired" || activePlan === "trial") && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
                      onClick={() => {
                        setCheckoutTier("pro");
                        setCheckoutOpen(true);
                      }}
                    >
                      Upgrade to Pro
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                      onClick={() => {
                        setCheckoutTier("elite");
                        setCheckoutOpen(true);
                      }}
                    >
                      Go Elite
                    </Button>
                  </div>
                )}
                {activePlan === "pro" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                    onClick={() => {
                      setCheckoutTier("elite");
                      setCheckoutOpen(true);
                    }}
                  >
                    Upgrade to Elite
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Email:</span>
                <span className="text-sm">{user.email}</span>
              </div>
              {/* Usage stats */}
              {usage && (
                <div className="border-t border-border/50 pt-3 space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Usage This Month</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                      <p className="text-[10px] text-muted-foreground">Videos</p>
                      <p className="text-sm font-semibold">
                        {usage.video_count}
                        {limits.videoLimit !== null && <span className="text-muted-foreground font-normal">/{limits.videoLimit}</span>}
                        {limits.videoLimit === null && <span className="text-muted-foreground font-normal text-[10px] ml-1">unlimited</span>}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                      <p className="text-[10px] text-muted-foreground">Cowork Today</p>
                      <p className="text-sm font-semibold">
                        {usage.cowork_sessions_today}
                        {limits.coworkDailyLimit !== null && <span className="text-muted-foreground font-normal">/{limits.coworkDailyLimit}</span>}
                        {limits.coworkDailyLimit === null && <span className="text-muted-foreground font-normal text-[10px] ml-1">unlimited</span>}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Actions */}
              {showAccountSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="border-t border-border/50 pt-4"
              >
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    onClick={() => setShowChangePassword(!showChangePassword)}
                  >
                    Change Password
                  </Button>
                  {(activePlan === "pro" || activePlan === "elite") ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      onClick={handleBillingPortal}
                      disabled={billingLoading}
                    >
                      {billingLoading ? "Opening..." : "Manage Subscription"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full justify-start bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
                      onClick={() => {
                        setCheckoutTier("pro");
                        setCheckoutOpen(true);
                        setShowAccountSettings(false);
                      }}
                    >
                      Upgrade — Subscribe to a Plan
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    onClick={handleExportData}
                    disabled={exportLoading || effectiveTier === "expired" || !emailConfirmed}
                    title={!emailConfirmed ? "Confirm your email to export data" : effectiveTier === "expired" ? "Upgrade to export your data" : undefined}
                  >
                    {exportLoading ? "Exporting..." : !emailConfirmed ? "Export Data (Confirm Email)" : effectiveTier === "expired" ? "Export Data (Upgrade Required)" : "Export Data"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                    disabled={!emailConfirmed}
                    title={!emailConfirmed ? "Confirm your email to delete your account" : undefined}
                  >
                    {!emailConfirmed ? "Delete Account (Confirm Email)" : "Delete Account"}
                  </Button>
                </div>

                {/* Change Password Form */}
                {showChangePassword && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3 rounded-lg border border-border/50 bg-muted/10 p-4"
                  >
                    <input
                      type="password"
                      placeholder="New password"
                      className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      className="w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
                        onClick={handleChangePassword}
                        disabled={passwordLoading}
                      >
                        {passwordLoading ? "Updating..." : "Update Password"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border/50"
                        onClick={() => {
                          setShowChangePassword(false);
                          setNewPassword("");
                          setConfirmPassword("");
                          setPasswordStatus(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Delete Account Confirmation */}
                {showDeleteConfirm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3 rounded-lg border border-red-500/20 bg-red-950/10 p-4"
                  >
                    <p className="text-sm text-red-400">
                      This will permanently delete your account, all generations, voice data, and cancel any active subscription. This cannot be undone.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm:
                    </p>
                    <input
                      type="text"
                      placeholder="Type DELETE to confirm"
                      className="w-full rounded-md border border-red-500/30 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-red-600 text-white border-0 hover:bg-red-700"
                        onClick={handleDeleteAccount}
                        disabled={deleteLoading || deleteConfirmText !== "DELETE"}
                      >
                        {deleteLoading ? "Deleting..." : "Permanently Delete"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border/50"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Status messages */}
                {passwordStatus && (
                  <p className={`text-xs ${passwordStatus.type === "error" ? "text-red-400" : "text-green-400"}`}>
                    {passwordStatus.message}
                  </p>
                )}
              </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Text Generation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="relative"
        >
          {effectiveTier === "expired" && <ExpiredOverlay onUpgrade={() => { setCheckoutTier("pro"); setCheckoutOpen(true); }} />}
          <Card className={`border-border/50 bg-card/50 ${effectiveTier === "expired" ? "pointer-events-none" : ""}`}>
            <CardHeader>
              <CardTitle className="text-lg">Generate</CardTitle>
            </CardHeader>
            <CardContent>
              <GenerateWidget placeholder="Type or paste your text here..." />
            </CardContent>
          </Card>
        </motion.div>

        {/* Voice Clone Manager */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="relative"
        >
          {effectiveTier === "expired" && <ExpiredOverlay onUpgrade={() => { setCheckoutTier("pro"); setCheckoutOpen(true); }} />}
          <Card className={`border-border/50 bg-card/50 ${effectiveTier === "expired" ? "pointer-events-none" : ""}`}>
            <CardHeader>
              <CardTitle className="text-lg">Voice Clone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a voice sample (30s–2min) to create your AI voice clone.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleVoiceUpload}
                />
                <Button
                  variant="outline"
                  className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                  onClick={() => fileRef.current?.click()}
                  disabled={voiceUploading}
                >
                  {voiceUploading ? "Uploading..." : "Upload Voice Sample"}
                </Button>
                {voiceStatus && (
                  <span
                    className={`text-xs ${
                      voiceStatus.startsWith("Error")
                        ? "text-red-400"
                        : "text-green-400"
                    }`}
                  >
                    {voiceStatus}
                  </span>
                )}
              </div>
              {profile.voice_id && (
                <div className="rounded-md border border-green-500/20 bg-green-500/5 px-3 py-2">
                  <p className="text-xs text-green-400">
                    Voice sample configured. Your AI twin will use your cloned
                    voice.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Past Generations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="relative"
        >
          {effectiveTier === "expired" && <ExpiredOverlay onUpgrade={() => { setCheckoutTier("pro"); setCheckoutOpen(true); }} />}
          <Card className={`border-border/50 bg-card/50 ${effectiveTier === "expired" ? "pointer-events-none" : ""}`}>
            <CardHeader>
              <CardTitle className="text-lg">Past Generations</CardTitle>
            </CardHeader>
            <CardContent>
              {generations.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No generations yet.
                  </p>
                  <Link href="/#demo">
                    <Button
                      className="mt-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
                      size="sm"
                    >
                      Try the Demo
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {generations.map((gen) => (
                    <div
                      key={gen.id}
                      className="rounded-lg border border-border/50 p-4 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Input
                          </p>
                          <p className="text-sm leading-relaxed line-clamp-2">
                            {gen.input_text}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            AI Twin Output
                          </p>
                          <p className="text-sm leading-relaxed text-purple-300">
                            {gen.output_text}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(gen.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        tier={checkoutTier}
        price={tierInfo[checkoutTier].price}
        features={tierInfo[checkoutTier].features}
        onSuccess={(tier) => setActivePlan(tier)}
      />

      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  );
}
