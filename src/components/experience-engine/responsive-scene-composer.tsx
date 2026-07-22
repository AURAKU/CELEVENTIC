"use client";

import type { CSSProperties, ReactNode } from "react";
import { InviteViewportShell, type InviteViewportMode } from "@/components/invitation/invite-viewport-shell";
import { cn } from "@/lib/utils";

interface ResponsiveSceneComposerProps {
  mode?: InviteViewportMode;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  scrollable?: boolean;
  /** Fill background so white gaps never flash under 100dvh content. */
  background?: string;
  /** Optional safe-area padding on the inner stage (live mode already pads shell). */
  padSafeArea?: boolean;
}

/**
 * Fullscreen composer — wraps InviteViewportShell with 100dvh/vw + no white-gap fill.
 * Additive: existing InviteViewportShell usage remains valid.
 */
export function ResponsiveSceneComposer({
  mode = "live",
  className,
  style,
  children,
  scrollable = true,
  background = "#0B1220",
  padSafeArea = false,
}: ResponsiveSceneComposerProps) {
  return (
    <InviteViewportShell
      mode={mode}
      scrollable={scrollable}
      className={cn("experience-scene-composer", className)}
      style={{
        background,
        width: "100%",
        maxWidth: "100vw",
        ...style,
      }}
    >
      <div
        className={cn(
          "experience-scene-stage relative h-full min-h-full w-full",
          padSafeArea && "safe-area-pt safe-area-pb safe-area-pl safe-area-pr"
        )}
        style={{ minHeight: mode === "live" ? "100%" : undefined }}
      >
        {children}
      </div>
    </InviteViewportShell>
  );
}
