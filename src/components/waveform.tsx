"use client";

import { useEffect, useRef } from "react";

interface WaveformProps {
  isPlaying: boolean;
  /** 0–1 progress through the audio */
  progress?: number;
  className?: string;
}

export function Waveform({ isPlaying, progress = 0, className = "" }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const progressRef = useRef(progress);
  const playingRef = useRef(isPlaying);
  progressRef.current = progress;
  playingRef.current = isPlaying;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const barCount = 40;
    const gap = 2;
    const barWidth = (rect.width - gap * (barCount - 1)) / barCount;
    // Pre-generate stable "heights" per bar so the idle waveform looks like a real track
    const barSeeds = Array.from({ length: barCount }, () => 0.3 + Math.random() * 0.7);
    const phases = Array.from({ length: barCount }, () => Math.random() * Math.PI * 2);
    const speeds = Array.from({ length: barCount }, () => 2.5 + Math.random() * 3);

    let time = 0;

    function draw() {
      if (!ctx || !canvas) return;
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const prog = progressRef.current;
      const playing = playingRef.current;

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap);
        const barProgress = i / barCount;
        let barHeight: number;

        if (playing) {
          // Animate with sine waves while playing
          barHeight =
            (Math.sin(time * speeds[i] + phases[i]) * 0.35 + 0.55) * h * 0.85;
        } else {
          // Static seed-based heights when paused
          barHeight = barSeeds[i] * h * 0.6 + 4;
        }

        // Color: played portion is bright gradient, unplayed is dimmer
        const played = barProgress <= prog;
        const gradient = ctx.createLinearGradient(x, h, x, h - barHeight);
        if (played) {
          gradient.addColorStop(0, "rgba(168, 85, 247, 0.95)");
          gradient.addColorStop(1, "rgba(236, 72, 153, 0.95)");
        } else {
          gradient.addColorStop(0, "rgba(168, 85, 247, 0.25)");
          gradient.addColorStop(1, "rgba(236, 72, 153, 0.25)");
        }
        ctx.fillStyle = gradient;

        ctx.beginPath();
        ctx.roundRect(x, h - barHeight, barWidth, barHeight, 2);
        ctx.fill();
      }

      time += 0.016;
      animationRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
    // Only re-init on mount (refs handle live values)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full ${className}`}
      style={{ height: 56 }}
    />
  );
}
