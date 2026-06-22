"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface BlockShellProps {
  children: React.ReactNode;
  variant?: string;
  className?: string;
  animate?: boolean;
}

export function BlockShell({ children, variant = "elegant", className, animate = true }: BlockShellProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!animate);

  useEffect(() => {
    if (!animate || !ref.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [animate]);

  const variantClass =
    variant === "minimal"
      ? "border-slate-200/60 bg-white/80"
      : variant === "bold"
        ? "border-[#0F172A]/20 bg-[#0F172A] text-white"
        : variant === "romantic"
          ? "border-[#D4A63A]/30 bg-gradient-to-br from-white to-[#FAF8F4]"
          : variant === "formal"
            ? "border-slate-300 bg-white shadow-sm"
            : "border-slate-200/80 bg-white";

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border p-6 sm:p-8 transition-all duration-700",
        variantClass,
        animate && (visible ? "inv-block-reveal" : "opacity-0 translate-y-4"),
        className
      )}
    >
      {children}
    </div>
  );
}
