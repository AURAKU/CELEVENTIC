/**
 * The Event Guide's drawn vocabulary.
 *
 * Every mark on the guest's page comes from here: the place setting above the
 * menu, the glyph beside a course, the laid table above the seat finder, the
 * sprig that divides a programme. They are line drawings rather than pictures
 * — one weight of stroke, no fills, no colour of their own — so they inherit
 * whatever the invitation's palette is through `currentColor` and sit on a
 * printed page as comfortably as on a phone in a dim hall.
 *
 * That restraint is the point. A wedding programme is set, not decorated, and
 * a menu with a clipart prawn on it stops looking like dinner.
 */

import type { MenuCourseKind } from "@/lib/event-guide/menu-layout";

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Every motif is decorative, and every one of them takes the usual svg props. */
type MotifProps = Omit<React.SVGProps<SVGSVGElement>, "viewBox" | "children">;

/**
 * The wash every card in the guide is laid on.
 *
 * One soft fall of the theme's own accent from the top edge, which is what
 * gives a stack of white rectangles the depth a printed order of service gets
 * from its paper. `--guide-hairline` is already the accent at low alpha, so
 * this tints with the invitation rather than introducing a colour of its own.
 */
export const PAPER_WASH =
  "radial-gradient(120% 75% at 50% 0%, var(--guide-hairline), transparent 70%)";

/**
 * A plate laid with a fork and a knife.
 *
 * The one image the menu tab needs: it says "dinner" before a word is read,
 * and it is drawn at the width of the card so it reads as a place setting
 * rather than as an icon.
 */
export function PlaceSetting({ className = "", ...props }: MotifProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 40"
      className={className}
      strokeWidth={1}
      {...STROKE}
      {...props}
    >
      {/* fork */}
      <path d="M7 5v8M10.5 5v8M14 5v8" opacity="0.9" />
      <path d="M7 13h7M10.5 13v22" />
      {/* plate */}
      <circle cx="32" cy="20" r="13.5" />
      <circle cx="32" cy="20" r="9.5" opacity="0.5" />
      {/* knife */}
      <path d="M53.5 5c2.1 3.2 2.7 6.7 2.7 10.2 0 2.6-1.2 4.1-2.7 4.1s-2.7-1.5-2.7-4.1c0-3.5.6-7 2.7-10.2Z" />
      <path d="M53.5 19.3V35" />
    </svg>
  );
}

/**
 * The glyph beside a course.
 *
 * Chosen from the course's own name — a soup gets a bowl, a dessert a
 * cupcake — and falling back to the lozenge the rest of the guide already
 * uses when the heading is one we cannot read.
 */
export function CourseGlyph({
  kind,
  className = "",
  ...props
}: MotifProps & { kind: MenuCourseKind }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      strokeWidth={1.2}
      {...STROKE}
      {...props}
    >
      {COURSE_PATHS[kind]}
    </svg>
  );
}

const COURSE_PATHS: Record<MenuCourseKind, React.ReactNode> = {
  // Two flutes raised.
  welcome: (
    <>
      <path d="M6 3h5l-.8 5.2a1.7 1.7 0 0 1-3.4 0L6 3Z" />
      <path d="M8.5 10v9M6.2 21h4.6" />
      <path d="M13 3h5l-.8 5.2a1.7 1.7 0 0 1-3.4 0L13 3Z" opacity="0.55" />
      <path d="M15.5 10v9M13.2 21h4.6" opacity="0.55" />
    </>
  ),
  // A leaf on the plate.
  starter: (
    <>
      <path d="M17 5c1.6 4.6-.5 9-5 10.2C9.3 15.9 7 14.6 6.4 12.3 5.4 8.4 9.9 5 17 5Z" />
      <path d="M15 7.2c-3 1.6-5.4 4.4-6.6 7.7" opacity="0.6" />
      <path d="M4 20h16" opacity="0.8" />
    </>
  ),
  // A bowl, steaming.
  soup: (
    <>
      <path d="M9.5 3c-1 1.9.9 2.9 0 4.8M14.5 3c-1 1.9.9 2.9 0 4.8" opacity="0.7" />
      <path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0Z" />
      <path d="M6 19.5h12" opacity="0.8" />
    </>
  ),
  // A cloche, lifted at dinner.
  main: (
    <>
      <path d="M12 5.6V4" opacity="0.8" />
      <path d="M4 16.5a8 8 0 0 1 16 0Z" />
      <path d="M2.5 16.5h19" />
      <path d="M7 20h10" opacity="0.6" />
    </>
  ),
  // A small dish, set beside the main.
  side: (
    <>
      <path d="M5 12h14a7 7 0 0 1-14 0Z" />
      <path d="M8.5 5.5c-.9 1.6.8 2.5 0 4M15.5 5.5c-.9 1.6.8 2.5 0 4" opacity="0.5" />
      <path d="M7 19.5h10" opacity="0.8" />
    </>
  ),
  // A cupcake.
  dessert: (
    <>
      <path d="M7.6 10a4.4 4.4 0 0 1 8.8 0" />
      <path d="M6 10.5h12l-1.4 8.2a1.4 1.4 0 0 1-1.4 1.2H8.8a1.4 1.4 0 0 1-1.4-1.2L6 10.5Z" />
      <path d="M12 4v1.6" opacity="0.7" />
    </>
  ),
  // A glass raised to the couple.
  drink: (
    <>
      <path d="M7.5 3.5h9l-1.1 6.1a3.4 3.4 0 0 1-6.8 0L7.5 3.5Z" />
      <path d="M12 13.2V19M8.8 21h6.4" />
      <path d="M8.2 7.2h7.6" opacity="0.5" />
    </>
  ),
  // A card left on the table.
  note: (
    <>
      <path d="M5 4.5h11l3 3v12H5Z" />
      <path d="M16 4.5v3h3" opacity="0.7" />
      <path d="M8 11h8M8 14.5h5" opacity="0.75" />
    </>
  ),
  // The lozenge the rest of the guide is ruled with.
  course: (
    <>
      <path d="M12 6.5 15.5 12 12 17.5 8.5 12Z" />
      <path d="M2.5 12h4M17.5 12h4" opacity="0.7" />
    </>
  ),
};

