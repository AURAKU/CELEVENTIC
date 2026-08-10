import type { ElementType } from "react";
import { parseMenuBody, type MenuCourse } from "@/lib/event-guide/menu-layout";
import { CourseGlyph, PlaceSetting, SprigDivider } from "@/components/event-guide/guide-motifs";
import type { CompanionTheme } from "@/lib/admission/event-companion-theme";
import { companionFontStyles } from "@/lib/admission/event-companion-theme";

type CompanionFonts = ReturnType<typeof companionFontStyles>;

/**
 * Event Companion menu — the same reading as Event Guide (`parseMenuBody`),
 * set in the companion's gold / invitation palette so dinner reads as dinner
 * rather than as a pasted notepad over the couple photo.
 */
export function CompanionMenuPanel({
  menuBody,
  menuUrl,
  colors,
  paperWash,
  fonts,
  LinkComponent,
}: {
  menuBody: string | null | undefined;
  menuUrl?: string | null;
  colors: CompanionTheme["colors"];
  paperWash: string;
  fonts: CompanionFonts;
  /** Next `Link` (or `<a>`) so this stays usable outside the app router. */
  LinkComponent: ElementType;
}) {
  const body = menuBody?.trim() ?? "";
  const courses = body ? parseMenuBody(body) : [];
  const Link = LinkComponent;

  if (courses.length === 0 && !menuUrl) return null;

  return (
    <div data-testid="companion-menu" className="mx-auto mt-7 w-full max-w-md">
      {courses.length > 0 ? (
        <div
          className="rounded-[1.35rem] border px-4 py-6 sm:px-6 sm:py-7"
          style={{
            borderColor: `color-mix(in srgb, ${colors.secondary} 28%, transparent)`,
            background: `linear-gradient(165deg, ${paperWash} 0%, ${colors.background} 55%, color-mix(in srgb, ${colors.secondary} 8%, ${colors.background}) 100%)`,
            boxShadow: `0 18px 40px -28px color-mix(in srgb, ${colors.primary} 45%, transparent)`,
          }}
        >
          <div className="text-center">
            <PlaceSetting
              className="mx-auto h-9 w-[4.2rem] opacity-80"
              style={{ color: colors.secondary }}
            />
            <SprigDivider
              className="mx-auto mt-3 h-3.5 w-36 opacity-70"
              style={{ color: colors.secondary }}
            />
          </div>

          <div className="mt-6 space-y-7">
            {courses.map((course) => (
              <CompanionCourse key={course.id} course={course} colors={colors} fonts={fonts} />
            ))}
          </div>
        </div>
      ) : null}

      {menuUrl ? (
        <Link
          href={menuUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-7 inline-flex min-h-[48px] w-full items-center justify-center rounded-full px-8 text-xs uppercase tracking-[0.2em] transition-transform active:scale-[0.98] sm:text-sm"
          style={{
            background: colors.secondary,
            color: colors.background,
            fontFamily: fonts.eyebrow,
            fontWeight: 600,
          }}
        >
          View full menu
        </Link>
      ) : null}
    </div>
  );
}

function CompanionCourse({
  course,
  colors,
  fonts,
}: {
  course: MenuCourse;
  colors: CompanionTheme["colors"];
  fonts: CompanionFonts;
}) {
  return (
    <article
      data-testid="companion-menu-course"
      data-course-kind={course.kind}
      className="text-center"
      dir="auto"
    >
      {course.heading ? (
        <div className="flex items-center justify-center gap-2.5">
          <span
            aria-hidden
            className="h-px flex-1 max-w-[4.5rem]"
            style={{
              background: `linear-gradient(90deg, transparent, ${colors.secondary}99)`,
            }}
          />
          <CourseGlyph
            kind={course.kind}
            className="h-[1.05rem] w-[1.05rem] shrink-0"
            style={{ color: colors.secondary }}
            data-testid="companion-menu-course-glyph"
          />
          <h3
            className="text-[0.68rem] font-semibold uppercase leading-tight tracking-[0.26em] sm:text-[0.72rem]"
            style={{
              fontFamily: fonts.eyebrow,
              color: colors.secondary,
            }}
          >
            {course.heading}
          </h3>
          <span
            aria-hidden
            className="h-px flex-1 max-w-[4.5rem]"
            style={{
              background: `linear-gradient(90deg, ${colors.secondary}99, transparent)`,
            }}
          />
        </div>
      ) : null}

      {course.items.length > 0 ? (
        <ul className={course.heading ? "mt-3.5 space-y-2" : "space-y-2"}>
          {course.items.map((item) => (
            <li
              key={item.id}
              data-testid="companion-menu-item"
              className="text-balance text-[1.05rem] leading-relaxed sm:text-[1.12rem]"
              style={{
                color: colors.primary,
                fontFamily: fonts.body,
                fontWeight: 500,
              }}
            >
              {item.name}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
