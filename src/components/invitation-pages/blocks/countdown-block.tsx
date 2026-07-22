"use client";

import { useCountdown } from "@/hooks/use-countdown";
import type { PageRenderContext } from "@/lib/invite-blueprints/blueprint-types";

/** Live countdown, token-styled. Solemn label for funerals. */
export function CountdownBlock({ context }: { context: PageRenderContext }) {
  const targetIso = context.event.startDateRaw;
  const isFuneral = context.category === "funeral";
  const { d, h, m, s, begun } = useCountdown(targetIso ?? "");

  if (!targetIso) return null;

  if (begun) {
    return (
      <p className="inv-script">
        {isFuneral ? "The service is underway" : "The celebration has begun"}
      </p>
    );
  }

  const units = [
    { value: d, label: "Days" },
    { value: h, label: "Hours" },
    { value: m, label: "Min" },
    { value: s, label: "Sec" },
  ];

  return (
    <div className="w-full">
      <p className="inv-eyebrow" style={{ marginBottom: "0.6rem" }}>
        {isFuneral ? "Until the service" : "Until the celebration"}
      </p>
      <div className="inv-countdown" suppressHydrationWarning>
        {units.map((u) => (
          <div key={u.label} className="inv-countdown-unit">
            <span className="inv-countdown-value" suppressHydrationWarning>
              {String(u.value).padStart(2, "0")}
            </span>
            <span className="inv-countdown-label">{u.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
