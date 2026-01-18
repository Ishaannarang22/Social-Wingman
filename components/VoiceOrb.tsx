"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface VoiceOrbProps {
  audioLevel: number; // 0-1 normalized audio level
  batteryValue: number; // 0-100 battery percentage
  isUserSpeaking: boolean;
  isAgentSpeaking: boolean;
  size?: number;
  className?: string;
}

// Simplex noise implementation for organic movement
class SimplexNoise {
  private perm: number[] = [];

  constructor() {
    const p = [];
    for (let i = 0; i < 256; i++) p[i] = Math.floor(Math.random() * 256);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  noise2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      const gi0 = this.perm[ii + this.perm[jj]] % 12;
      n0 = t0 * t0 * this.grad(gi0, x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
      n1 = t1 * t1 * this.grad(gi1, x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
      n2 = t2 * t2 * this.grad(gi2, x2, y2);
    }

    return 70 * (n0 + n1 + n2);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
  }
}

// Lerp helper for smooth transitions
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Color type
interface RGB {
  r: number;
  g: number;
  b: number;
}

// Get color based on battery value - Pastel Matcha Theme
function getBatteryColor(battery: number): RGB {
  if (battery >= 70) {
    return { r: 184, g: 212, b: 168 }; // Matcha green pastel #b8d4a8
  } else if (battery >= 50) {
    return { r: 232, g: 221, b: 165 }; // Pastel cream #e8dda5
  } else if (battery >= 30) {
    return { r: 232, g: 201, b: 165 }; // Pastel peach #e8c9a5
  } else {
    return { r: 232, g: 165, b: 165 }; // Pastel rose #e8a5a5
  }
}

// Pastel lavender for agent speaking
const AGENT_COLOR: RGB = { r: 201, g: 184, b: 212 }; // Pastel lavender #c9b8d4

export function VoiceOrb({
  audioLevel,
  batteryValue,
  isUserSpeaking,
  isAgentSpeaking,
  size = 280,
  className,
}: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const noiseRef = useRef<SimplexNoise | null>(null);
  const timeRef = useRef(0);
  const smoothedAudioRef = useRef(0);
  const smoothedColorRef = useRef<RGB>({ r: 34, g: 197, b: 94 });
  const pointsRef = useRef<{ angle: number; offset: number; targetOffset: number }[]>([]);

  // Initialize noise and points
  useEffect(() => {
    noiseRef.current = new SimplexNoise();

    // Create points around the orb
    const numPoints = 64;
    pointsRef.current = Array.from({ length: numPoints }, (_, i) => ({
      angle: (i / numPoints) * Math.PI * 2,
      offset: 0,
      targetOffset: 0,
    }));
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const noise = noiseRef.current;

    if (!canvas || !ctx || !noise) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displaySize = size;
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;
    ctx.scale(dpr, dpr);

    const centerX = displaySize / 2;
    const centerY = displaySize / 2;
    const baseRadius = displaySize * 0.30;

    // Smooth audio level (slower lerp = smoother transitions)
    const targetAudio = audioLevel;
    smoothedAudioRef.current = lerp(smoothedAudioRef.current, targetAudio, 0.08);
    const smoothedAudio = smoothedAudioRef.current;

    // Update time
    timeRef.current += 0.016; // ~60fps
    const time = timeRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, displaySize, displaySize);

    // Get target color - purple when agent speaking, otherwise battery color
    const targetColor = isAgentSpeaking ? AGENT_COLOR : getBatteryColor(batteryValue);

    // Smooth color transitions
    smoothedColorRef.current = {
      r: lerp(smoothedColorRef.current.r, targetColor.r, 0.08),
      g: lerp(smoothedColorRef.current.g, targetColor.g, 0.08),
      b: lerp(smoothedColorRef.current.b, targetColor.b, 0.08),
    };
    const color = smoothedColorRef.current;

    // Calculate audio intensity for deformation (reduced multiplier for smoother blob)
    const audioIntensity = isUserSpeaking || isAgentSpeaking
      ? smoothedAudio * 1.2 + 0.25
      : 0.12;

    // Breathing animation (slower when idle)
    const breathingSpeed = isUserSpeaking ? 3 : isAgentSpeaking ? 2.5 : 1;
    const breathingAmount = isUserSpeaking || isAgentSpeaking ? 0.02 : 0.03;
    const breathing = Math.sin(time * breathingSpeed) * breathingAmount + 1;

    // Update point offsets with noise
    const points = pointsRef.current;
    points.forEach((point) => {
      const noiseVal = noise.noise2D(
        Math.cos(point.angle) * 1.5 + time * 0.4,
        Math.sin(point.angle) * 1.5 + time * 0.4
      );

      // More displacement when speaking (reduced for smoother appearance)
      const maxOffset = baseRadius * audioIntensity * 0.2;
      point.targetOffset = noiseVal * maxOffset;
      point.offset = lerp(point.offset, point.targetOffset, 0.05);
    });

    // === 3D EFFECTS ===

    // 1. Drop shadow (below and slightly offset)
    const shadowOffset = baseRadius * 0.15;
    const shadowBlur = baseRadius * 0.4;
    ctx.save();
    ctx.filter = `blur(${shadowBlur}px)`;
    ctx.beginPath();
    ctx.ellipse(
      centerX + shadowOffset * 0.3,
      centerY + baseRadius * 0.9,
      baseRadius * 0.7,
      baseRadius * 0.2,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fill();
    ctx.restore();

    // 2. Outer glow layers (ambient light)
    const glowLayers = 5;
    for (let g = glowLayers; g > 0; g--) {
      const glowRadius = baseRadius * breathing + (g * 12);
      const glowAlpha = 0.06 / g;

      ctx.beginPath();
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${glowAlpha})`;
      ctx.fill();
    }

    // 3. Build the blob path
    ctx.beginPath();
    points.forEach((point, i) => {
      const r = baseRadius * breathing + point.offset;
      const x = centerX + Math.cos(point.angle) * r;
      const y = centerY + Math.sin(point.angle) * r;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevPoint = points[i - 1];
        const prevR = baseRadius * breathing + prevPoint.offset;
        const prevX = centerX + Math.cos(prevPoint.angle) * prevR;
        const prevY = centerY + Math.sin(prevPoint.angle) * prevR;

        const cpX = (prevX + x) / 2;
        const cpY = (prevY + y) / 2;
        ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
      }
    });
    ctx.closePath();

    // 4. Main gradient fill with 3D depth
    // Light source from top-left
    const lightX = centerX - baseRadius * 0.5;
    const lightY = centerY - baseRadius * 0.5;

    const mainGradient = ctx.createRadialGradient(
      lightX,
      lightY,
      0,
      centerX,
      centerY,
      baseRadius * 1.4
    );

    // Create depth with color stops
    const intensity = isUserSpeaking ? 1.3 : isAgentSpeaking ? 1.2 : 1;
    const highlight = {
      r: Math.min(255, color.r * intensity + 80),
      g: Math.min(255, color.g * intensity + 80),
      b: Math.min(255, color.b * intensity + 80),
    };
    const midtone = color;
    const shadow = {
      r: color.r * 0.4,
      g: color.g * 0.4,
      b: color.b * 0.4,
    };

    mainGradient.addColorStop(0, `rgba(${highlight.r}, ${highlight.g}, ${highlight.b}, 1)`);
    mainGradient.addColorStop(0.3, `rgba(${midtone.r}, ${midtone.g}, ${midtone.b}, 1)`);
    mainGradient.addColorStop(0.7, `rgba(${midtone.r * 0.7}, ${midtone.g * 0.7}, ${midtone.b * 0.7}, 1)`);
    mainGradient.addColorStop(1, `rgba(${shadow.r}, ${shadow.g}, ${shadow.b}, 1)`);

    ctx.fillStyle = mainGradient;
    ctx.fill();

    // 5. Rim lighting (Fresnel effect) - bright edge on the dark side
    const rimGradient = ctx.createRadialGradient(
      centerX + baseRadius * 0.3,
      centerY + baseRadius * 0.3,
      baseRadius * 0.5,
      centerX,
      centerY,
      baseRadius * 1.1
    );
    rimGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
    rimGradient.addColorStop(0.7, "rgba(255, 255, 255, 0)");
    rimGradient.addColorStop(0.85, `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`);
    rimGradient.addColorStop(1, `rgba(${Math.min(255, color.r + 100)}, ${Math.min(255, color.g + 100)}, ${Math.min(255, color.b + 100)}, 0.15)`);

    ctx.save();
    ctx.clip();
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = rimGradient;
    ctx.fill();
    ctx.restore();

    // 6. Specular highlight (sharp bright spot)
    const specularX = centerX - baseRadius * 0.35;
    const specularY = centerY - baseRadius * 0.35;
    const specularRadius = baseRadius * 0.25;

    const specularGradient = ctx.createRadialGradient(
      specularX,
      specularY,
      0,
      specularX,
      specularY,
      specularRadius
    );
    specularGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    specularGradient.addColorStop(0.3, "rgba(255, 255, 255, 0.5)");
    specularGradient.addColorStop(0.6, "rgba(255, 255, 255, 0.1)");
    specularGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.beginPath();
    ctx.arc(specularX, specularY, specularRadius, 0, Math.PI * 2);
    ctx.fillStyle = specularGradient;
    ctx.fill();

    // 7. Secondary smaller highlight
    const spec2X = centerX - baseRadius * 0.15;
    const spec2Y = centerY - baseRadius * 0.5;
    const spec2Radius = baseRadius * 0.08;

    const spec2Gradient = ctx.createRadialGradient(
      spec2X,
      spec2Y,
      0,
      spec2X,
      spec2Y,
      spec2Radius
    );
    spec2Gradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    spec2Gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.beginPath();
    ctx.arc(spec2X, spec2Y, spec2Radius, 0, Math.PI * 2);
    ctx.fillStyle = spec2Gradient;
    ctx.fill();

    // 8. Inner ambient occlusion (subtle darkening at edges)
    ctx.save();
    ctx.beginPath();
    points.forEach((point, i) => {
      const r = baseRadius * breathing + point.offset;
      const x = centerX + Math.cos(point.angle) * r;
      const y = centerY + Math.sin(point.angle) * r;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevPoint = points[i - 1];
        const prevR = baseRadius * breathing + prevPoint.offset;
        const prevX = centerX + Math.cos(prevPoint.angle) * prevR;
        const prevY = centerY + Math.sin(prevPoint.angle) * prevR;

        const cpX = (prevX + x) / 2;
        const cpY = (prevY + y) / 2;
        ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
      }
    });
    ctx.closePath();
    ctx.clip();

    const aoGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      baseRadius * 0.6,
      centerX,
      centerY,
      baseRadius * 1.1
    );
    aoGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    aoGradient.addColorStop(0.8, "rgba(0, 0, 0, 0)");
    aoGradient.addColorStop(1, "rgba(0, 0, 0, 0.15)");

    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = aoGradient;
    ctx.fill();
    ctx.restore();

    // === TEXT OVERLAY ===

    // Draw battery percentage in center with shadow for depth
    ctx.save();
    ctx.font = `bold ${displaySize * 0.14}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Text shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillText(`${Math.round(batteryValue)}%`, centerX + 2, centerY + 2);

    // Main text
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillText(`${Math.round(batteryValue)}%`, centerX, centerY);
    ctx.restore();

    // Status text below percentage
    ctx.font = `${displaySize * 0.042}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    let statusText = "";
    if (isUserSpeaking) {
      statusText = "Keep going!";
    } else if (isAgentSpeaking) {
      statusText = "Wingman speaking...";
    } else if (batteryValue >= 70) {
      statusText = "You're doing great!";
    } else if (batteryValue >= 50) {
      statusText = "Keep the conversation going";
    } else if (batteryValue >= 30) {
      statusText = "Time to speak up!";
    } else {
      statusText = "Say something!";
    }
    ctx.fillText(statusText, centerX, centerY + displaySize * 0.09);

    // Schedule next frame
    animationRef.current = requestAnimationFrame(render);
  }, [audioLevel, batteryValue, isUserSpeaking, isAgentSpeaking, size]);

  // Start animation loop
  useEffect(() => {
    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [render]);

  return (
    <div className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        className="block"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
