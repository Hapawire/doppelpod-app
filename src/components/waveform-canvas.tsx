"use client";

import { useRef, useEffect } from "react";

interface WaveformCanvasProps {
  active?: boolean;
}

const COLS = 72;
const ROWS = 22;
const FOV = 520;
const HORIZON = 0.52;

function project(wx: number, wy: number, wz: number, W: number, H: number) {
  const scale = FOV / (wz + FOV);
  return { sx: W / 2 + wx * scale, sy: H * HORIZON - wy * scale, scale };
}

function getHeight(col: number, row: number, tt: number): number {
  const nx = col / (COLS - 1);
  const nz = row / (ROWS - 1);
  const h =
    Math.sin(nx * Math.PI * 3   + tt * 0.018) * 0.45 +
    Math.sin(nx * Math.PI * 1.4 - tt * 0.012) * 0.30 +
    Math.sin(nx * Math.PI * 5   + tt * 0.025) * 0.15 +
    Math.sin((nx * 2 + nz)      * Math.PI * 2 + tt * 0.010) * 0.10;
  return Math.max(0, h);
}

function peakRGB(nx: number): [number, number, number] {
  const x = 1 - nx; // flip: pink left, indigo right
  if (x < 0.5) {
    const u = x * 2;
    return [
      Math.round(99  + u * 109),
      Math.round(102 - u * 82),
      Math.round(241 - u * 6),
    ];
  } else {
    const u = (x - 0.5) * 2;
    return [
      Math.round(208 + u * 28),
      Math.round(20  + u * 52),
      Math.round(235 - u * 82),
    ];
  }
}

export function WaveformCanvas({ active = false }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);

  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let targetSpeed = 1, currentSpeed = 1;
    let targetAmp   = 1, currentAmp   = 1;
    let t = 0;
    let frame = 0;

    function resize() {
      if (!canvas) return;
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    function draw() {
      if (!canvas || !ctx) return;

      const isActive = activeRef.current;
      targetSpeed = isActive ? 1.8 : 1;
      targetAmp   = isActive ? 1.6 : 1;

      currentSpeed += (targetSpeed - currentSpeed) * 0.02;
      currentAmp   += (targetAmp   - currentAmp)   * 0.015;
      t += currentSpeed;

      const W = canvas.width;
      const H = canvas.height;
      if (W === 0 || H === 0) { frame = requestAnimationFrame(draw); return; }

      ctx.clearRect(0, 0, W, H);

      const WORLD_W    = W * 1.2;
      const WORLD_D_NEAR = FOV * 0.3;
      const WORLD_D_FAR  = FOV * 2.2;

      // Pre-compute heights
      const heights: number[][] = [];
      let maxH = 0;
      for (let row = 0; row < ROWS; row++) {
        heights[row] = [];
        for (let col = 0; col < COLS; col++) {
          heights[row][col] = getHeight(col, row, t);
          if (heights[row][col] > maxH) maxH = heights[row][col];
        }
      }

      for (let row = 0; row < ROWS; row++) {
        const nz = row / (ROWS - 1);
        const wz = WORLD_D_FAR - nz * (WORLD_D_FAR - WORLD_D_NEAR);
        const maxBarH = (60 + nz * 140) * currentAmp;
        const lineAlpha = 0.18 + nz * 0.28;
        const lineW     = 0.6  + nz * 0.6;

        // Wireframe line (segmented for per-column hue)
        for (let col = 0; col < COLS - 1; col++) {
          const nx0 = col       / (COLS - 1);
          const nx1 = (col + 1) / (COLS - 1);
          const wx0 = (nx0 - 0.5) * WORLD_W;
          const wx1 = (nx1 - 0.5) * WORLD_W;
          const wy0 = heights[row][col]     * maxBarH;
          const wy1 = heights[row][col + 1] * maxBarH;
          const p0  = project(wx0, wy0, wz, W, H);
          const p1  = project(wx1, wy1, wz, W, H);
          const [r, g, b] = peakRGB((nx0 + nx1) / 2);
          ctx.beginPath();
          ctx.moveTo(p0.sx, p0.sy);
          ctx.lineTo(p1.sx, p1.sy);
          ctx.strokeStyle = `rgba(${r},${g},${b},${lineAlpha})`;
          ctx.lineWidth   = lineW;
          ctx.stroke();
        }

        // Vertical bars
        for (let col = 0; col < COLS; col++) {
          const nh = maxH > 0 ? heights[row][col] / maxH : 0;
          if (nh < 0.02) continue;

          const nx  = col / (COLS - 1);
          const wx  = (nx - 0.5) * WORLD_W;
          const wy  = heights[row][col] * maxBarH;
          const top    = project(wx, wy, wz, W, H);
          const bottom = project(wx, 0,  wz, W, H);
          const barW   = Math.max(0.8, top.scale * (WORLD_W / COLS) * 0.55);
          const alpha  = 0.35 + nz * 0.5;
          const [pr, pg, pb] = peakRGB(nx);

          const grad = ctx.createLinearGradient(top.sx, top.sy, bottom.sx, bottom.sy);
          grad.addColorStop(0,    `rgba(${pr},${pg},${pb},${alpha})`);
          grad.addColorStop(0.45, `rgba(${Math.round(pr * 0.6)},${Math.round(pg * 0.4)},${Math.round(pb * 0.85)},${alpha * 0.7})`);
          grad.addColorStop(1,    `rgba(20,0,60,${alpha * 0.2})`);

          ctx.fillStyle = grad;
          ctx.fillRect(top.sx - barW / 2, top.sy, barW, bottom.sy - top.sy);

          // Peak glow
          if (nh > 0.65 && nz > 0.3) {
            ctx.save();
            ctx.shadowBlur  = 8 + nh * 14;
            ctx.shadowColor = `rgb(${pr},${pg},${pb})`;
            ctx.fillStyle   = `rgba(${pr},${pg},${pb},${(nh - 0.65) * alpha * 1.6})`;
            ctx.fillRect(top.sx - barW / 2, top.sy, barW, 3);
            ctx.restore();
          }
        }
      }

      frame = requestAnimationFrame(draw);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-70"
      style={{ zIndex: 0 }}
    />
  );
}
