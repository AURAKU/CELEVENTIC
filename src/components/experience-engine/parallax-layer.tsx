"use client";

import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { useParallax } from "@/components/motion/use-parallax";
import { useMotionProfile } from "@/components/motion/motion-profile-provider";
import type { ParallaxIntensity } from "@/lib/invitation/template-creative-registry";
import { cn } from "@/lib/utils";

export type ParallaxDriver = "scroll" | "pointer" | "orientation" | "none";

const INTENSITY_SCALE: Record<ParallaxIntensity, number> = {
  none: 0,
  subtle: 0.35,
  moderate: 0.65,
  cinematic: 1,
  interactive: 1.25,
};

interface ParallaxLayerProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  layer?: "background" | "midground" | "foreground";
  intensity?: ParallaxIntensity;
  /** Drivers to enable; reduced-motion / none intensity disables all. */
  drivers?: ParallaxDriver[];
  /** Max pointer shift in px before intensity scaling */
  pointerRange?: number;
  /** Max device-orientation shift in px */
  orientationRange?: number;
}

function usePointerParallax(enabled: boolean, range: number): { x: MotionValue<number>; y: MotionValue<number> } {
  const xRaw = useMotionValue(0);
  const yRaw = useMotionValue(0);
  const x = useSpring(xRaw, { stiffness: 120, damping: 22, mass: 0.4 });
  const y = useSpring(yRaw, { stiffness: 120, damping: 22, mass: 0.4 });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      xRaw.set(nx * range);
      yRaw.set(ny * range);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled, range, xRaw, yRaw]);

  return { x, y };
}

function useOrientationParallax(
  enabled: boolean,
  range: number
): { x: MotionValue<number>; y: MotionValue<number> } {
  const xRaw = useMotionValue(0);
  const yRaw = useMotionValue(0);
  const x = useSpring(xRaw, { stiffness: 80, damping: 20 });
  const y = useSpring(yRaw, { stiffness: 80, damping: 20 });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const onOrient = (e: DeviceOrientationEvent) => {
      const gamma = Math.max(-45, Math.min(45, e.gamma ?? 0));
      const beta = Math.max(-45, Math.min(45, e.beta ?? 0));
      xRaw.set((gamma / 45) * range);
      yRaw.set((beta / 45) * range);
    };
    window.addEventListener("deviceorientation", onOrient, { passive: true });
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [enabled, range, xRaw, yRaw]);

  return { x, y };
}

/**
 * Multi-driver parallax layer with reduced-motion fallback (static render).
 * Extends existing useParallax (scroll) with optional pointer + orientation.
 */
export function ParallaxLayer({
  children,
  className,
  style,
  layer = "midground",
  intensity = "moderate",
  drivers = ["scroll"],
  pointerRange = 18,
  orientationRange = 14,
}: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { intensity: profileIntensity } = useMotionProfile();
  const scale = INTENSITY_SCALE[intensity] * profileIntensity;

  const scrollLayer = layer === "foreground" ? "midground" : layer;
  const scrollEnabled = drivers.includes("scroll") && scale > 0;
  const { y: scrollY } = useParallax(
    ref as RefObject<HTMLElement | null>,
    scrollLayer === "background" ? "background" : "midground"
  );

  const pointerEnabled = drivers.includes("pointer") && scale > 0;
  const orientationEnabled = drivers.includes("orientation") && scale > 0;
  const pointer = usePointerParallax(pointerEnabled, pointerRange * scale);
  const orientation = useOrientationParallax(orientationEnabled, orientationRange * scale);

  const yCombined = useTransform(
    [scrollY, pointer.y, orientation.y],
    ([s, p, o]: number[]) => (scrollEnabled ? s : 0) + p + o
  );
  const xCombined = useTransform(
    [pointer.x, orientation.x],
    ([p, o]: number[]) => p + o
  );

  if (scale <= 0 || drivers.includes("none") || drivers.length === 0) {
    return (
      <div ref={ref} className={cn("parallax-layer parallax-static", className)} style={style} aria-hidden>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={cn("parallax-layer will-change-transform", className)}
      style={{ ...style, x: xCombined, y: yCombined }}
      aria-hidden
    >
      {children}
    </motion.div>
  );
}
