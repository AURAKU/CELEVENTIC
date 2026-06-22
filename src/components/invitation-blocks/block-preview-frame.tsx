"use client";

import { cn } from "@/lib/utils";

interface BlockPreviewFrameProps {
  mode: "mobile" | "desktop" | "guest";
  children: React.ReactNode;
}

export function BlockPreviewFrame({ mode, children }: BlockPreviewFrameProps) {
  return (
    <div
      className={cn(
        "mx-auto transition-all duration-300 bg-[#FAF8F4] rounded-2xl overflow-hidden",
        mode === "mobile" && "max-w-[390px] border-8 border-[#0F172A] rounded-[2rem] shadow-2xl min-h-[640px]",
        mode === "desktop" && "max-w-4xl border border-slate-200/80 shadow-lg",
        mode === "guest" && "max-w-2xl"
      )}
    >
      <div className={cn("p-4 sm:p-6", mode === "mobile" && "max-h-[700px] overflow-y-auto")}>
        {children}
      </div>
    </div>
  );
}
