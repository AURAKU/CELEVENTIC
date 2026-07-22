"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

const STORAGE_KEY = "celeventic:swipe-hint-count";
// Some webviews (private mode) throw on localStorage — degrade to memory.
const memoryFallback = { count: 0 };

function readHintCount(): number {
  try {
    return Number(window.localStorage.getItem(STORAGE_KEY) ?? "0") || 0;
  } catch {
    return memoryFallback.count;
  }
}

function bumpHintCount(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(readHintCount() + 1));
  } catch {
    memoryFallback.count += 1;
  }
}

/**
 * First-visit "swipe up" affordance on the cover. CSS delays it 1.2s and bobs
 * the chevron (transform-only); shown max twice per guest.
 */
export function SwipeHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (readHintCount() >= 2) return;
    bumpHintCount();
    setShow(true);
  }, []);

  if (!show) return null;
  return (
    <div className="inv-swipe-hint inv-paged-chrome" aria-hidden>
      <ChevronUp size={20} className="inv-swipe-hint-chevron" />
      Swipe up
    </div>
  );
}
