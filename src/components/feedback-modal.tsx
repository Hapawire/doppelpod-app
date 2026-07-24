"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail?: string | null;
}

export function FeedbackModal({ open, onOpenChange, userEmail }: FeedbackModalProps) {
  const [type, setType] = useState<"bug" | "feature" | "other">("feature");
  const [text, setText] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function reset() {
    setText("");
    setType("feature");
    setContactEmail("");
    setStatus("idle");
    setErrorMsg("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message: text.trim(),
          ...(!userEmail && contactEmail.trim() ? { email: contactEmail.trim() } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send feedback");
      }

      setStatus("success");
      setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  const types = [
    { value: "bug" as const, label: "Bug Report", icon: "🐛" },
    { value: "feature" as const, label: "Feature Request", icon: "✨" },
    { value: "other" as const, label: "Other", icon: "💬" },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-md border-purple-500/30 bg-card p-0">
        <DialogTitle className="sr-only">Send Feedback</DialogTitle>

        {status === "success" ? (
          <div className="flex flex-col items-center gap-3 py-12 px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500">
              <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-lg font-semibold">Thanks for the feedback!</p>
            <p className="text-sm text-muted-foreground text-center">
              We read every message. You&apos;re helping shape DoppelPod.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div>
              <p className="text-lg font-semibold">Send Feedback</p>
              <p className="text-sm text-muted-foreground mt-1">
                Bug, feature idea, or just a thought — we want to hear it.
              </p>
            </div>

            {/* Type selector */}
            <div className="flex gap-2">
              {types.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                    type === t.value
                      ? "border-purple-500 bg-purple-500/15 text-purple-300"
                      : "border-border/50 text-muted-foreground hover:border-purple-500/30 hover:text-foreground"
                  }`}
                  onClick={() => setType(t.value)}
                >
                  <span className="block text-base mb-0.5">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Message */}
            <textarea
              placeholder={
                type === "bug"
                  ? "What happened? What did you expect?"
                  : type === "feature"
                  ? "What would you like to see?"
                  : "What's on your mind?"
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none placeholder:text-muted-foreground/60"
            />

            {/* Optional contact email — only shown when not signed in, since
                signed-in submissions are already attributed via the account. */}
            {!userEmail && (
              <input
                type="email"
                placeholder="Email (optional, if you'd like a reply)"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full rounded-lg border border-border/50 bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder:text-muted-foreground/60"
              />
            )}

            {status === "error" && errorMsg && (
              <p className="text-xs text-red-400 rounded-md bg-red-500/10 px-3 py-2">
                {errorMsg}
              </p>
            )}

            <Button
              type="submit"
              disabled={!text.trim() || status === "loading"}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
            >
              {status === "loading" ? "Sending..." : "Send Feedback"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
