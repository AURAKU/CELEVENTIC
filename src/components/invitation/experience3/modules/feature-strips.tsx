"use client";

import type { CSSProperties, ReactNode } from "react";

type Tone = "light" | "dark" | "solemn";

const toneColors = (tone: Tone) =>
  tone === "dark"
    ? { fg: "#f5f5f4", muted: "#a8a29e", line: "rgba(245,245,244,0.18)", chip: "rgba(245,245,244,0.08)" }
    : tone === "solemn"
      ? { fg: "#292524", muted: "#78716c", line: "rgba(87,83,78,0.22)", chip: "rgba(87,83,78,0.06)" }
      : { fg: "#1c1917", muted: "#78716c", line: "rgba(28,25,23,0.12)", chip: "rgba(28,25,23,0.04)" };

export function Experience3OrnamentRule({ tone = "light" }: { tone?: Tone }) {
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
      <span style={{ flex: 1, height: 1, background: c.line }} />
      <span style={{ fontSize: "0.7rem", letterSpacing: "0.35em" }}>✦</span>
      <span style={{ flex: 1, height: 1, background: c.line }} />
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
            padding: "0.35rem 0.75rem",
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
        padding: "1.1rem 1.15rem",
        background: c.chip,
        display: "grid",
        gap: "0.55rem",
      }}
      aria-label="Admission stub"
    >
      <p style={{ margin: 0, fontSize: "0.65rem", letterSpacing: "0.28em", textTransform: "uppercase", color: c.muted }}>
        Admit one
      </p>
      <p style={{ margin: 0, fontSize: "1.15rem", color: c.fg, letterSpacing: "0.04em" }}>{title}</p>
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
              gridTemplateColumns: "6.5rem 1fr",
              gap: "0.75rem",
              borderTop: `1px solid ${c.line}`,
              paddingTop: "0.65rem",
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
        borderRadius: "1.35rem",
        border: `1px solid ${c.line}`,
        background: c.chip,
        padding: "1.1rem 1.15rem",
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
      <div style={{ color: c.fg, fontSize: "0.98rem", lineHeight: 1.65 }}>{children}</div>
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
    padding: "1.35rem 1.2rem",
    textAlign: "center",
  };
  return (
    <section style={frame} aria-label="Commencement citation">
      <p style={{ margin: 0, fontSize: "0.62rem", letterSpacing: "0.32em", textTransform: "uppercase", color: c.muted }}>
        With academic distinction
      </p>
      <p style={{ margin: "0.65rem 0 0.35rem", fontSize: "1.35rem", color: c.fg }}>{title}</p>
      <p style={{ margin: 0, fontSize: "0.92rem", color: c.muted, lineHeight: 1.6 }}>{lede}</p>
    </section>
  );
}
