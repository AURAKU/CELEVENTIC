"use client";

import { usePathname } from "next/navigation";
import { PreferencesMenu } from "@/components/layout/preferences-menu";

const HIDDEN_PATH = /\/present(?:\/|$)/;

/**
 * Language and currency control for pages that do not mount a header menu
 * (guest CeleYou, invite ceremony, auth, memorial). Hidden when chrome already
 * has PreferencesMenu via [data-celeventic-prefs].
 */
export function LocaleDock() {
  const pathname = usePathname() ?? "";
  if (HIDDEN_PATH.test(pathname)) return null;

  return (
    <div className="celeventic-locale-dock pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[70]">
      <div className="pointer-events-auto">
        <PreferencesMenu compact iconOnly chrome={false} />
      </div>
    </div>
  );
}
