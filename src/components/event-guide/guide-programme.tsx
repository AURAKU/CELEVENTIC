"use client";

import type { GuideAttachment, GuideProgrammeItem } from "@/lib/event-guide/types";
import {
  layoutProgramme,
  type ProgrammeBlock,
  type ProgrammeCoverLine,
  type ProgrammeRosterGroup,
  type ProgrammeScheduleEntry,
} from "@/lib/event-guide/programme-layout";
import { isShouted } from "@/lib/event-guide/programme-lines";
import { GuideAttachments } from "./guide-attachments";
import { CeremonyArch, MusicMark, PAPER_WASH, SprigDivider } from "./guide-motifs";

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
 * Everything written under an item: a note, a reading, a stanza of the hymn.
 *
 * `whitespace-pre-line` is the whole point — a hymn's lines break where the
 * organizer broke them, rather than being reflowed into a paragraph, and a
 * blank line between two stanzas stays a blank line.
 */
function Detail({ text }: { text: string }) {
  return (
    <>
      {toParagraphs(text).map((paragraph, index) => (
        <p
          key={index}
          className="mt-1.5 whitespace-pre-line text-[0.88rem] leading-[1.7] opacity-75"
        >
          {paragraph}
        </p>
      ))}
    </>
  );
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
        if (block.kind === "hymn") {
          return <ProgrammeHymn key={block.id} hymn={block} fonts={fonts} />;
        }
        if (block.kind === "appreciation") {
          return (
            <ProgrammeAppreciation
              key={block.id}
              title={block.title}
              lines={block.lines}
              fonts={fonts}
            />
          );
        }
        return <ProgrammeSchedule key={block.id} entries={block.entries} fonts={fonts} />;
      })}
      <GuideAttachments attachments={attachments} fonts={fonts} />
    </section>
  );
}

/**
 * The rule between the parts of a title page.
 *
 * A sprig rather than a lozenge: the same job, in the language a wedding
 * programme is set in. Drawn in the decorative accent, never the label ink —
 * it carries no information, so it is not held to the contrast type is.
 */
