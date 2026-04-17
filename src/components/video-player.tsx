"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Video, Download, RefreshCw, AlertCircle, Loader2 } from "lucide-react";

interface VideoPlayerProps {
  videoUrl: string | null;
  videoLoading: boolean;
  videoProgress: number;
  videoError: string;
  posterUrl?: string;
  onGenerate: () => void;
  onRegenerate: () => void;
  disabled?: boolean;
}

function getStatusMessage(progress: number): string {
  if (progress < 15) return "Creating your avatar...";
  if (progress < 40) return "Generating lip-sync...";
  if (progress < 70) return "Rendering video...";
  if (progress < 95) return "Almost done...";
  return "Finalizing...";
}

async function downloadVideo(url: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `doppelpod-video-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    // Fallback: open in new tab if cross-origin fetch fails
    window.open(url, "_blank");
  }
}

export function VideoPlayer({
  videoUrl,
  videoLoading,
  videoProgress,
  videoError,
  posterUrl,
  onGenerate,
  onRegenerate,
  disabled,
}: VideoPlayerProps) {
  // Idle state — show generate button
  if (!videoLoading && !videoUrl && !videoError) {
    return (
      <Button
        variant="outline"
        className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20"
        onClick={onGenerate}
        disabled={disabled}
      >
        <Video className="mr-2 h-4 w-4" />
        Generate Talking Video
      </Button>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {/* Loading state */}
      {videoLoading && (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-3 py-2"
        >
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
            <span className="text-sm text-purple-300">
              {getStatusMessage(videoProgress)}
            </span>
          </div>
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-purple-950/50">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                style={{ boxShadow: "0 0 8px rgba(168, 85, 247, 0.4)" }}
                initial={{ width: "0%" }}
                animate={{ width: `${videoProgress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-right tabular-nums">
              {Math.round(videoProgress)}%
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            HeyGen is rendering your video — this typically takes 1-2 minutes
          </p>
        </motion.div>
      )}

      {/* Video player */}
      {videoUrl && !videoLoading && (
        <motion.div
          key="player"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="space-y-3"
        >
          <div className="relative overflow-hidden rounded-xl border border-purple-500/30 bg-black">
            <video
              src={videoUrl}
              controls
              playsInline
              className="w-full max-h-[480px] sm:max-h-[480px] max-h-[60vh] rounded-xl"
              poster={posterUrl}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 text-xs"
              onClick={() => downloadVideo(videoUrl)}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 text-xs"
              onClick={onRegenerate}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Regenerate
            </Button>
          </div>
        </motion.div>
      )}

      {/* Error state */}
      {videoError && !videoLoading && (
        <motion.div
          key="error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-3"
        >
          <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-950/20 px-3 py-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <div className="space-y-1">
              <p className="text-xs text-amber-400">{videoError}</p>
              <p className="text-[10px] text-muted-foreground">
                If this keeps happening, contact support or try again in a moment.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10 text-xs"
            onClick={() => {
              onRegenerate();
              onGenerate();
            }}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Try Again
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
