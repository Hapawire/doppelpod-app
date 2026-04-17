"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Waveform } from "@/components/waveform";
import { Slider } from "@/components/ui/slider";
import { AvatarUpload } from "@/components/avatar-upload";
import { VideoPlayer } from "@/components/video-player";
import { FeatureGate, UsageBadge } from "@/components/feature-gate";
import { HelpModal } from "@/components/help-modal";

interface GenerateWidgetProps {
  onCoworkOpen?: () => void;
  placeholder?: string;
}

export function GenerateWidget({ onCoworkOpen, placeholder }: GenerateWidgetProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [aiOutput, setAiOutput] = useState(""); // stores AI-generated text so bypass is reversible
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bypassMode, setBypassMode] = useState(false);

  // Voice state
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [voiceStrength, setVoiceStrength] = useState(75);
  const [voicePreset, setVoicePreset] = useState<"creative" | "balanced" | "clone" | "custom">("balanced");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Video state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState("");
  const [isPhotoJob, setIsPhotoJob] = useState(false);
  const videoPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Saved avatar state
  const [savedAvatarId, setSavedAvatarId] = useState<string | null>(null);
  const [useSavedAvatar, setUseSavedAvatar] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    fetch("/api/user-avatars")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.avatarId) {
          setSavedAvatarId(data.avatarId);
          setUseSavedAvatar(true); // default to saved avatar if one exists
        }
      })
      .catch(() => {});
  }, []);

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

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (videoPollingRef.current) clearInterval(videoPollingRef.current);
    };
  }, []);

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
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
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

  async function runAIEnhancement(rawText: string) {
    setLoading(true);
    setBypassMode(false);
    cleanupAudio();
    setOutput("");

    try {
      const res = await fetch("/api/generate-twin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts: rawText, mode: "enhance" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      if (data.fallback || !data.text) {
        const lines = rawText.split("\n").filter((l) => l.trim()).slice(0, 3);
        const twinPost =
          lines.length > 0
            ? `AI Twin version:\n\n"${lines[0].trim().replace(/^["']|["']$/g, "")} — but make it 10x more magnetic.\n\nHere's the thing most people won't tell you: consistency beats virality. Your AI twin knows this.\n\n🔥 Drop a follow if this hits different."`
            : "Paste some posts above to see your AI twin in action!";
        setOutput(twinPost);
        setAiOutput(twinPost);
      } else {
        setOutput(data.text);
        setAiOutput(data.text);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setOutput(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!input.trim()) return;

    // /exact command — bypass AI enhancement and use input verbatim
    const exactMatch = input.match(/^\/exact\s+([\s\S]+)/i);
    if (exactMatch) {
      cleanupAudio();
      setAiOutput("");
      setOutput(exactMatch[1].trim());
      setBypassMode(true);
      return;
    }

    setAiOutput("");
    await runAIEnhancement(input);
  }

  async function handleTextToSpeech() {
    if (!output) return;
    setTtsLoading(true);
    setTtsError("");
    cleanupAudio();

    try {
      const res = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: output, stability: voiceStrength / 100 }),
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
        audio.play().then(() => setIsPlaying(true)).catch(() => {});
      }, { once: true });
      audio.addEventListener("error", () => {
        setTtsError("Failed to load audio.");
        setTtsLoading(false);
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "TTS failed";
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

  async function handleGenerateVideo() {
    if (!output) return;
    setVideoLoading(true);
    setVideoProgress(0);
    setVideoUrl(null);
    setVideoError("");
    const usingNewPhoto = !useSavedAvatar && !!avatarFile;
    const usingPhoto = useSavedAvatar ? !!savedAvatarId : !!avatarFile;
    setIsPhotoJob(usingPhoto);

    try {
      const formData = new FormData();
      formData.append("script", output);
      if (useSavedAvatar && savedAvatarId) {
        formData.append("savedAvatarId", savedAvatarId);
      } else if (usingNewPhoto && avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const res = await fetch("/api/generate-video", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fallback) {
          setVideoError(data.error);
        } else {
          throw new Error(data.error || "Video generation failed");
        }
        setVideoLoading(false);
        return;
      }

      const { jobId } = data;

      // New photo upload needs avatar creation (15-25 min); saved avatar or default ~3-5 min
      const timeoutSecs = usingNewPhoto ? 35 * 60 : 10 * 60;
      const maxProgressSecs = usingNewPhoto ? 25 * 60 : 5 * 60;

      let elapsed = 0;
      let consecutiveErrors = 0;
      videoPollingRef.current = setInterval(async () => {
        elapsed += 10;
        setVideoProgress(Math.min(90, (elapsed / maxProgressSecs) * 90));

        try {
          const statusRes = await fetch(`/api/video-jobs/${jobId}`);
          const job = await statusRes.json();
          consecutiveErrors = 0;

          if (job.status === "completed" && job.heygen_video_url) {
            if (videoPollingRef.current) clearInterval(videoPollingRef.current);
            setVideoProgress(100);
            setVideoUrl(job.heygen_video_url);
            setVideoLoading(false);
          } else if (job.status === "failed") {
            if (videoPollingRef.current) clearInterval(videoPollingRef.current);
            setVideoError(job.error_message || "Video generation failed. Please try again.");
            setVideoLoading(false);
          }
        } catch {
          consecutiveErrors++;
          if (consecutiveErrors >= 3) {
            if (videoPollingRef.current) clearInterval(videoPollingRef.current);
            setVideoError("Lost connection while generating video. Please try again.");
            setVideoLoading(false);
          }
        }

        if (elapsed > timeoutSecs) {
          if (videoPollingRef.current) clearInterval(videoPollingRef.current);
          setVideoError("Video generation timed out. Please try again.");
          setVideoLoading(false);
        }
      }, 10000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Video generation failed";
      setVideoError(msg);
      setVideoLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          Tip: start with <span className="font-mono text-purple-400/70">/exact</span> to skip the AI rewrite — e.g. <span className="font-mono text-purple-400/70">/exact &lt;Your text here&gt;</span>
        </p>
        <button
          onClick={() => setHelpOpen(true)}
          className="shrink-0 text-[11px] text-purple-400/70 hover:text-purple-300 underline underline-offset-2 transition-colors"
        >
          Need help?
        </button>
      </div>
      <Textarea
        placeholder={placeholder || "Paste 3-5 of your recent posts here (one per line)..."}
        className="min-h-[120px] resize-none sm:min-h-[140px] focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:border-purple-500/50"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (input.trim() && !loading) handleGenerate();
          }
        }}
      />
      <Button
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30"
        onClick={handleGenerate}
        disabled={loading || !input.trim()}
      >
        {loading ? (
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

      {/* Output */}
      {output && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 rounded-lg border border-purple-500/30 bg-purple-950/20 p-4"
        >
          {/* Header + copy */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-medium text-purple-400">
                {bypassMode ? "YOUR EXACT WORDS:" : "YOUR AI TWIN WROTE:"}
              </p>
              {!bypassMode && (
                <button
                  onClick={() => {
                    cleanupAudio();
                    setOutput(input.replace(/^\/exact\s*/i, "").trim() || input.trim());
                    setBypassMode(true);
                  }}
                  className="rounded-md bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-600 hover:to-pink-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-all shadow-sm shadow-purple-500/20"
                  title="Use your original text verbatim — skip the AI rewrite"
                >
                  use my exact words
                </button>
              )}
              {bypassMode && (
                <button
                  onClick={() => {
                    if (aiOutput) {
                      // Already have AI output — flip instantly
                      cleanupAudio();
                      setOutput(aiOutput);
                      setBypassMode(false);
                    } else {
                      // No AI output yet — run enhancement on the raw text
                      const raw = input.replace(/^\/exact\s*/i, "").trim() || input.trim();
                      runAIEnhancement(raw);
                    }
                  }}
                  disabled={loading}
                  className="rounded-md bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-600 hover:to-pink-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-all shadow-sm shadow-purple-500/20 disabled:opacity-50"
                  title={aiOutput ? "Switch back to the AI-enhanced version" : "Enhance this text with your AI twin"}
                >
                  {loading ? "Enhancing…" : "✦ AI Enhanced"}
                </button>
              )}
            </div>
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
          <p className="whitespace-pre-wrap text-xs leading-relaxed sm:text-sm">{output}</p>

          {/* Cowork button */}
          {onCoworkOpen && (
            <Button
              variant="outline"
              className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20"
              onClick={onCoworkOpen}
            >
              <span className="mr-2 flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-purple-500 to-pink-500 text-[10px] font-bold text-white">
                C
              </span>
              Claude Cowork — Refine with AI
              <span className="ml-auto rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-medium text-purple-400 border border-purple-500/20">
                ELITE
              </span>
            </Button>
          )}

          {/* Voice section */}
          <FeatureGate feature="voice">
            <div className="border-t border-purple-500/20 pt-4 space-y-4">
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
                      <span className="text-xs font-medium text-purple-400">Voice Strength</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{voiceStrength}%</span>
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
                  <Waveform isPlaying={isPlaying} progress={audioProgress} className="rounded" />
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
          </FeatureGate>

          {/* Video Avatar Section */}
          <FeatureGate feature="video">
            <div className="border-t border-purple-500/20 pt-4 space-y-4">
              <p className="text-xs font-medium text-purple-400">
                TALKING VIDEO AVATAR
                <UsageBadge feature="video" />
              </p>

              {/* Saved avatar toggle */}
              {savedAvatarId && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setUseSavedAvatar(true)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                      useSavedAvatar
                        ? "border-purple-500 bg-purple-500/15 text-purple-300"
                        : "border-border/50 text-muted-foreground hover:border-purple-500/30 hover:text-purple-400"
                    }`}
                  >
                    <span className="block text-[10px] mb-0.5 opacity-60">SAVED</span>
                    Use my avatar
                  </button>
                  <button
                    onClick={() => setUseSavedAvatar(false)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                      !useSavedAvatar
                        ? "border-purple-500 bg-purple-500/15 text-purple-300"
                        : "border-border/50 text-muted-foreground hover:border-purple-500/30 hover:text-purple-400"
                    }`}
                  >
                    <span className="block text-[10px] mb-0.5 opacity-60">NEW / DEFAULT</span>
                    Upload new photo / Use default
                  </button>
                </div>
              )}

              {/* Photo upload — only shown when not using saved avatar */}
              {!useSavedAvatar && (
                <>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-950/10 px-3 py-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium text-amber-400">Photo requirements</p>
                      <span className="text-[10px] font-semibold text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5">⏱ 15–60 min to process</span>
                    </div>
                    <ul className="text-[11px] text-foreground/65 space-y-0.5 list-none">
                      <li>✓ Single person only — solo portrait, headshot, or full-body</li>
                      <li>✓ Face clearly visible, well-lit, not obscured</li>
                      <li>✗ No group shots, pets, objects, or landscapes</li>
                      <li>✗ No heavy filters, masks, or heavy obstructions</li>
                    </ul>
                    <p className="text-[10px] text-muted-foreground/60 pt-0.5">
                      Your AI twin requires a clearly detectable face to animate. Non-portrait images will fail during processing. Once created, your avatar is saved for instant reuse.
                    </p>
                  </div>
                  <AvatarUpload
                    file={avatarFile}
                    preview={avatarPreview}
                    onFileChange={(file, preview) => {
                      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                      setAvatarFile(file);
                      setAvatarPreview(preview);
                    }}
                    disabled={videoLoading}
                  />
                </>
              )}
              {!useSavedAvatar && avatarFile && !videoLoading && (
                <p className="text-[11px] text-amber-400/80">
                  ⏱ Custom photo videos take 15–25 min to generate. We&apos;ll email you when it&apos;s ready.
                </p>
              )}
              {!useSavedAvatar && avatarFile && videoLoading && isPhotoJob && (
                <p className="text-[11px] text-purple-400/80">
                  Your video is being processed — we&apos;ll email you when it&apos;s ready. You can close this page.
                </p>
              )}
              <VideoPlayer
                videoUrl={videoUrl}
                videoLoading={videoLoading}
                videoProgress={videoProgress}
                videoError={videoError}
                posterUrl={avatarPreview || undefined}
                onGenerate={handleGenerateVideo}
                onRegenerate={() => {
                  setVideoUrl(null);
                  setVideoProgress(0);
                  setVideoError("");
                }}
                disabled={!output}
              />
            </div>
          </FeatureGate>
        </motion.div>
      )}

      <HelpModal open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
