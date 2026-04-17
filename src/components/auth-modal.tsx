"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth-provider";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "signup";
  redirectOnLogin?: string;
}

export function AuthModal({
  open,
  onOpenChange,
  defaultTab = "login",
  redirectOnLogin,
}: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "signup" | "forgot">(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();

  function reset() {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (tab === "forgot") {
      if (!email) {
        setError("Email is required.");
        return;
      }
      setLoading(true);
      const result = await resetPassword(email);
      setLoading(false);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Check your email for a password reset link.");
      }
      return;
    }

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (tab === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const result =
      tab === "login" ? await signIn(email, password) : await signUp(email, password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (tab === "signup") {
      setSuccess("Account created! Check your email to confirm, or log in now.");
    } else {
      onOpenChange(false);
      reset();
      window.location.href = redirectOnLogin ?? "/dashboard";
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-sm border-purple-500/30 bg-card p-0">
        <DialogTitle className="sr-only">
          {tab === "forgot" ? "Reset Password" : tab === "login" ? "Log In" : "Sign Up"}
        </DialogTitle>

        {/* Tabs */}
        {tab === "forgot" ? (
          <div className="flex items-center border-b border-border/50 px-4 py-3">
            <button
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                setTab("login");
                setError("");
                setSuccess("");
              }}
            >
              ← Back to Log In
            </button>
          </div>
        ) : (
          <div className="flex border-b border-border/50">
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === "login"
                  ? "border-b-2 border-purple-500 text-purple-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => {
                setTab("login");
                setError("");
                setSuccess("");
              }}
            >
              Log In
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === "signup"
                  ? "border-b-2 border-purple-500 text-purple-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => {
                setTab("signup");
                setError("");
                setSuccess("");
              }}
            >
              Sign Up
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Email
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus-visible:ring-purple-500/50"
            />
          </div>

          {tab !== "forgot" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus-visible:ring-purple-500/50 pr-16"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          {tab === "login" && (
            <button
              type="button"
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              onClick={() => {
                setTab("forgot");
                setError("");
                setSuccess("");
              }}
            >
              Forgot password?
            </button>
          )}

          {tab === "signup" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="focus-visible:ring-purple-500/50 pr-16"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-md bg-green-500/10 px-3 py-2 text-xs text-green-400">
              {success}
            </p>
          )}

          {tab === "signup" && (
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              By creating an account you agree to our{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
                Privacy Policy
              </a>
              . We&apos;ll email you account and billing updates.
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
          >
            {loading
              ? "Please wait..."
              : tab === "forgot"
              ? "Send Reset Link"
              : tab === "login"
              ? "Log In"
              : "Create Account"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
