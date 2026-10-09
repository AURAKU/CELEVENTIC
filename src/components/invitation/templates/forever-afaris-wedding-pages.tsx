"use client";

import { useEffect, useRef, useState } from "react";
import type { FaPalette } from "@/components/invitation/templates/forever-afaris-wedding-palette";
import type { WeddingBookPage } from "@/lib/invitation/wedding-pages";

export function WeddingBook({
  pages,
  palette: C,
  reduced,
  childrenFor,
}: {
  pages: WeddingBookPage[];
  palette: FaPalette;
  reduced: boolean;
  childrenFor: (page: WeddingBookPage) => React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const safeIndex = Math.min(index, Math.max(0, pages.length - 1));
  const page = pages[safeIndex];

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>(".invite-viewport-live");
    scroller?.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }, [safeIndex, reduced]);

  if (!page) return null;

  const go = (next: number) => {
    setIndex(Math.min(pages.length - 1, Math.max(0, next)));
  };

  return (
    <div className="min-w-0">
      <nav
        className="sticky top-0 z-20 -mx-4 mb-8 flex items-center gap-2 px-4 py-3 min-[375px]:-mx-5 min-[375px]:px-5 sm:-mx-8 sm:px-8 md:-mx-10 md:px-10"
        style={{
          background: `${C.ivory}f2`,
          borderBottom: `1px solid ${C.border}`,
          backdropFilter: "blur(10px)",
        }}
        aria-label="Invitation pages"
      >
        <PagerButton
          label="Previous page"
          disabled={safeIndex === 0}
          onClick={() => go(safeIndex - 1)}
          palette={C}
        >
          Prev
        </PagerButton>
        <div className="min-w-0 flex-1 text-center">
          <p
            className="truncate font-[family-name:var(--font-cinzel)] text-[0.72rem] uppercase tracking-[0.22em] sm:text-[0.8rem]"
            style={{ color: C.ink }}
          >
            {page.title}
          </p>
          <p className="mt-0.5 font-[family-name:var(--font-cormorant)] text-[0.95rem] italic" style={{ color: C.cocoa }}>
            {safeIndex + 1} of {pages.length}
          </p>
          <div className="mt-1.5 flex items-center justify-center gap-1.5" role="tablist" aria-label="Pages">
            {pages.map((item, dot) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={dot === safeIndex}
                aria-label={item.title}
                onClick={() => go(dot)}
                className="h-1.5 rounded-full transition-[width,background-color]"
                style={{
                  width: dot === safeIndex ? 18 : 6,
                  background: dot === safeIndex ? C.goldDeep : C.goldSoft,
                }}
              />
            ))}
          </div>
        </div>
        <PagerButton
          label="Next page"
          disabled={safeIndex >= pages.length - 1}
          onClick={() => go(safeIndex + 1)}
          palette={C}
        >
          Next
        </PagerButton>
      </nav>

      <div
        key={page.id}
        onPointerDown={(event) => {
          if (shouldIgnoreSwipe(event.target)) return;
          touch.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={(event) => {
          const start = touch.current;
          touch.current = null;
          if (!start || shouldIgnoreSwipe(event.target)) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
          go(safeIndex + (dx < 0 ? 1 : -1));
        }}
        onPointerCancel={() => {
          touch.current = null;
        }}
      >
        {childrenFor(page)}
      </div>
    </div>
  );
}

function PagerButton({
  label,
  disabled,
  onClick,
  palette: C,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  palette: FaPalette;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-11 min-w-[4.5rem] items-center justify-center rounded-full px-3 font-[family-name:var(--font-cinzel)] text-[0.68rem] uppercase tracking-[0.16em] disabled:opacity-35 sm:min-w-[5.25rem] sm:text-[0.72rem]"
      style={{ color: C.ink, border: `1px solid ${C.border}`, background: C.linen }}
    >
      {children}
    </button>
  );
}

function shouldIgnoreSwipe(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("a, button, input, textarea, select, canvas, [role='slider']"));
}