/**
 * A round table with its chairs around it, seen from above.
 *
 * The plan a guest is holding the phone to find themselves on. Chairs are
 * drawn as one rounded mark repeated around the circle, which is what a
 * seating plan looks like and what a chair reduces to at this size.
 */
export function RoundTable({
  className = "",
  seats = 8,
  ...props
}: MotifProps & { seats?: number }) {
  const angles = Array.from({ length: seats }, (_, index) => (index * 360) / seats);

  return (
    <svg
      aria-hidden
      viewBox="0 0 64 64"
      className={className}
      strokeWidth={1.1}
      {...STROKE}
      {...props}
    >
      {angles.map((angle) => (
        <rect
          key={angle}
          x="28.5"
          y="3.5"
          width="7"
          height="5"
          rx="2"
          transform={`rotate(${angle} 32 32)`}
          opacity="0.85"
        />
      ))}
      <circle cx="32" cy="32" r="18" />
      <circle cx="32" cy="32" r="13.5" opacity="0.45" />
    </svg>
  );
}

/** A single chair, for the row of them under a seat card. */
export function ChairGlyph({ className = "", ...props }: MotifProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      strokeWidth={1.3}
      {...STROKE}
      {...props}
    >
      <path d="M7 3.5h10v8H7Z" />
      <path d="M5.5 11.5h13v3.5h-13Z" />
      <path d="M7.5 15v5.5M16.5 15v5.5" />
    </svg>
  );
}

/**
 * The rule that divides a programme: a stem with leaves at its centre.
 *
 * The guide already ruled its sections with a lozenge between two hairlines.
 * This is the same idea drawn as a sprig, which is the difference between a
 * document and an order of service.
 */
export function SprigDivider({ className = "", ...props }: MotifProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 140 20"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      strokeWidth={1}
      {...STROKE}
      {...props}
    >
      <path d="M0 10h48M92 10h48" opacity="0.7" />
      <path d="M70 3.5c2.6 2.2 2.6 4.8 0 7-2.6-2.2-2.6-4.8 0-7Z" />
      <path d="M62.5 10c2.4-3 5.2-3.6 7.5-1.4M77.5 10c-2.4-3-5.2-3.6-7.5-1.4" />
      <path d="M62.5 10c2.4 3 5.2 3.6 7.5 1.4M77.5 10c-2.4 3-5.2 3.6-7.5 1.4" />
      <path d="M53 10h5M82 10h5" opacity="0.55" />
    </svg>
  );
}

/**
 * Two notes joined by a beam — the mark on a hymnal card.
 *
 * It is there to say "this is sung, not announced" at a glance, which is the
 * whole reason a hymn is lifted out of the running order in the first place.
 */
export function MusicMark({ className = "", ...props }: MotifProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      strokeWidth={1.2}
      {...STROKE}
      {...props}
    >
      <path d="M9 17V5.5l10-2V15" />
      <path d="M9 8.5l10-2" opacity="0.6" />
      <ellipse cx="6.6" cy="17.2" rx="2.6" ry="2" transform="rotate(-14 6.6 17.2)" />
      <ellipse cx="16.6" cy="15.2" rx="2.6" ry="2" transform="rotate(-14 16.6 15.2)" />
    </svg>
  );
}

/**
 * A ceremony arch, drawn once behind the title page.
 *
 * Set at a low opacity in the theme's own accent, it gives the cover the
 * depth a printed programme gets from its paper — and being a background, it
 * never competes with the couple's names for contrast.
 */
export function CeremonyArch({ className = "", ...props }: MotifProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 260"
      className={className}
      preserveAspectRatio="xMidYMax slice"
      strokeWidth={1.1}
      {...STROKE}
      {...props}
    >
      <path d="M26 260V116a74 74 0 0 1 148 0v144" />
      <path d="M40 260V118a60 60 0 0 1 120 0v142" opacity="0.5" />
      {/* Leaves climbing the left shoulder, mirrored on the right. */}
      {[0, 1, 2, 3].map((step) => {
        const t = 0.12 + step * 0.19;
        const x = 26 + 74 * (1 - Math.cos(t * Math.PI));
        const y = 116 - 74 * Math.sin(t * Math.PI) + 74;
        return (
          <g key={step} opacity={0.65}>
            <path d={`M${x} ${y}c-9-5-16-3-19 3 6 4 14 3 19-3Z`} />
            <path d={`M${200 - x} ${y}c9-5 16-3 19 3-6 4-14 3-19-3Z`} />
          </g>
        );
      })}
    </svg>
  );
}
