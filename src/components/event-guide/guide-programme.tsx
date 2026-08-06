"use client";

import type { GuideAttachment, GuideProgrammeItem } from "@/lib/event-guide/types";
import {
  layoutProgramme,
  type ProgrammeCoverLine,
  type ProgrammeRosterGroup,
  type ProgrammeScheduleEntry,
} from "@/lib/event-guide/programme-layout";
import { GuideAttachments } from "./guide-attachments";

type Fonts = { heading: string; body: string; eyebrow: string; script: string };

/**
 * A detail is stored with the organizer's line breaks in it. Blank lines start
 * a new paragraph; single breaks stay breaks. A reading, a soloist and a note
 * about seating should not arrive as one run-on line.
 */
function toParagraphs(value: string): string[] {
  return value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

/**
 * The running order, set as a programme rather than as a list.
 *
 * One component serves the builder's live preview and the guest's page, so
 * there is no second rendering to drift. What it draws is decided by
 * `layoutProgramme`: a title page is set as a title page, the people taking
 * part are set as a roster, and only the things that happen at a time are set
 * on the clock. Everything is drawn in the guide's own colours and type
 * (`--guide-*`), so the invitation's theme still carries.
 *
 * A PDF is an attachment, never the primary rendering — a guest holding a
 * phone in a dim hall should not have to pinch-zoom a document to find when
 * dinner is.
 */
export function GuideProgramme({
  items,
  attachments,
  fonts,
}: {
  items: GuideProgrammeItem[];
  attachments: GuideAttachment[];
  fonts: Fonts;
}) {
  if (items.length === 0) {
    return (
      <div
        data-testid="event-guide-programme-empty"
        className="rounded-2xl border px-5 py-8 text-center text-sm"
        style={{ borderColor: "var(--guide-hairline)", background: "var(--guide-paper)" }}
      >
        <p className="opacity-80">The order of service will appear here once the hosts publish it.</p>
        <GuideAttachments attachments={attachments} fonts={fonts} />
      </div>
    );
  }

  const blocks = layoutProgramme(items);

  return (
    <section data-testid="event-guide-programme">
      {blocks.map((block) => {
        if (block.kind === "cover") {
          return <ProgrammeCover key={block.id} lines={block.lines} fonts={fonts} />;
        }
        if (block.kind === "signpost") {
          return <ProgrammeSignpost key={block.id} title={block.title} fonts={fonts} />;
        }
        if (block.kind === "roster") {
          return <ProgrammeRoster key={block.id} groups={block.groups} fonts={fonts} />;
        }
        return <ProgrammeSchedule key={block.id} entries={block.entries} fonts={fonts} />;
      })}
      <GuideAttachments attachments={attachments} fonts={fonts} />
    </section>
  );
}

/** A hairline with a lozenge at its centre — the one flourish this page uses. */
function Flourish({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`flex items-center justify-center gap-2 ${className}`}>
      <span className="h-px w-10 sm:w-14" style={{ background: "var(--guide-hairline)" }} />
      <span
        className="h-1 w-1 rotate-45"
        style={{ background: "var(--guide-secondary)", opacity: 0.75 }}
      />
      <span className="h-px w-10 sm:w-14" style={{ background: "var(--guide-hairline)" }} />
    </div>
  );
}

/**
 * The title page.
 *
 * Set centred inside a double rule, the way the printed card is: the occasion
 * large, the couple joined by their connector, the date and place small
 * underneath. Nothing here carries a bullet or a clock, because none of it
 * happens at a time.
 */
