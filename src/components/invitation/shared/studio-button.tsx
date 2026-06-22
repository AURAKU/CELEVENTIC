"use client";

import type { InvitationStudioConfig } from "@/lib/invitation-studio/studio-types";
import { cn } from "@/lib/utils";

interface StudioButtonProps {
  studio?: InvitationStudioConfig;
  accent?: string;
  children: React.ReactNode;
  className?: string;
}

export function StudioButton({ studio, accent, children, className }: StudioButtonProps) {
  const style = studio?.buttonStyle ?? "gold";
  const position = studio?.buttonPosition ?? "center";

  const wrapperClass = cn(
    position === "bottom" && "fixed bottom-6 left-4 right-4 z-40 max-w-md mx-auto",
    position === "floating" && "fixed bottom-8 right-4 z-40",
    position === "center" && "relative",
    className
  );

  const innerClass = cn(
    "transition-all",
    style === "pill" && "[&_button]:rounded-full",
    style === "sharp" && "[&_button]:rounded-none",
    style === "rounded" && "[&_button]:rounded-xl",
    style === "glass" && "[&_button]:bg-white/15 [&_button]:backdrop-blur-md [&_button]:border-white/25",
    style === "outline" && "[&_button]:bg-transparent [&_button]:border-2",
    style === "gold" && "[&_button]:shadow-lg [&_button]:border-[#D4A63A]/40"
  );

  return (
    <div className={wrapperClass} style={accent ? { ["--studio-accent" as string]: accent } : undefined}>
      <div className={innerClass}>{children}</div>
    </div>
  );
}
