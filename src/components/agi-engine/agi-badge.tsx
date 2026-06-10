import { AGI_COPY, AGI_ENGINE } from "@/lib/agi-engine/branding";
import { Sparkles } from "lucide-react";

interface AgiBadgeProps {
  variant?: "subtle" | "inline";
  label?: string;
}

export function AgiBadge({ variant = "subtle", label }: AgiBadgeProps) {
  const text = label ?? AGI_COPY.enhanced;
  if (variant === "inline") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[#0B8A83]/80">
        <Sparkles className="h-3 w-3" />
        {text}
      </span>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0B8A83]/8 border border-[#0B8A83]/15 px-3 py-1 text-[10px] uppercase tracking-wider text-[#0B8A83]">
      <Sparkles className="h-3 w-3" />
      {text}
    </div>
  );
}

export function AgiFooter() {
  return (
    <p className="text-center text-[10px] text-slate-400 tracking-wide">
      {AGI_ENGINE.tagline}
    </p>
  );
}
