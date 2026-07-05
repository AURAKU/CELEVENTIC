"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type InviteViewportMode = "live" | "embedded" | "thumbnail";

interface InviteViewportShellProps {
  mode?: InviteViewportMode;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  /** When false, outer shell uses overflow-hidden (cinematic slideshow). */
  scrollable?: boolean;
}

/**
 * Unified fullscreen shell for live invites, studio previews, and catalog thumbnails.
 * Handles 100dvh/svh, iOS safe areas, and readable overflow on all devices.
 */
export function InviteViewportShell({
  mode = "live",
  className,
  style,
  children,
  scrollable = true,
}: InviteViewportShellProps) {
  return (
    <div
      className={cn(
        "invite-viewport-root w-full",
        mode === "live" && "invite-viewport-live",
        mode === "embedded" && "invite-viewport-embedded",
        mode === "thumbnail" && "invite-viewport-thumbnail",
        mode === "live" && scrollable && "overflow-y-auto overscroll-contain",
        mode === "live" && !scrollable && "overflow-hidden",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}
