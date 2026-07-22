import type { ReactNode } from "react";

interface PageFrameProps {
  pageId: string;
  label: string;
  children: ReactNode;
  /** Full-bleed background layer (hero media), rendered behind the inner content */
  media?: ReactNode;
  /** Alternate surface color for visual page rhythm */
  altSurface?: boolean;
  /** Cover pages drop the decorative frame + padding for cinematic media */
  frameless?: boolean;
  /** Set when the page renders full-bleed hero media (flips text to surface color) */
  hasMedia?: boolean;
}

/**
 * Full-viewport snap page. Everything inside styles via var(--inv-*) only.
 * SSR-complete: this is a plain section — no client gating around content.
 */
export function PageFrame({
  pageId,
  label,
  children,
  media,
  altSurface = false,
  frameless = false,
  hasMedia = false,
}: PageFrameProps) {
  return (
    <section
      id={pageId}
      data-inv-page={pageId}
      data-alt-surface={altSurface || undefined}
      data-frameless={frameless || undefined}
      data-has-media={hasMedia || undefined}
      className="inv-page"
      aria-label={label}
    >
      {media}
      <div className="inv-page-inner">{children}</div>
    </section>
  );
}
