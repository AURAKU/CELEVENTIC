"use client";

import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function DigitalCardStudioNotice({
  message,
  error,
  className,
}: {
  message?: string | null;
  error?: string | null;
  className?: string;
}) {
  const text = (error || message || "").trim();
  if (!text) return null;
  return (
    <div
      className={cn("celecard-studio-notice", error && "is-error", className)}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {error ? (
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : (
        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      <p>{text}</p>
    </div>
  );
}
