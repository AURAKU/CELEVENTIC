/**
 * Inline SVG motif glyphs, keyed by the theme's motif placement ids.
 * Stroke-only, currentColor — the wrapper sets color to the accent token, so
 * glyphs recolor with the theme for free and cost zero asset bytes.
 */

const GLYPH_PATHS: Record<string, React.ReactNode> = {
  flourish: (
    <path d="M4 12c6-8 14-8 20 0 6 8 14 8 20 0M24 12v0" strokeLinecap="round" fill="none" />
  ),
  rings: (
    <>
      <circle cx="18" cy="12" r="8" fill="none" />
      <circle cx="30" cy="12" r="8" fill="none" />
    </>
  ),
  vine: (
    <path
      d="M2 12h44M10 12c0-4 4-4 4 0s4 4 4 0M28 12c0-4 4-4 4 0s4 4 4 0"
      strokeLinecap="round"
      fill="none"
    />
  ),
  leaf: (
    <path d="M14 18C14 8 24 4 34 6c2 10-4 14-14 14-2 0-4-1-6-2zm0 0l18-11" fill="none" strokeLinecap="round" />
  ),
  candle: (
    <>
      <path d="M24 4c-2.5 3-2.5 5 0 7 2.5-2 2.5-4 0-7z" fill="none" strokeLinejoin="round" />
      <path d="M21 13h6v8h-6zM17 21h14" fill="none" strokeLinecap="round" />
    </>
  ),
  ribbon: (
    <path
      d="M8 6c8 6 24 6 32 0M8 18c8-6 24-6 32 0M24 9v6"
      strokeLinecap="round"
      fill="none"
    />
  ),
  lily: (
    <path
      d="M24 20V9m0 0C21 4 16 3 12 5c1 5 6 8 12 4zm0 0c3-5 8-6 12-4-1 5-6 8-12 4z"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
};

interface MotifGlyphProps {
  glyphId?: string;
  size?: number;
  className?: string;
}

export function MotifGlyph({ glyphId, size = 44, className }: MotifGlyphProps) {
  if (!glyphId || !GLYPH_PATHS[glyphId]) return null;
  return (
    <span className={`inv-motif ${className ?? ""}`} aria-hidden>
      <svg
        width={size}
        height={size / 2}
        viewBox="0 0 48 24"
        stroke="currentColor"
        strokeWidth="1.4"
      >
        {GLYPH_PATHS[glyphId]}
      </svg>
    </span>
  );
}
