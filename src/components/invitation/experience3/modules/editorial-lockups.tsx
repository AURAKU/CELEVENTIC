"use client";

type Tone = "light" | "dark" | "solemn";

const colors = (tone: Tone) =>
  tone === "dark"
    ? { fg: "#f5f5f4", muted: "#a8a29e", line: "rgba(245,245,244,0.2)" }
    : { fg: "#1c1917", muted: "#78716c", line: "rgba(28,25,23,0.14)" };

/** Forever-Afaris-inspired date lockup — original composition for Experience 3.0. */
export function Experience3DateLockup({
  weekday,
  day,
  month,
  year,
  time,
  tone = "light",
  label = "The day",
}: {
  weekday: string;
  day: string | number;
  month: string;
  year: string | number;
  time?: string | null;
  tone?: Tone;
  label?: string;
}) {
  const c = colors(tone);
  return (
    <section
      aria-label={label}
      style={{
        display: "grid",
        gap: "0.65rem",
        textAlign: "center",
        padding: "0.35rem 0",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--ix3-eyebrow, ui-sans-serif, system-ui, sans-serif)",
          fontSize: "0.62rem",
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: c.muted,
        }}
      >
        {label}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <span style={{ height: 1, background: `linear-gradient(90deg, transparent, ${c.line})` }} aria-hidden />
        <div>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--ix3-eyebrow, ui-sans-serif, system-ui, sans-serif)",
              fontSize: "0.68rem",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: c.muted,
            }}
          >
            {weekday}
          </p>
          <p
            style={{
              margin: "0.35rem 0 0",
              fontFamily: "var(--ix3-heading, Georgia, serif)",
              fontSize: "clamp(2rem, 6vw, 2.6rem)",
              lineHeight: 1,
              letterSpacing: "0.04em",
              color: c.fg,
            }}
          >
            {day}
          </p>
          <p
            style={{
              margin: "0.35rem 0 0",
              fontFamily: "var(--ix3-body, Georgia, serif)",
              fontSize: "0.95rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: c.fg,
            }}
          >
            {month} {year}
          </p>
          {time ? (
            <p style={{ margin: "0.45rem 0 0", fontSize: "0.85rem", color: c.muted }}>{time}</p>
          ) : null}
        </div>
        <span style={{ height: 1, background: `linear-gradient(90deg, ${c.line}, transparent)` }} aria-hidden />
      </div>
    </section>
  );
}

/** Stacked couple names — heritage editorial, not a single headline string. */
export function Experience3NameStack({
  name1,
  name2,
  conjunction = "&",
  tone = "light",
}: {
  name1: string;
  name2?: string | null;
  conjunction?: string;
  tone?: Tone;
}) {
  const c = colors(tone);
  if (!name2) {
    return (
      <p
        style={{
          margin: 0,
          textAlign: "center",
          fontFamily: "var(--ix3-heading, Georgia, serif)",
          fontSize: "clamp(1.8rem, 5vw, 2.4rem)",
          color: c.fg,
        }}
      >
        {name1}
      </p>
    );
  }
  return (
    <div style={{ textAlign: "center", display: "grid", gap: "0.25rem" }} aria-label={`${name1} and ${name2}`}>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--ix3-heading, Georgia, serif)",
          fontStyle: "italic",
          fontSize: "clamp(1.7rem, 4.8vw, 2.35rem)",
          lineHeight: 1.15,
          color: c.fg,
        }}
      >
        {name1}
      </p>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--ix3-eyebrow, ui-sans-serif, system-ui, sans-serif)",
          fontSize: "0.65rem",
          letterSpacing: "0.36em",
          textTransform: "uppercase",
          color: c.muted,
        }}
      >
        {conjunction}
      </p>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--ix3-heading, Georgia, serif)",
          fontStyle: "italic",
          fontSize: "clamp(1.7rem, 4.8vw, 2.35rem)",
          lineHeight: 1.15,
          color: c.fg,
        }}
      >
        {name2}
      </p>
    </div>
  );
}

/** Compact thank-you / confirmation strip after RSVP — category-aware copy. */
export function Experience3JourneyNote({
  title,
  body,
  tone = "light",
}: {
  title: string;
  body: string;
  tone?: Tone;
}) {
  const c = colors(tone);
  return (
    <aside
      aria-label={title}
      style={{
        border: `1px solid ${c.line}`,
        borderRadius: "1rem",
        padding: "1rem 1.1rem",
        background: tone === "dark" ? "rgba(255,255,255,0.04)" : "rgba(28,25,23,0.03)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--ix3-eyebrow, ui-sans-serif, system-ui, sans-serif)",
          fontSize: "0.62rem",
          letterSpacing: "0.26em",
          textTransform: "uppercase",
          color: c.muted,
        }}
      >
        {title}
      </p>
      <p
        style={{
          margin: "0.45rem 0 0",
          fontFamily: "var(--ix3-body, Georgia, serif)",
          fontSize: "0.98rem",
          lineHeight: 1.6,
          color: c.fg,
        }}
      >
        {body}
      </p>
    </aside>
  );
}
