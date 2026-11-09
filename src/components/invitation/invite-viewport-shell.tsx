"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const liveScrollable = mode === "live" && scrollable;

  useEffect(() => {
    if (!liveScrollable) return;
    const node = scrollerRef.current;
    if (!node) return;
    node.style.pointerEvents = "auto";
    node.style.overflowY = "auto";
    node.style.touchAction = "pan-y";
    try {
      node.focus({ preventScroll: true });
    } catch {
      /* ignore */
    }
  }, [liveScrollable]);

  return (
    <div
      ref={scrollerRef}
      tabIndex={liveScrollable ? -1 : undefined}
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
