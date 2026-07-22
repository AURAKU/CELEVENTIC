"use client";

import type { OutroExperienceId } from "@/lib/experience/experience-types";
import { OutroExperienceOverlay } from "@/components/experience/outro-experience-overlay";
import { SceneErrorBoundary } from "@/components/experience-engine/scene-error-boundary";
import { useReducedMotion } from "framer-motion";

interface ExperienceOutroProps {
  outroId: OutroExperienceId;
  message?: string;
  accentColor?: string;
}

/**
 * Thin Experience Engine wrapper around OutroExperienceOverlay.
 * Reduced-motion: static thank-you line only.
 */
export function ExperienceOutro({ outroId, message, accentColor }: ExperienceOutroProps) {
  const reduced = useReducedMotion();

  if (outroId === "none") return null;

  if (reduced) {
    return (
      <SceneErrorBoundary sceneId="outro">
        <p
          className="pointer-events-none absolute bottom-8 left-0 right-0 z-[5] px-6 text-center text-sm opacity-50"
          style={{ color: accentColor ?? "#D4A63A" }}
          data-experience-outro="reduced"
        >
          {message ?? "Thank you for being part of our celebration."}
        </p>
      </SceneErrorBoundary>
    );
  }

  return (
    <SceneErrorBoundary sceneId="outro">
      <OutroExperienceOverlay outroId={outroId} message={message} accentColor={accentColor} />
    </SceneErrorBoundary>
  );
}
