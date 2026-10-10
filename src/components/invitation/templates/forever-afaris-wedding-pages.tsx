"use client";

import { useEffect, useRef, useState } from "react";

export type WeddingScrollSection = {
  id: string;
  node: React.ReactNode;
};

/**
 * One continuous invitation. The first sections paint immediately.
 * Later sections mount as the guest scrolls toward them, so the page
 * stays light and the scroll stays smooth.
 */
export function WeddingScroll({ sections }: { sections: WeddingScrollSection[] }) {
  return (
    <div className="min-w-0">
      {sections.map((section, index) => (
        <LazySection key={section.id} eager={index < 2}>
          {section.node}
        </LazySection>
      ))}
    </div>
  );
}

function LazySection({ eager, children }: { eager: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(eager);

  useEffect(() => {
    if (show) return;
    const node = ref.current;
    if (!node) return;
    const root = document.querySelector<HTMLElement>(".invite-viewport-live");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setShow(true);
      },
      { root, rootMargin: "900px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [show]);

  return (
    <div ref={ref} className={show ? "min-w-0" : "min-h-[45vh] min-w-0"}>
      {show ? children : null}
    </div>
  );
}
