"use client";

import { usePathname } from "next/navigation";
import { PreferencesToolbar } from "@/components/layout/preferences-toolbar";

/** Routes that render their own scoped preferences (e.g. guest invite with locale limits) */
const SKIP_PATHS = [/^\/invite\//, /^\/admission\//];

export function GlobalPreferences() {
  const pathname = usePathname() ?? "";
  if (SKIP_PATHS.some((re) => re.test(pathname))) return null;

  return (
    <div
      className="fixed bottom-6 left-4 z-[90] pointer-events-none"
      aria-live="polite"
    >
      <div className="pointer-events-auto">
        <PreferencesToolbar />
      </div>
    </div>
  );
}
