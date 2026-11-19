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
  const accent = "var(--ix3-accent, currentColor)";

  return (
    <section aria-label={heading}>
      <p
        style={{
          fontFamily: "var(--ix3-eyebrow, ui-sans-serif, system-ui, sans-serif)",
          fontSize: "0.65rem",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: muted,
          marginBottom: "0.95rem",
        }}
      >
        {heading}
      </p>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.95rem" }}>
        {beats.map((beat, index) => (
          <li
            key={`${beat.label}-${beat.detail}`}
            style={{
              display: "grid",
              gridTemplateColumns: "1.1rem 1fr",
              gap: "0.75rem",
              alignItems: "start",
            }}
          >
            <span
              aria-hidden
              style={{
                width: "0.55rem",
                height: "0.55rem",
                marginTop: "0.35rem",
                borderRadius: 999,
                background: accent,
                boxShadow: `0 0 0 3px color-mix(in srgb, ${accent} 18%, transparent)`,
                opacity: 0.85,
              }}
            />
            <div
              style={{
                borderLeft: `1px solid ${border}`,
                paddingLeft: "0.9rem",
                paddingBottom: index === beats.length - 1 ? 0 : "0.15rem",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--ix3-eyebrow, ui-sans-serif, system-ui, sans-serif)",
                  fontSize: "0.68rem",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: muted,
                }}
              >
                {beat.label}
              </div>
              <div
                style={{
                  marginTop: "0.2rem",
                  color: fg,
                  fontFamily: "var(--ix3-body, Georgia, serif)",
                  fontSize: "1.02rem",
                  lineHeight: 1.45,
                }}
              >
                {beat.detail}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
