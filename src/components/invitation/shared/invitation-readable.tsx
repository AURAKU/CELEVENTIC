"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  bodyReadableStyle,
  headingReadableStyle,
  phraseClass,
  readabilityClass,
  type ReadabilitySurface,
} from "@/lib/invitation/text-readability";

interface ReadablePanelProps {
  children: ReactNode;
  surface?: ReadabilitySurface;
  className?: string;
  /** Semi-opaque panel behind copy on busy backgrounds */
  scrim?: boolean;
}

export function ReadablePanel({ children, surface = "light", className, scrim }: ReadablePanelProps) {
  return (
    <div
      className={cn(
        readabilityClass(surface),
        scrim && "inv-readable-panel rounded-2xl px-5 py-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ReadableHeading({
  children,
  color,
  surface = "light",
  className,
}: {
  children: ReactNode;
  color: string;
  surface?: ReadabilitySurface;
  className?: string;
}) {
  return (
    <h1 className={cn(phraseClass(surface), className)} style={headingReadableStyle(color, surface)}>
      {children}
    </h1>
  );
}

export function ReadableBody({
  children,
  color,
  surface = "light",
  className,
  style,
}: {
  children: ReactNode;
  color: string;
  surface?: ReadabilitySurface;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <p
      className={cn(readabilityClass(surface), className)}
      style={{ ...bodyReadableStyle(color, surface), ...style }}
    >
      {children}
    </p>
  );
}
