"use client";

import type { CSSProperties, ReactNode } from "react";

type Tone = "light" | "dark" | "solemn";

const toneColors = (tone: Tone) =>
  tone === "dark"
    ? { fg: "#f5f5f4", muted: "#a8a29e", line: "rgba(245,245,244,0.18)", chip: "rgba(245,245,244,0.08)" }
    : tone === "solemn"
      ? { fg: "#292524", muted: "#78716c", line: "rgba(87,83,78,0.22)", chip: "rgba(87,83,78,0.06)" }
      : { fg: "#1c1917", muted: "#78716c", line: "rgba(28,25,23,0.12)", chip: "rgba(28,25,23,0.04)" };

export function Experience3OrnamentRule({
  tone = "light",
  mark = "✦",
}: {
  tone?: Tone;
  mark?: string;
}) {
  const c = toneColors(tone);
  return (
    <div
      aria-hidden
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        color: c.muted,
      }}
    >
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${c.line})` }} />
      <span style={{ fontSize: "0.7rem", letterSpacing: "0.35em" }}>{mark}</span>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${c.line}, transparent)` }} />
    </div>
  );
}

export function Experience3ChipRow({
  chips,
  tone = "light",
}: {
  chips: string[];
  tone?: Tone;
}) {
  const c = toneColors(tone);
  if (!chips.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }} aria-label="Highlights">
      {chips.map((chip) => (
        <span
          key={chip}
          style={{
            border: `1px solid ${c.line}`,
            background: c.chip,
            color: c.fg,
            borderRadius: 999,
            padding: "0.4rem 0.85rem",
            fontSize: "0.68rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

export function Experience3TicketStub({
  title,
  subtitle,
  meta,
  tone = "dark",
}: {
  title: string;
  subtitle: string;
  meta: string;
  tone?: Tone;
}) {
  const c = toneColors(tone);
  return (
    <div
      style={{
        border: `1px dashed ${c.line}`,
        borderRadius: "1rem",
        padding: "1.2rem 1.2rem",
        background: `linear-gradient(135deg, ${c.chip}, transparent)`,
        display: "grid",
        gap: "0.55rem",
      }}
      aria-label="Admission stub"
    >
      <p style={{ margin: 0, fontSize: "0.65rem", letterSpacing: "0.28em", textTransform: "uppercase", color: c.muted }}>
        Admit one
      </p>
      <p style={{ margin: 0, fontSize: "1.2rem", color: c.fg, letterSpacing: "0.04em", fontWeight: 600 }}>{title}</p>
      <p style={{ margin: 0, fontSize: "0.85rem", color: c.muted }}>{subtitle}</p>
      <p style={{ margin: 0, fontSize: "0.75rem", color: c.fg }}>{meta}</p>
    </div>
  );
}

export function Experience3AgendaTable({
  rows,
  tone = "dark",
  heading = "Programme",
}: {
  rows: Array<{ time: string; item: string }>;
  tone?: Tone;
  heading?: string;
}) {
  const c = toneColors(tone);
  if (!rows.length) return null;
  return (
    <section aria-label={heading}>
      <p
        style={{
          margin: "0 0 0.85rem",
          fontSize: "0.65rem",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: c.muted,
        }}
      >
        {heading}
      </p>
      <div style={{ display: "grid", gap: "0.65rem" }}>
        {rows.map((row) => (
          <div
            key={`${row.time}-${row.item}`}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(5.5rem, 6.5rem) 1fr",
              gap: "0.75rem",
              borderTop: `1px solid ${c.line}`,
              paddingTop: "0.7rem",
            }}
          >
            <span style={{ color: c.muted, fontSize: "0.78rem", letterSpacing: "0.08em" }}>{row.time}</span>
            <span style={{ color: c.fg, fontSize: "0.95rem" }}>{row.item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Experience3SoftCard({
  title,
  children,
  tone = "light",
}: {
  title: string;
  children: ReactNode;
  tone?: Tone;
}) {
  const c = toneColors(tone);
  return (
    <section
      style={{
        borderRadius: "1.5rem",
        border: `1px solid ${c.line}`,
        background: c.chip,
        padding: "1.2rem 1.25rem",
      }}
      aria-label={title}
    >
      <p
        style={{
          margin: "0 0 0.55rem",
          fontSize: "0.65rem",
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: c.muted,
        }}
      >
        {title}
      </p>
      <div style={{ color: c.fg, fontSize: "1.02rem", lineHeight: 1.7 }}>{children}</div>
    </section>
  );
}

export function Experience3DiplomaFrame({
  title,
  lede,
  tone = "light",
}: {
  title: string;
  lede: string;
  tone?: Tone;
}) {
  const c = toneColors(tone);
  const frame: CSSProperties = {
    border: `2px solid ${c.line}`,
    boxShadow: `inset 0 0 0 1px ${c.line}`,
    borderRadius: "0.35rem",
    padding: "1.55rem 1.25rem",
    textAlign: "center",
    background: c.chip,
  };
  return (
    <section style={frame} aria-label="Commencement citation">
      <p style={{ margin: 0, fontSize: "0.62rem", letterSpacing: "0.32em", textTransform: "uppercase", color: c.muted }}>
        With academic distinction
      </p>
      <p style={{ margin: "0.75rem 0 0.4rem", fontSize: "1.45rem", color: c.fg, fontFamily: "Georgia, serif" }}>
        {title}
      </p>
      <p style={{ margin: 0, fontSize: "0.95rem", color: c.muted, lineHeight: 1.65 }}>{lede}</p>
    </section>
  );
}

export function Experience3CoupleCard({
  name1,
  name2,
  tone = "light",
}: {
  name1: string;
  name2?: string | null;
  tone?: Tone;
}) {
  const c = toneColors(tone);
  return (
    <section
      aria-label="Couple"
      style={{
        textAlign: "center",
        display: "grid",
        gap: "0.55rem",
        padding: "0.35rem 0 0.15rem",
      }}
    >
      <p style={{ margin: 0, fontSize: "0.65rem", letterSpacing: "0.32em", textTransform: "uppercase", color: c.muted }}>
        The couple
      </p>
      <p style={{ margin: 0, fontSize: "1.55rem", color: c.fg, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
        {name2 ? `${name1} & ${name2}` : name1}
      </p>
    </section>
  );
}

export function Experience3VenuePanel({
  venue,
  landmark,
  dressCode,
  tone = "light",
  heading = "Gathering",
}: {
  venue?: string | null;
  landmark?: string | null;
  dressCode?: string | null;
  tone?: Tone;
  heading?: string;
}) {
  const c = toneColors(tone);
  const place = [venue, landmark].filter(Boolean).join(" · ");
  if (!place && !dressCode) return null;
  return (
    <section
      aria-label={heading}
      style={{
        display: "grid",
        gap: "0.85rem",
        borderTop: `1px solid ${c.line}`,
        borderBottom: `1px solid ${c.line}`,
        padding: "1.1rem 0",
      }}
    >
      <p style={{ margin: 0, fontSize: "0.65rem", letterSpacing: "0.28em", textTransform: "uppercase", color: c.muted }}>
        {heading}
      </p>
      {place ? <p style={{ margin: 0, color: c.fg, fontSize: "1.05rem", lineHeight: 1.5 }}>{place}</p> : null}
      {dressCode ? (
        <p style={{ margin: 0, color: c.muted, fontSize: "0.92rem" }}>
          Dress code · {dressCode}
        </p>
      ) : null}
    </section>
  );
}

export function Experience3LineupList({
  items,
  tone = "dark",
  heading = "Line-up",
}: {
  items: string[];
  tone?: Tone;
  heading?: string;
}) {
  const c = toneColors(tone);
  if (!items.length) return null;
  return (
    <section aria-label={heading}>
      <p
        style={{
          margin: "0 0 0.85rem",
          fontSize: "0.65rem",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: c.muted,
        }}
      >
        {heading}
      </p>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.55rem" }}>
        {items.map((item, index) => (
          <li
            key={item}
            style={{
              display: "grid",
              gridTemplateColumns: "2.2rem 1fr",
              gap: "0.65rem",
              alignItems: "baseline",
              borderTop: index === 0 ? "none" : `1px solid ${c.line}`,
              paddingTop: index === 0 ? 0 : "0.55rem",
            }}
          >
            <span style={{ color: c.muted, fontSize: "0.72rem", letterSpacing: "0.12em" }}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <span style={{ color: c.fg, fontSize: "1.05rem", letterSpacing: "0.04em" }}>{item}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
