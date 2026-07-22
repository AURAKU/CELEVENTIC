"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useReducedMotion } from "framer-motion";
import { detectDeviceTier, type DeviceTier } from "@/lib/motion/device-tier";
import { getMotionProfile, type MotionProfileDef } from "@/lib/motion/motion-profiles";
import type { MotionProfileId } from "@/lib/invitation-theme/theme-types";

interface MotionProfileContextValue {
  profile: MotionProfileDef;
  /** Effective intensity after tier/reduced-motion gating, 0–1 */
  intensity: number;
  tier: DeviceTier;
  reduced: boolean;
  hydrated: boolean;
  /** Scroll container of the paged viewer, for container-scoped parallax */
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

const MotionProfileContext = createContext<MotionProfileContextValue | null>(null);

interface MotionProfileProviderProps {
  profileId: MotionProfileId;
  intensity: number;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}

export function MotionProfileProvider({
  profileId,
  intensity,
  scrollContainerRef,
  children,
}: MotionProfileProviderProps) {
  const reduced = useReducedMotion() ?? false;
  // SSR/first paint start at "low" (→ still profile); motion enhances in
  // after mount once the device proves it can afford it.
  const [tier, setTier] = useState<DeviceTier>("low");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTier(detectDeviceTier());
    setHydrated(true);
  }, []);

  const value = useMemo<MotionProfileContextValue>(() => {
    // prefers-reduced-motion always wins; low tier / Save-Data force still.
    const forceStill = reduced || tier === "low";
    const profile = getMotionProfile(forceStill ? "still" : profileId);
    const tierScale = tier === "mid" ? 0.5 : 1;
    return {
      profile,
      intensity: forceStill ? 0 : Math.max(0, Math.min(1, intensity)) * tierScale,
      tier,
      reduced,
      hydrated,
      scrollContainerRef,
    };
  }, [profileId, intensity, reduced, tier, hydrated, scrollContainerRef]);

  return <MotionProfileContext.Provider value={value}>{children}</MotionProfileContext.Provider>;
}

const FALLBACK_REF: RefObject<HTMLDivElement | null> = { current: null };

export function useMotionProfile(): MotionProfileContextValue {
  const ctx = useContext(MotionProfileContext);
  if (ctx) return ctx;
  // Outside a provider (legacy surfaces): behave as still.
  return {
    profile: getMotionProfile("still"),
    intensity: 0,
    tier: "low",
    reduced: false,
    hydrated: false,
    scrollContainerRef: FALLBACK_REF,
  };
}

/** Convenience for components that only need a stable ref to hand the provider. */
export function useScrollContainerRef() {
  return useRef<HTMLDivElement | null>(null);
}
