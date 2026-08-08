"use client";

import type { GuideAttachment, GuideMenu } from "@/lib/event-guide/types";
import { layoutMenu, type MenuCourse } from "@/lib/event-guide/menu-layout";
import { GuideAttachments } from "./guide-attachments";
import { CourseGlyph, PlaceSetting, SprigDivider } from "./guide-motifs";

type Fonts = { heading: string; body: string; eyebrow: string; script: string };

/**
 * The menu, set as a menu.
 *
 * A caterer's text arrives as one block — `*APPETIZER*` and then the dishes,
 * `*MAIN DISHES*` and then the rest — and printing it verbatim in a
 * pre-wrapped box gives a guest a notepad to squint at. `layoutMenu` reads it
 * into courses; this sets each course as a card the way a menu is laid on a
 * table: the course small and tracked between two rules, the dishes centred
 * and generous underneath.
 *
 * The atmosphere is drawn, not imported. A place setting at the top, a glyph
 * per course, a wash of the theme's own accent behind each card — all of it
 * in `--guide-*`, so a burgundy invitation gives a burgundy menu and nothing
 * here has a colour of its own.
 *
 * One component serves the guest's page and the organizer's live preview, so
 * what they approve is what is served.
 */
export function GuideMenuPanel({
  menu,
  attachments,
  fonts,
}: {
  menu: GuideMenu;
  attachments: GuideAttachment[];
  fonts: Fonts;
}) {
  const { courses, isEmpty } = layoutMenu(menu);

  return (
    <section data-testid="event-guide-menu">
      {isEmpty ? (
        <div
          data-testid="event-guide-menu-empty"
          className="rounded-2xl border px-5 py-10 text-center"
          style={{ borderColor: "var(--guide-hairline)", background: "var(--guide-paper)" }}
        >
          <PlaceSetting className="mx-auto h-10 w-16 opacity-35" />
          <p className="mt-4 text-sm opacity-80">
            The menu will appear here once the hosts publish it.
          </p>
        </div>
      ) : (
        <>
          <MenuCrest fonts={fonts} />
          <div className="mt-4 space-y-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} fonts={fonts} />
            ))}
          </div>
        </>
      )}

      {menu.url ? (
        <a
          href={menu.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex text-[0.85rem] font-semibold underline-offset-4 hover:underline"
          style={{ color: "var(--guide-accent)" }}
        >
          Open the full menu
        </a>
      ) : null}

      <GuideAttachments attachments={attachments} fonts={fonts} />
    </section>
  );
}

/**
 * The head of the menu card: a laid place setting, the word, a sprig.
 *
 * Deliberately says nothing the hosts did not — no invented welcome line, no
 * claim about the hour. It sets the table and then gets out of the way.
 */
function MenuCrest({ fonts }: { fonts: Fonts }) {
  return (
    <div
      className="rounded-[1.6rem] border p-1.5"
      style={{ borderColor: "var(--guide-hairline)", background: "var(--guide-paper)" }}
    >
      <div
        className="rounded-[1.25rem] border px-5 py-6 text-center"
        style={{
          borderColor: "var(--guide-hairline)",
          backgroundImage:
            "radial-gradient(115% 90% at 50% 0%, var(--guide-hairline), transparent 72%)",
        }}
      >
        {/* A flourish, so it takes the decorative accent rather than the
            darkened ink reserved for type that has to be read. */}
        <PlaceSetting
          className="mx-auto h-11 w-[4.6rem]"
          style={{ color: "var(--guide-secondary)" }}
        />
        <h2
          className="mt-3 text-[0.74rem] font-semibold uppercase tracking-[0.34em]"
          style={{ fontFamily: fonts.eyebrow, color: "var(--guide-label, var(--guide-secondary))" }}
        >
          The Menu
        </h2>
        <SprigDivider className="mx-auto mt-3 h-4 w-40 opacity-70" />
      </div>
    </div>
  );
}

/**
 * One course.
 *
 * The heading sits between two rules with its glyph, the way a printed menu
 * separates a course from its dishes. Dishes are centred, one per line, at a
 * size that survives a dim reception hall and a phone held at arm's length.
 *
 * A course with no heading — dishes the organizer wrote with nothing above
 * them — drops the rule and simply lists them. Nothing they typed is left off
 * the card because we could not name the course it belonged to.
 */
function CourseCard({ course, fonts }: { course: MenuCourse; fonts: Fonts }) {
  return (
    <article
      data-testid="event-guide-menu-course"
      data-course-kind={course.kind}
      className="rounded-2xl border px-5 py-5 sm:px-7 sm:py-6"
      style={{
        borderColor: "var(--guide-hairline)",
        background: "var(--guide-paper)",
        backgroundImage:
          "radial-gradient(120% 70% at 50% 0%, var(--guide-hairline), transparent 68%)",
      }}
      dir="auto"
    >
      {course.heading ? (
        <div className="flex items-center justify-center gap-2.5">
          <span
            aria-hidden
            className="h-px flex-1"
            style={{ background: "var(--guide-hairline)" }}
          />
          <CourseGlyph
            kind={course.kind}
            className="h-[1.15rem] w-[1.15rem] shrink-0"
            data-testid="event-guide-menu-course-glyph"
          />
          <h3
            className="text-center text-[0.7rem] font-semibold uppercase leading-tight tracking-[0.24em]"
            style={{
              fontFamily: fonts.eyebrow,
              color: "var(--guide-label, var(--guide-secondary))",
            }}
          >
            {course.heading}
          </h3>
          <span
            aria-hidden
            className="h-px flex-1"
            style={{ background: "var(--guide-hairline)" }}
          />
        </div>
      ) : null}

      {course.items.length > 0 ? (
        <ul className={course.heading ? "mt-4 space-y-2.5" : "space-y-2.5"}>
          {course.items.map((item) => (
            <li
              key={item.id}
              data-testid="event-guide-menu-item"
              className="text-balance text-center text-[1.02rem] leading-relaxed"
              style={{ fontFamily: fonts.body }}
            >
              {item.name}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
