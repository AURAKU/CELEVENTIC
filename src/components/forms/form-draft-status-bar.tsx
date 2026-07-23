"use client";

import { Button } from "@/components/ui/button";
import type { FormDraftStatus } from "@/hooks/use-form-draft";
import { cn } from "@/lib/utils";

interface FormDraftStatusBarProps {
  status: FormDraftStatus;
  hasDraft: boolean;
  wasRestored?: boolean;
  lastSavedAt?: Date | null;
  onClear: () => void;
  /** Optional: also reset in-memory form when clearing draft */
  className?: string;
  label?: string;
}

function formatSavedAt(at: Date | null | undefined): string | null {
  if (!at || Number.isNaN(at.getTime())) return null;
  try {
    return at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
}

/**
 * Subtle draft indicator — matches brand slate/teal, no purple chrome.
 * Silent when idle with no draft; shows restore / saved / clear.
 */
export function FormDraftStatusBar({
  status,
  hasDraft,
  wasRestored = false,
  lastSavedAt,
  onClear,
  className,
  label = "Draft",
}: FormDraftStatusBarProps) {
  if (!hasDraft && status !== "restored" && status !== "saved" && status !== "dirty") {
    return null;
  }

  const time = formatSavedAt(lastSavedAt ?? null);
  let message = `${label} saved`;
  if (status === "dirty") message = "Saving draft…";
  else if (wasRestored && (status === "restored" || status === "saved")) {
    message = `${label} restored`;
  } else if (status === "saved" && time) {
    message = `${label} saved · ${time}`;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs text-slate-600",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-slate-500 hover:text-red-600"
        onClick={onClear}
      >
        Clear draft
      </Button>
    </div>
  );
}
