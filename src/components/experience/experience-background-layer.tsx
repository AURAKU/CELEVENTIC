"use client";

import { useMemo } from "react";
import { getBackgroundPack, type BackgroundTypeId } from "@/lib/experience/background-engine";
import { cn } from "@/lib/utils";

interface ExperienceBackgroundLayerProps {
  packId?: string | null;
  fallbackColor?: string;
  className?: string;
  overlayClassName?: string;
}

const MOTION_CLASS: Record<string, string> = {
  none: "",
  subtle: "exp-bg-motion-subtle",
  medium: "exp-bg-motion-medium",
  cinematic: "exp-bg-motion-cinematic",
};

/** Renders DNA-driven atmospheric background from the background engine catalog. */
export function ExperienceBackgroundLayer({
  packId,
  fallbackColor = "#0a0a0a",
  className,
  overlayClassName,
}: ExperienceBackgroundLayerProps) {
  const pack = useMemo(
    () => (packId ? getBackgroundPack(packId as BackgroundTypeId) : undefined),
    [packId]
  );

  const gradient =
    pack?.preview ??
    (fallbackColor.startsWith("linear") ||
    fallbackColor.startsWith("radial") ||
    fallbackColor.startsWith("rgba")
      ? fallbackColor
      : fallbackColor);

  const motionClass = MOTION_CLASS[pack?.motion ?? "none"] ?? "";

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div className={cn("absolute inset-0", motionClass)} style={{ background: gradient }} />
      {overlayClassName ? <div className={cn("absolute inset-0", overlayClassName)} /> : null}
    </div>
  );
}
