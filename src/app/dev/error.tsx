"use client";

import { useEffect } from "react";
import { safeSessionStorage } from "@/lib/browser/safe-storage";

const RELOAD_KEY = "celeventic:dev-error-reload";

/**
 * Dev-runtime pages must recover from HMR / missing-DB throws instead of
 * trapping the invitation behind the public error card.
 */
export default function DevRuntimeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dev-runtime-error]", error);
    const session = safeSessionStorage();
    if (!session) return;
    try {
      if (session.getItem(RELOAD_KEY)) return;
      session.setItem(RELOAD_KEY, "1");
      window.location.reload();
    } catch {
      /* ignore */
    }
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Preview needs a refresh</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          This development preview hit an unexpected error. Reload it to continue.
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              reset();
            } catch {
              /* ignore */
            }
            window.location.reload();
          }}
          className="mt-6 inline-flex items-center rounded-full bg-[#0B8A83] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Reload preview
        </button>
      </div>
    </div>
  );
}