function ProgrammeCover({ lines, fonts }: { lines: ProgrammeCoverLine[]; fonts: Fonts }) {
  // Roles always arrive in this order, so the cover is three groups with a
  // flourish between them rather than a rule after every line.
  const [title, ...rest] = lines;
  const names = rest.filter((line) => line.role !== "meta");
  const meta = rest.filter((line) => line.role === "meta");

  return (
    <div
      data-testid="event-guide-programme-cover"
      className="rounded-[1.6rem] border p-1.5"
      style={{ borderColor: "var(--guide-hairline)", background: "var(--guide-paper)" }}
      dir="auto"
    >
      <div
        className="rounded-[1.25rem] border px-4 py-7 text-center sm:px-8 sm:py-9"
        style={{ borderColor: "var(--guide-hairline)" }}
      >
        {title ? <CoverLine line={title} fonts={fonts} /> : null}

        {names.length > 0 ? (
          <>
            <Flourish className="my-4" />
            {names.map((line) => (
              <CoverLine key={line.id} line={line} fonts={fonts} />
            ))}
          </>
        ) : null}

        {meta.length > 0 ? (
          <>
            <Flourish className="my-4" />
            <div className="space-y-1.5">
              {meta.map((line) => (
                <CoverLine key={line.id} line={line} fonts={fonts} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function CoverLine({ line, fonts }: { line: ProgrammeCoverLine; fonts: Fonts }) {
  if (line.role === "title") {
    return (
      <h2
        className="text-balance text-[1.35rem] leading-[1.2] sm:text-[1.7rem]"
        style={{
          fontFamily: fonts.heading,
          color: "var(--guide-primary)",
          letterSpacing: line.shouted ? "0.05em" : undefined,
        }}
      >
        {line.text}
      </h2>
    );
  }

  if (line.role === "connector") {
    // Deliberately quiet: `and` is punctuation between the two people, and it
    // should never compete with them for the eye.
    return (
      <p
        className="my-2 text-[0.9rem] lowercase leading-none opacity-65"
        style={{ fontFamily: fonts.script, color: "var(--guide-label, var(--guide-secondary))" }}
      >
        {line.text}
      </p>
    );
  }

  if (line.role === "name") {
    /*
     * The people the day is about. Both names get exactly the same treatment —
     * larger, heavier, in the primary ink, on a wash of the guide's own accent
     * — so neither reads as the guest of the other. The wash comes from
     * `--guide-hairline`, which is already the theme's accent at low alpha, so
     * it tints with the invitation instead of introducing a colour.
     *
     * A script face is beautiful for `Akosua Adjei` and unreadable for
     * `AKOSUA ADJEI`, so capitals keep the display serif instead.
     */
    return (
      <p className="my-1.5">
        <span
          className={`inline-block text-balance rounded-[0.85rem] px-4 py-1.5 font-semibold ${
            line.shouted
              ? "text-[1.22rem] leading-snug sm:text-[1.45rem]"
              : "text-[1.6rem] leading-tight sm:text-[1.9rem]"
          }`}
          style={{
            fontFamily: line.shouted ? fonts.heading : fonts.script,
            color: "var(--guide-primary)",
            background: "var(--guide-hairline)",
            letterSpacing: line.shouted ? "0.1em" : undefined,
            // Tracking hangs off the last letter; the indent puts the name
            // back in the middle of its wash.
            textIndent: line.shouted ? "0.1em" : undefined,
          }}
        >
          {line.text}
        </span>
      </p>
    );
  }

  return (
    <p
      className="text-[0.76rem] leading-relaxed tracking-[0.14em]"
      style={{ fontFamily: fonts.eyebrow, color: "var(--guide-label, var(--guide-secondary))" }}
    >
      {line.text}
    </p>
  );
}

/**
 * A heading the organizer wrote into their programme — `FUNCTIONARIES`,
 * `RECEPTION`. It is a signpost between blocks, so it is set as one: centred
 * between two short rules, once per section rather than once per line.
 */
function ProgrammeSignpost({ title, fonts }: { title: string; fonts: Fonts }) {
  return (
    <div
      data-testid="event-guide-programme-section"
      className="flex items-center gap-3 px-1 pb-3 pt-8"
      dir="auto"
    >
      <span aria-hidden className="h-px flex-1" style={{ background: "var(--guide-hairline)" }} />
      <h3
        className="text-center text-[0.68rem] font-semibold uppercase leading-tight tracking-[0.26em]"
        style={{ fontFamily: fonts.eyebrow, color: "var(--guide-label, var(--guide-secondary))" }}
      >
        {title}
      </h3>
      <span aria-hidden className="h-px flex-1" style={{ background: "var(--guide-hairline)" }} />
    </div>
  );
}

/**
 * The people taking part, in three clear tiers.
 *
 * A role that heads a list (`OFFICIATING MINISTERS`) is a label in the guide's
 * accent, tracked and set apart with space above it — and it never takes a
 * bullet, because it is not a person. The people under it do: a small mark, a
 * name in the display serif, and anything qualifying them — a parish, a title
 * — set smaller and softer beneath.
 *
 * Where the organizer wrote the role and the name on one line, the roster
 * becomes a two-column list instead: the roles are already the marker, so
 * bullets would only add noise.
 */
function ProgrammeRoster({ groups, fonts }: { groups: ProgrammeRosterGroup[]; fonts: Fonts }) {
  const labelled = groups.some((group) => group.people.some((person) => person.label));

  return (
    <div
      data-testid="event-guide-programme-roster"
      className="mt-1 rounded-2xl border px-4 py-3 sm:px-6 sm:py-4"
      style={{ borderColor: "var(--guide-hairline)", background: "var(--guide-paper)" }}
      dir="auto"
    >
      {groups.map((group) => (
        <section key={group.id} className="pt-5 first:pt-0">
          {group.title ? (
            <h4
              data-testid="event-guide-programme-role"
              className="flex items-center gap-2 pb-1.5 text-[0.7rem] font-semibold uppercase leading-tight tracking-[0.2em]"
              style={{
                fontFamily: fonts.eyebrow,
                color: "var(--guide-label, var(--guide-secondary))",
              }}
            >
              <span
                aria-hidden
                className="h-px w-4 shrink-0"
                style={{ background: "var(--guide-secondary)", opacity: 0.6 }}
              />
              {group.title}
            </h4>
          ) : null}

          <ul>
            {group.people.map((person) => (
              <li
                key={person.id}
                data-testid="event-guide-programme-person"
                className={
                  labelled
                    ? "grid gap-x-5 gap-y-0.5 py-2 sm:grid-cols-[minmax(6rem,10rem)_1fr]"
                    : "flex gap-2.5 py-1.5"
                }
              >
                {person.label ? (
                  <p
                    className="text-[0.64rem] font-semibold uppercase leading-relaxed tracking-[0.16em] sm:pt-[0.2rem]"
                    style={{
                      fontFamily: fonts.eyebrow,
                      color: "var(--guide-label, var(--guide-secondary))",
                    }}
                  >
                    {person.label}
                  </p>
                ) : null}

                {labelled ? null : (
                  <span
                    aria-hidden
                    className="mt-[0.55rem] h-[0.25rem] w-[0.25rem] shrink-0 rounded-full"
                    style={{ background: "var(--guide-secondary)" }}
                  />
                )}

                <div className={labelled && !person.label ? "sm:col-span-2" : "min-w-0"}>
                  <p
                    className="text-[0.98rem] leading-snug"
                    style={{ fontFamily: fonts.heading, color: "var(--guide-primary)" }}
                  >
                    {person.name}
                  </p>
                  {person.notes.map((note, index) => (
                    <p key={index} className="mt-0.5 text-[0.8rem] leading-relaxed opacity-65">
                      {note}
                    </p>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * The clock.
 *
 * Times run down their own column against a single continuous rule, so a
 * guest scanning for "when is dinner" reads one line of figures rather than
 * hunting through prose. Below `sm` the column narrows and the time wraps
 * rather than the title being squeezed — a 320px phone is the design target,
 * not the fallback.
 */
function ProgrammeSchedule({
  entries,
  fonts,
}: {
  entries: ProgrammeScheduleEntry[];
  fonts: Fonts;
}) {
  const timed = entries.some((entry) => entry.time);

  return (
    <ol data-testid="event-guide-programme-schedule" className="mt-2">
      {entries.map((entry, index) => {
        const last = index === entries.length - 1;
        return (
          <li
            key={entry.id}
            data-testid="event-guide-programme-item"
            className={
              timed
                ? "grid grid-cols-[3.9rem_1fr] gap-x-2.5 sm:grid-cols-[5.5rem_1fr] sm:gap-x-5"
                : "grid grid-cols-1"
            }
          >
            {timed ? (
              <p
                className="pt-[0.15rem] text-right text-[0.7rem] font-semibold uppercase leading-[1.5] tracking-[0.06em] tabular-nums sm:text-[0.78rem] sm:tracking-[0.1em]"
                style={{
                  fontFamily: fonts.eyebrow,
                  color: "var(--guide-label, var(--guide-secondary))",
                }}
              >
                {entry.time}
              </p>
            ) : null}

            <div
              className={`relative border-l pl-4 sm:pl-5 ${last ? "pb-1" : "pb-6"}`}
              style={{ borderColor: last ? "transparent" : "var(--guide-hairline)" }}
              dir="auto"
            >
              <span
                aria-hidden
                className="absolute left-0 top-[0.42rem] h-[0.4rem] w-[0.4rem] -translate-x-1/2 rounded-full"
                style={{
                  background: "var(--guide-secondary)",
                  boxShadow: "0 0 0 3px var(--guide-paper)",
                }}
              />
              <p
                className="text-[1.02rem] leading-snug sm:text-[1.08rem]"
                style={{ fontFamily: fonts.heading, color: "var(--guide-primary)" }}
              >
                {entry.title}
              </p>
              {entry.description
                ? toParagraphs(entry.description).map((paragraph, i) => (
                    <p
                      key={i}
                      className="mt-1.5 whitespace-pre-line text-[0.88rem] leading-[1.7] opacity-75"
                    >
                      {paragraph}
                    </p>
                  ))
                : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
