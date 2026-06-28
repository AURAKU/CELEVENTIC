import { cn } from "@/lib/utils";
import { BRAND_MOTTO_PARTS } from "@/lib/constants";

interface BrandMottoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "light" | "hero";
}

const variantStyles = {
  default: {
    celebrations: "text-brand-500",
    events: "text-gold-400",
    tickets: "text-accent-500",
    pipe: "text-slate-400",
  },
  light: {
    celebrations: "text-brand-400",
    events: "text-gold-400",
    tickets: "text-accent-400",
    pipe: "text-slate-500",
  },
  hero: {
    celebrations: "text-brand-400",
    events: "text-gold-400",
    tickets: "text-accent-400",
    pipe: "text-slate-500",
  },
} as const;

export function BrandMotto({ className, size = "md", variant = "default" }: BrandMottoProps) {
  const colors = variantStyles[variant];

  const sizeClass =
    size === "sm"
      ? "text-[10px] tracking-[0.12em]"
      : size === "lg"
        ? "text-sm sm:text-base tracking-[0.18em]"
        : size === "xl"
          ? "text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.16em] sm:tracking-[0.2em]"
          : "text-xs sm:text-sm tracking-[0.15em]";

  const [celebrations, events, tickets] = BRAND_MOTTO_PARTS;

  return (
    <p className={cn("font-semibold leading-tight inline-flex flex-wrap items-center gap-x-2 sm:gap-x-2.5", sizeClass, className)}>
      <span className={colors.celebrations}>{celebrations}</span>
      <span className={cn("font-normal opacity-70", colors.pipe)} aria-hidden>|</span>
      <span className={colors.events}>{events}</span>
      <span className={cn("font-normal opacity-70", colors.pipe)} aria-hidden>|</span>
      <span className={colors.tickets}>{tickets}</span>
    </p>
  );
}
