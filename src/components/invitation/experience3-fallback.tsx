"use client";

/**
 * Safe fallback when an invitation opts into layoutVersion ≥ 2 but no
 * Experience 3.0 registration exists. Never silently renders a different layout.
 */

type Experience3FallbackProps = {
  layout: string;
  layoutVersion: number;
};

export function Experience3Fallback({ layout, layoutVersion }: Experience3FallbackProps) {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 py-16 text-center"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-medium text-slate-700">
        This invitation experience isn&apos;t available yet.
      </p>
      <p className="max-w-md text-xs text-slate-500">
        Layout <span className="font-mono">{layout}</span> version{" "}
        <span className="font-mono">{layoutVersion}</span> has no registered Experience 3.0
        renderer. Your event details and entry pass below remain available when provided.
      </p>
    </div>
  );
}
