"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackGuideEvent } from "@/lib/celeventic-guide/analytics";
import { Button } from "@/components/ui/button";

export type GuideEmbedMode = "modal" | "drawer" | "inline" | "page";

/**
 * Non-intrusive guide embedding helper (§58).
 * Use modal/drawer/inline from product surfaces; prefer link-out on invite/Event Guide.
 */
export function GuideEmbed({
  slug,
  title,
  mode = "inline",
  open: openProp,
  onOpenChange,
  triggerLabel = "Learn how",
  className,
  children,
}: {
  slug: string;
  title?: string;
  mode?: GuideEmbedMode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerLabel?: string;
  className?: string;
  children?: ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const titleId = useId();
  const href = `/guide/${slug}`;

  useEffect(() => {
    if (open) trackGuideEvent("guide_context_help", { slug, embed: mode });
  }, [open, slug, mode]);

  if (mode === "page") {
    return (
      <Link href={href} className={cn("text-brand-700 hover:underline text-sm font-medium", className)}>
        {triggerLabel}
      </Link>
    );
  }

  if (mode === "inline") {
    return (
      <div className={cn("rounded-2xl border border-slate-200 bg-white/80 p-4", className)}>
        <p className="text-xs uppercase tracking-wider text-brand-700 font-semibold">Celeventic Guide</p>
        <p className="mt-1 font-medium text-slate-900">{title ?? triggerLabel}</p>
        {children}
        <Button asChild variant="secondary" size="sm" className="mt-3">
          <Link href={href}>{triggerLabel}</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>
      {open && (
        <div
          className={cn(
            "fixed inset-0 z-50 flex",
            mode === "drawer" ? "items-end sm:items-stretch sm:justify-end" : "items-end sm:items-center justify-center p-0 sm:p-4"
          )}
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close guide"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              "relative bg-white shadow-2xl border border-slate-200 overflow-hidden",
              mode === "drawer"
                ? "w-full sm:w-[420px] h-[85vh] sm:h-full rounded-t-3xl sm:rounded-none"
                : "w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[85vh]"
            )}
          >
            <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-100">
              <div>
                <p className="text-xs uppercase tracking-wider text-brand-700 font-semibold">Celeventic Guide</p>
                <h2 id={titleId} className="font-display text-lg font-semibold text-slate-900">
                  {title ?? triggerLabel}
                </h2>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(85vh-4rem)]">
              {children ?? (
                <p className="text-sm text-slate-600">
                  Open the full tutorial for step-by-step help, captions, and walkthrough.
                </p>
              )}
              <Button asChild className="mt-4 w-full">
                <Link href={href}>Open full tutorial</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Route-aware suggested embed slug for product surfaces. */
export function suggestEmbedSlug(pathname: string): string | null {
  const path = pathname.split("?")[0] || "/";
  const map: Array<[string, string]> = [
    ["/dashboard/tickets", "tickets-organizer"],
    ["/dashboard/wallet", "wallet-organizer"],
    ["/dashboard/gifts", "gifts-organizer"],
    ["/gift/", "gifts-guest"],
    ["/marketplace", "marketplace-organizer"],
    ["/dashboard/venues", "venues-organizer"],
    ["/dashboard/vendor-portal", "vendor-portal"],
    ["/vendor-pass", "vendor-pass"],
    ["/dashboard/qr-hub", "qr-hub"],
    ["/dashboard/qr", "qr-admission-organizer"],
    ["/dashboard/memory", "memory-vault-organizer"],
    ["/memory", "memory-vault-guest"],
    ["/dashboard/contributions", "contributions-organizer"],
    ["/dashboard/messages", "communications-organizer"],
    ["/dashboard/campaigns", "communications-organizer"],
    ["/dashboard/settings", "settings-overview"],
    ["/dashboard/privacy-center", "privacy-security"],
    ["/dashboard/seating", "seating-organizer"],
    ["/dashboard/guests", "add-guests"],
    ["/dashboard/funeral", "event-os-funeral"],
    ["/admission/", "your-qr-admission-pass"],
    ["/seat/", "find-your-seat"],
    ["/guide", "how-celeventic-works"],
  ];
  for (const [prefix, slug] of map) {
    if (path === prefix || path.startsWith(prefix)) return slug;
  }
  return null;
}
