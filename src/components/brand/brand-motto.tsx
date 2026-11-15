import Link from "next/link";
import { cn } from "@/lib/utils";
import { BRAND_MOTTO_PARTS } from "@/lib/constants";

interface BrandMottoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "light" | "hero";
  /** When true, motto parts open the matching public journeys. */
  linked?: boolean;
}

const MOTTO_HREFS = [
  "/invitations/catalogue",
  "/discover",
  "/dashboard/tickets",
] as const;

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
    celebrations: "text-brand-300",
    events: "text-gold-300",
    tickets: "text-accent-400",
    pipe: "text-white/55",
  },
} as const;

export function BrandMotto({ className, size = "md", variant = "default", linked = false }: BrandMottoProps) {
  const colors = variantStyles[variant];

  const sizeClass =
    size === "sm"
      ? "text-[10px] tracking-[0.12em]"
      : size === "lg"
        ? "text-sm sm:text-base tracking-[0.18em]"
        : size === "xl"
          ? "text-[0.95rem] sm:text-lg md:text-xl lg:text-2xl tracking-[0.08em] sm:tracking-[0.12em] lg:tracking-[0.16em]"
          : "text-xs sm:text-sm tracking-[0.15em]";

  const parts = BRAND_MOTTO_PARTS;
  const colorKeys = ["celebrations", "events", "tickets"] as const;

  return (
    <p className={cn("font-semibold leading-tight inline-flex flex-wrap items-center gap-x-2 sm:gap-x-2.5", size === "xl" && "lg:flex-nowrap", sizeClass, className)}>
      {parts.map((label, index) => (
        <span key={label} className="inline-flex items-center gap-x-2 sm:gap-x-2.5">
          {index > 0 ? (
            <span className={cn("font-normal opacity-70", colors.pipe)} aria-hidden>
              |
            </span>
          ) : null}
          {linked ? (
            <Link
              href={MOTTO_HREFS[index]}
              className={cn(colors[colorKeys[index]], "underline-offset-4 hover:underline")}
            >
              {label}
            </Link>
          ) : (
            <span className={colors[colorKeys[index]]}>{label}</span>
          )}
        </span>
      ))}
    </p>
  );
}