function Flourish({ className = "" }: { className?: string }) {
  return (
    <SprigDivider
      className={`mx-auto h-4 w-40 max-w-[70%] ${className}`}
      style={{ color: "var(--guide-secondary)", opacity: 0.75 }}
    />
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
        className="relative overflow-hidden rounded-[1.25rem] border px-4 py-7 text-center sm:px-8 sm:py-9"
        style={{ borderColor: "var(--guide-hairline)", backgroundImage: PAPER_WASH }}
      >
        {/*
          The arch stands behind the whole title page rather than beside it, at
          the opacity of a watermark. Nothing is read off it, so it cannot cost
          the couple's names any contrast — and it is what turns a bordered box
          into the front of an order of service.
        */}
        <CeremonyArch
          className="pointer-events-none absolute inset-x-0 bottom-0 h-full w-full opacity-[0.09]"
          style={{ color: "var(--guide-primary)" }}
        />

        <div className="relative">
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
              {/*
                The date and the hour belong on one line — they are one fact —
                and a venue that follows them wraps onto the next by itself.
                Stacked, each on its own row, they read as three separate
                announcements.
              */}
              <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1.5">
                {meta.map((line, index) => (
                  <div key={line.id} className="flex items-baseline gap-3">
                    {index > 0 ? (
                      <span
                        aria-hidden
                        className="h-[3px] w-[3px] rotate-45"
                        style={{ background: "var(--guide-secondary)", opacity: 0.7 }}
                      />
                    ) : null}
                    <CoverLine line={line} fonts={fonts} />
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
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
/** A single leaf, turned to face the heading it sits beside. */
function LeafMark({ flipped = false }: { flipped?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className={`h-2.5 w-2.5 shrink-0 ${flipped ? "-scale-x-100" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: "var(--guide-secondary)" }}
    >
      <path d="M10.5 1.5C10.5 6.2 7.6 9 3.4 9 1.9 9 1.1 8.2 1.4 6.8 2 4 5.3 1.5 10.5 1.5Z" />
    </svg>
  );
}

function ProgrammeSignpost({ title, fonts }: { title: string; fonts: Fonts }) {
  return (
    <div
      data-testid="event-guide-programme-section"
      className="flex items-center gap-3 px-1 pb-3 pt-8"
      dir="auto"
    >
      <span aria-hidden className="h-px flex-1" style={{ background: "var(--guide-hairline)" }} />
      <LeafMark />
      <h3
        className="text-center text-[0.68rem] font-semibold uppercase leading-tight tracking-[0.26em]"
        style={{ fontFamily: fonts.eyebrow, color: "var(--guide-label, var(--guide-secondary))" }}
      >
        {title}
      </h3>
      <LeafMark flipped />
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
      style={{
        borderColor: "var(--guide-hairline)",
        background: "var(--guide-paper)",
        backgroundImage: PAPER_WASH,
      }}
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
 * A hymn, set as a hymnal card rather than as a line of the running order.
 *
 * On the timeline it was one bullet on the same rail as `Order of
 * photography`, with six lines of verse folded into the small grey slot meant
 * for "rings are exchanged". Nobody sings from that.
 *
 * So it breaks out: its own panel, the cue and the title centred above a
 * rule, and the verse centred and airy underneath at reading size, keeping
 * every line break the poet wrote. Stanzas are separated by space rather than
 * by a rule, which is how a hymnal does it.
 */
function ProgrammeHymn({
  hymn,
  fonts,
}: {
  hymn: Extract<ProgrammeBlock, { kind: "hymn" }>;
  fonts: Fonts;
}) {
  return (
    <section
      data-testid="event-guide-programme-hymn"
      className="mt-3 rounded-2xl border px-5 py-6 text-center sm:px-8 sm:py-7"
      style={{
        borderColor: "var(--guide-hairline)",
        background: "var(--guide-paper)",
        backgroundImage: PAPER_WASH,
      }}
      dir="auto"
    >
      <MusicMark
        className="mx-auto h-5 w-5"
        style={{ color: "var(--guide-secondary)" }}
      />

      {hymn.cue || hymn.time ? (
        <p
          className="mt-2.5 text-[0.64rem] font-semibold uppercase leading-tight tracking-[0.24em]"
          style={{ fontFamily: fonts.eyebrow, color: "var(--guide-label, var(--guide-secondary))" }}
        >
          {[hymn.time, hymn.cue].filter(Boolean).join("  ·  ")}
        </p>
      ) : null}

      <h3
        className="mt-1.5 text-balance text-[1.15rem] leading-snug sm:text-[1.3rem]"
        style={{
          fontFamily: fonts.heading,
          color: "var(--guide-primary)",
          letterSpacing: isShouted(hymn.title) ? "0.06em" : undefined,
        }}
      >
        {hymn.title}
      </h3>

      {hymn.stanzas.length > 0 ? (
        <>
          <Flourish className="my-4" />
          <div className="space-y-5">
            {hymn.stanzas.map((stanza) => (
              <p
                key={stanza.id}
                data-testid="event-guide-programme-hymn-stanza"
                className="text-balance text-[0.95rem] leading-[1.95]"
                style={{ fontFamily: fonts.body }}
              >
                {stanza.lines.map((line, index) => (
                  <span key={index} className="block">
                    {line}
                  </span>
                ))}
              </p>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

/**
 * The hosts turning from the running order to speak to the room.
 *
 * `APPRECIATION`, and the two sentences under it, are not things that happen
 * at a time — set on the timeline they took a bullet each and read as two
 * more items to get through. Here they close the programme: centred, on the
 * accent's own wash, in the script face the invitation is signed in.
 */
function ProgrammeAppreciation({
  title,
  lines,
  fonts,
}: {
  title: string;
  lines: string[];
  fonts: Fonts;
}) {
  return (
    <section
      data-testid="event-guide-programme-appreciation"
      className="mt-6 rounded-2xl border px-5 py-7 text-center sm:px-8"
      style={{
        borderColor: "var(--guide-hairline)",
        background: "var(--guide-paper)",
        backgroundImage: PAPER_WASH,
      }}
      dir="auto"
    >
      {title ? (
        <h3
          className="text-[0.68rem] font-semibold uppercase leading-tight tracking-[0.28em]"
          style={{ fontFamily: fonts.eyebrow, color: "var(--guide-label, var(--guide-secondary))" }}
        >
          {title}
        </h3>
      ) : null}

      <Flourish className={title ? "my-4" : "mb-4"} />

      <div className="space-y-3">
        {lines.map((line, index) => (
          <p
            key={index}
            data-testid="event-guide-programme-appreciation-line"
            /*
             * The first line is the sentiment and gets the script face; the
             * rest are set as body text. A whole card in a script face is
             * unreadable, and capitals in one are worse.
             */
            className={
              index === 0
                ? "text-balance text-[1.12rem] leading-relaxed sm:text-[1.22rem]"
                : "text-balance text-[0.95rem] leading-relaxed opacity-85"
            }
            style={
              index === 0
                ? { fontFamily: isShouted(line) ? fonts.heading : fonts.script }
                : { fontFamily: fonts.body }
            }
          >
            {line}
          </p>
        ))}
      </div>
    </section>
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
    <ol
      data-testid="event-guide-programme-schedule"
      className="mt-2 rounded-2xl border px-4 py-5 sm:px-6"
      style={{
        borderColor: "var(--guide-hairline)",
        background: "var(--guide-paper)",
        backgroundImage: PAPER_WASH,
      }}
    >
      {entries.map((entry, index) => {
        const last = index === entries.length - 1;
        return (
          <li
            key={entry.id}
            data-testid={entry.note ? "event-guide-programme-note" : "event-guide-programme-item"}
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
              {/* A subscript sits under the running order, so it takes neither
                  the mark on the rule nor the weight of an item. */}
              {entry.note ? null : (
                <span
                  aria-hidden
                  className="absolute left-0 top-[0.42rem] h-[0.4rem] w-[0.4rem] -translate-x-1/2 rounded-full"
                  style={{
                    background: "var(--guide-secondary)",
                    boxShadow: "0 0 0 3px var(--guide-paper)",
                  }}
                />
              )}
              {entry.note ? (
                <Detail text={entry.title} />
              ) : (
                <p
                  className="text-[1.02rem] leading-snug sm:text-[1.08rem]"
                  style={{ fontFamily: fonts.heading, color: "var(--guide-primary)" }}
                >
                  {entry.title}
                </p>
              )}
              {entry.description ? <Detail text={entry.description} /> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
