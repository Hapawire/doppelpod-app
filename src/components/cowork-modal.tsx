"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface CoworkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialScript: string;
  onScriptUpdate: (script: string) => void;
  voiceStrength: number;
}

export function CoworkModal({
  open,
  onOpenChange,
  initialScript,
  onScriptUpdate,
  voiceStrength,
}: CoworkModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [script, setScript] = useState(initialScript);
  const [loading, setLoading] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [fallbackError, setFallbackError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Sync script from parent when modal opens
  useEffect(() => {
    if (open) {
      setScript(initialScript);
      if (messages.length === 0) {
        setMessages([
          {
            role: "assistant",
            content:
              "Hey! I'm your Cowork partner. I can help you refine this script — stronger hooks, better CTAs, more engagement. What would you like to improve?",
          },
        ]);
      }
    }
  }, [open, initialScript, messages.length]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setSpeakingIdx(null);
  }, []);

  // Cleanup on close
  useEffect(() => {
    if (!open) cleanupAudio();
  }, [open, cleanupAudio]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setFallbackError("");

    try {
      const res = await fetch("/api/cowork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          script,
          creatorStyle: "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fallback) {
          setFallbackError(data.error);
          setLoading(false);
          return;
        }
        throw new Error(data.error || "Failed to get response");
      }

      const assistantMsg: Message = { role: "assistant", content: data.text };
      setMessages([...newMessages, assistantMsg]);

      // Check if Claude suggested a script rewrite (look for code blocks)
      const codeBlockMatch = data.text.match(/```[\s\S]*?\n([\s\S]*?)```/);
      if (codeBlockMatch) {
        setScript(codeBlockMatch[1].trim());
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setMessages([
        ...newMessages,
        { role: "assistant", content: `Error: ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSpeak(text: string, index: number) {
    cleanupAudio();

    try {
      setSpeakingIdx(index);
      const res = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.slice(0, 800),
          stability: voiceStrength / 100,
        }),
      });

      if (!res.ok) {
        setSpeakingIdx(null);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.addEventListener("ended", () => setSpeakingIdx(null));
      audio.addEventListener("error", () => setSpeakingIdx(null));
      await audio.play();
    } catch {
      setSpeakingIdx(null);
    }
  }

  function handleApplyScript() {
    onScriptUpdate(script);
    onOpenChange(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-background/95 backdrop-blur-xl border-purple-500/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-bold text-white">
              C
            </span>
            Claude Cowork
            <span className="ml-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-400 border border-purple-500/20">
              ELITE
            </span>
          </DialogTitle>
          <DialogDescription>
            Collaborate with Claude to refine your script in real-time
          </DialogDescription>
        </DialogHeader>

        {/* Fallback for no API key */}
        {fallbackError && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-950/20 px-3 py-2"
          >
            <svg
              className="h-4 w-4 shrink-0 text-amber-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <p className="text-xs text-amber-400">{fallbackError}</p>
          </motion.div>
        )}

        {/* Two-panel layout */}
        <div className="flex flex-1 gap-3 min-h-0 overflow-hidden flex-col sm:flex-row">
          {/* Chat panel */}
          <div className="flex flex-1 flex-col min-h-0 min-w-0">
            <div className="mb-2 flex items-center gap-1.5">
              <svg
                className="h-3.5 w-3.5 text-purple-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="text-[10px] font-medium text-purple-400 uppercase tracking-wider">
                Chat
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[180px] max-h-[280px] sm:max-h-none">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                          : "bg-muted/50 border border-border/50 text-foreground"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.role === "assistant" && i > 0 && (
                        <button
                          onClick={() => handleSpeak(msg.content, i)}
                          className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-purple-400 transition-colors"
                        >
                          {speakingIdx === i ? (
                            <>
                              <svg
                                className="h-3 w-3 animate-pulse"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <rect x="4" y="4" width="4" height="16" rx="1" />
                                <rect x="10" y="4" width="4" height="16" rx="1" />
                                <rect x="16" y="4" width="4" height="16" rx="1" />
                              </svg>
                              Speaking...
                            </>
                          ) : (
                            <>
                              <svg
                                className="h-3 w-3"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                              </svg>
                              Listen
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex items-center gap-2 rounded-xl bg-muted/50 border border-border/50 px-3 py-2">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="mt-2 flex gap-2">
              <Textarea
                placeholder="Ask Claude to improve your hook, CTA, or tone..."
                className="min-h-[40px] max-h-[80px] resize-none text-xs focus-visible:ring-1 focus-visible:ring-purple-500/50 focus-visible:border-purple-500/50"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button
                size="sm"
                className="shrink-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
                onClick={handleSend}
                disabled={!input.trim() || loading}
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" x2="11" y1="2" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Script panel */}
          <div className="flex flex-col sm:w-[45%] shrink-0 min-h-0">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <svg
                  className="h-3.5 w-3.5 text-purple-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" x2="8" y1="13" y2="13" />
                  <line x1="16" x2="8" y1="17" y2="17" />
                </svg>
                <span className="text-[10px] font-medium text-purple-400 uppercase tracking-wider">
                  Script
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {script.length} chars
              </span>
            </div>
            <Textarea
              className="flex-1 min-h-[120px] resize-none text-xs leading-relaxed focus-visible:ring-1 focus-visible:ring-purple-500/50 focus-visible:border-purple-500/50"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Your script will appear here..."
            />
            <Button
              size="sm"
              className="mt-2 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700 text-xs transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30"
              onClick={handleApplyScript}
            >
              <svg
                className="mr-1.5 h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Apply Script & Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
