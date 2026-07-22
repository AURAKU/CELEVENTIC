"use client";

import { useScroll, useTransform, type MotionValue } from "framer-motion";
import type { RefObject } from "react";
import { useMotionProfile } from "./motion-profile-provider";

type ParallaxLayerName = "background" | "midground";

/**
 * Container-scoped, transform-only parallax. Returns a `y` MotionValue that
 * shifts the target as its page moves through the viewer's scroll container.
 * Static (0) when the profile has no parallax, motion is reduced, or the
 * device tier is low.
 *
 * For pointer / orientation drivers, use `ParallaxLayer` from
 * `@/components/experience-engine` which composes this hook.
 */
export function useParallax(
  target: RefObject<HTMLElement | null>,
  layer: ParallaxLayerName
): { y: MotionValue<number> } {
  const { profile, intensity, scrollContainerRef } = useMotionProfile();
  const factor = profile.parallax?.[layer] ?? 0;

  const { scrollYProgress } = useScroll({
    target: target as RefObject<HTMLElement>,
    container: scrollContainerRef as RefObject<HTMLElement>,
    offset: ["start end", "end start"],
  });

  const range = 80 * factor * intensity;
  const y = useTransform(scrollYProgress, [0, 1], [range, -range]);
  return { y };
}

export type { ParallaxLayerName };
