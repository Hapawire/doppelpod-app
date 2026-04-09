"use client";

import { useRef, useState, useEffect } from "react";

interface VoiceRecorderProps {
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
}

type RecordState = "idle" | "requesting" | "recording" | "recorded" | "error";

export function VoiceRecorder({ onUpload, uploading }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef = useRef<Blob | null>(null);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [audioUrl]);

  function getMimeType(): string {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "audio/mp4";
  }

  async function startRecording() {
    setErrorMsg(null);
    setState("requesting");

    // Check permission state first — if already denied, no dialog will ever appear
    try {
      const perm = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (perm.state === "denied") {
        setErrorMsg(
          "Microphone access is blocked. Click the lock icon in your browser's address bar, set Microphone to 'Allow', then reload the page."
        );
        setState("error");
        return;
      }
    } catch {
      // permissions API not supported in this browser — fall through to getUserMedia
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState("recorded");
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      recorder.start(250); // collect chunks every 250ms
      setState("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err: unknown) {
      console.error("[VoiceRecorder] mic error:", err);
      const name = (err as { name?: string })?.name;
      const msg =
        name === "NotAllowedError" || name === "PermissionDeniedError"
          ? "Microphone access was denied. Click the lock icon in your browser's address bar, set Microphone to 'Allow', then reload the page."
          : name === "NotFoundError"
          ? "No microphone found. Please connect a microphone and try again."
          : "Could not access microphone. Please check your browser settings and try again.";
      setErrorMsg(msg);
      setState("error");
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
  }

  function reset() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    blobRef.current = null;
    setSeconds(0);
    setErrorMsg(null);
    setState("idle");
  }

  async function handleUseRecording() {
    if (!blobRef.current) return;
    const mimeType = blobRef.current.type;
    const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";
    const file = new File([blobRef.current], `voice-sample.${ext}`, { type: mimeType });
    await onUpload(file);
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  // ── Idle ─────────────────────────────────────────────────────────────────
  if (state === "idle" || state === "requesting" || state === "error") {
    return (
      <div className="space-y-3">
        <button
          onClick={startRecording}
          disabled={state === "requesting"}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/50 bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          <span className="flex h-2 w-2 rounded-full bg-red-500" />
          {state === "requesting" ? "Requesting mic access…" : "Start recording"}
        </button>
        {errorMsg && (
          <p className="text-xs text-destructive">{errorMsg}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Speak naturally for 15–60 seconds. Quiet environment recommended.
        </p>
      </div>
    );
  }

  // ── Recording ─────────────────────────────────────────────────────────────
  if (state === "recording") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-950/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-sm font-medium text-red-400">Recording</span>
          </div>
          <span className="font-mono text-sm tabular-nums text-muted-foreground">
            {formatTime(seconds)}
          </span>
        </div>
        <button
          onClick={stopRecording}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/50 bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          <span className="flex h-3 w-3 rounded-sm bg-foreground" />
          Stop
        </button>
        {seconds < 15 && (
          <p className="text-xs text-muted-foreground">
            Keep going — aim for at least 15 seconds.
          </p>
        )}
      </div>
    );
  }

  // ── Recorded ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/50 bg-card/50 p-3">
        <p className="mb-2 text-xs text-muted-foreground">Preview your recording:</p>
        {audioUrl && (
          <audio controls src={audioUrl} className="h-8 w-full" />
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={reset}
          disabled={uploading}
          className="flex-1 rounded-lg border border-border/50 bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          Re-record
        </button>
        <button
          onClick={handleUseRecording}
          disabled={uploading}
          className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Use this recording"}
        </button>
      </div>
    </div>
  );
}
