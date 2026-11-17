"use client";

type TimelineBeat = {
  label: string;
  detail: string;
};

type EssentialsTimelineProps = {
  beats: TimelineBeat[];
  heading?: string;
  tone?: "light" | "dark" | "solemn";
};

/** Renders only caller-supplied beats — never invents ceremony times. */
export function Experience3EssentialsTimeline({
  beats,
  heading = "Programme",
  tone = "light",
}: EssentialsTimelineProps) {
  if (!beats.length) return null;

  const muted = tone === "dark" ? "#a8a29e" : "#78716c";
  const fg = tone === "dark" ? "#f5f5f4" : "#1c1917";
  const border = tone === "dark" ? "rgba(231,229,228,0.18)" : "rgba(138,106,61,0.28)";

  return (
    <section aria-label={heading}>
      <p
        style={{
          fontSize: "0.65rem",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: muted,
          marginBottom: "0.85rem",
        }}
      >
        {heading}
      </p>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.85rem" }}>
        {beats.map((beat) => (
          <li
            key={`${beat.label}-${beat.detail}`}
            style={{
              borderLeft: `2px solid ${border}`,
              paddingLeft: "0.9rem",
            }}
          >
            <div style={{ fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: muted }}>
              {beat.label}
            </div>
            <div style={{ color: fg, fontSize: "1rem", lineHeight: 1.45 }}>{beat.detail}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
