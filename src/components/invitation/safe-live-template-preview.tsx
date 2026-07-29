"use client";

import dynamic from "next/dynamic";
import { ClientErrorBoundary } from "@/components/ui/client-error-boundary";
import type { LivePreviewVariant } from "@/components/invitation/live-template-preview";

/**
 * Catalogue / marketing previews must never take down a whole page.
 * - `ssr: false` skips server render of the heavy invite shell (avoids SSR crashes)
 * - ClientErrorBoundary isolates client-side preview failures to a quiet fallback
 */
const LiveTemplatePreviewInner = dynamic(
  () =>
    import("@/components/invitation/live-template-preview").then((m) => m.LiveTemplatePreview),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full animate-pulse rounded-xl bg-slate-100/90"
        style={{ minHeight: 180 }}
        aria-hidden
      />
    ),
  }
);

type SafeProps = {
  layoutSlug: string;
  catalogSlug?: string;
  category?: string;
  features?: string[];
  musicEnabled?: boolean;
  variant?: LivePreviewVariant;
  className?: string;
  showBadge?: boolean;
  showDeviceToggle?: boolean;
  tapToOpen?: boolean;
  memoryUploadUrl?: string | null;
  memoryAlbumUrl?: string | null;
  memoryUploadQrImageUrl?: string | null;
  memoryEventId?: string | null;
  memoryAlbumTitle?: string | null;
};

function PreviewFallback() {
  return (
    <div className="flex min-h-[180px] w-full items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 px-4 text-center text-xs text-slate-500">
      Preview unavailable, open the template to see the full invitation.
    </div>
  );
}

export function SafeLiveTemplatePreview(props: SafeProps) {
  return (
    <ClientErrorBoundary fallback={<PreviewFallback />}>
      <LiveTemplatePreviewInner {...props} />
    </ClientErrorBoundary>
  );
}

/** Alias so call sites can swap imports without renaming. */
export { SafeLiveTemplatePreview as LiveTemplatePreview };
