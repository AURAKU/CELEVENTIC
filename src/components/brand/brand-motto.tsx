import { cn } from "@/lib/utils";

interface BrandMottoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "light" | "hero";
}

const variantStyles = {
  default: {
    celebrate: "text-brand-500",
    event: "text-gold-400",
    ticket: "text-accent-500",
    dot: "text-slate-900",
  },
  light: {
    celebrate: "text-brand-400",
    event: "text-gold-400",
    ticket: "text-accent-400",
    dot: "text-slate-500",
  },
  hero: {
    celebrate: "text-brand-400",
    event: "text-gold-400",
    ticket: "text-accent-400",
    dot: "text-slate-500",
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

  return (
    <p className={cn("font-semibold leading-tight inline-flex flex-wrap items-center gap-x-2 sm:gap-x-3", sizeClass, className)}>
      <span className={colors.celebrate}>Celebrate</span>
      <span className={colors.event}>Event</span>
      <span className={colors.ticket}>Ticket</span>
    </p>
  );
}
