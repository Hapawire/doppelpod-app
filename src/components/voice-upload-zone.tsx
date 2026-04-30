"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileAudio, X } from "lucide-react";

interface VoiceUploadZoneProps {
  onFile: (file: File) => void;
  uploading?: boolean;
}

const ACCEPTED_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "video/mp4",     // QuickTime .m4a reports as video/mp4
  "audio/ogg",
  "audio/webm",
  "audio/aac",     // Safari MediaRecorder
  "audio/x-aac",
];
const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

function isAudioFile(f: File): boolean {
  // Accept by MIME type or by extension as fallback
  if (ACCEPTED_TYPES.includes(f.type)) return true;
  const ext = f.name.split(".").pop()?.toLowerCase();
  return ["mp3", "wav", "m4a", "ogg", "webm", "mp4"].includes(ext ?? "");
}

export function VoiceUploadZone({ onFile, uploading }: VoiceUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (f: File) => {
      setError("");
      if (!isAudioFile(f)) {
        setError("Please upload an MP3, WAV, M4A, OGG, or WebM file.");
        return;
      }
      if (f.size > MAX_SIZE) {
        setError("File must be under 25 MB.");
        return;
      }
      setSelectedFile(f);
      onFile(f);
    },
    [onFile]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  }

  function handleClear() {
    setSelectedFile(null);
    setError("");
  }

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={uploading ? -1 : 0}
        aria-label="Upload voice sample — click or drag a file here"
        className={`relative flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-all duration-150 cursor-pointer outline-none
          ${uploading ? "pointer-events-none opacity-50" : ""}
          ${
            dragOver
              ? "border-purple-400 bg-purple-950/40 scale-[1.01]"
              : selectedFile
              ? "border-green-500/40 bg-green-950/10"
              : "border-border/50 bg-card hover:border-purple-500/40 hover:bg-purple-950/10"
          }
          focus-visible:ring-2 focus-visible:ring-purple-500/50`}
        onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true); }}
        onDragEnter={(e) => { e.preventDefault(); if (!uploading) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleInput}
          disabled={uploading}
        />

        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex flex-col items-center gap-1.5"
            >
              <Upload className="h-6 w-6 animate-pulse text-purple-400" />
              <p className="text-sm font-medium text-purple-300">Uploading…</p>
            </motion.div>
          ) : dragOver ? (
            <motion.div
              key="dragover"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-1.5"
            >
              <Upload className="h-6 w-6 animate-bounce text-purple-400" />
              <p className="text-sm font-medium text-purple-300">Drop to upload</p>
            </motion.div>
          ) : selectedFile ? (
            <motion.div
              key="selected"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex flex-col items-center gap-1.5"
            >
              <FileAudio className="h-6 w-6 text-green-400" />
              <p className="text-sm font-medium text-green-300 max-w-[200px] truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex flex-col items-center gap-1.5"
            >
              <Upload className="h-6 w-6 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground/70">
                Drop a file or <span className="text-purple-400">click to browse</span>
              </p>
              <p className="text-xs text-muted-foreground">
                MP3, WAV, M4A, OGG or WebM · max 25 MB · 15–60 seconds recommended
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Clear / validation */}
      <AnimatePresence>
        {selectedFile && !uploading && (
          <motion.button
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 transition-colors"
          >
            <X className="h-2.5 w-2.5" />
            Remove file
          </motion.button>
        )}
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-[11px] text-red-400"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
