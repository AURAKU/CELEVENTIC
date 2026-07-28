import Link from "next/link";
import {
  companionFontStyles,
  type CompanionTheme,
} from "@/lib/admission/event-companion-theme";
import {
  describeHeldSeats,
  type SeatingContinuity,
} from "@/lib/admission/seating-continuity";
import type { ResolvedFeature } from "@/lib/invitation-features/registry";
import { invitationFontVars } from "@/lib/invitation-fonts";
import { cn } from "@/lib/utils";

export type EventCompanionExperienceProps = {
  theme: CompanionTheme;
  eventTitle: string;
  guestName: string | null;
  isGroup: boolean;
  admittedCount: number;
  remainingCount: number;
  allowance: number;
  seat: { tableNumber: string; seatLabel: string | null; zone: string | null } | null;
  showSeat: boolean;
  continuity: SeatingContinuity | null;
  features: ResolvedFeature[];
  event: {
    startDate: Date | string;
    venueName: string | null;
    landmark: string | null;
    mapsLink: string | null;
    dressCode: string | null;
    contactPhone: string | null;
  };
  memoryUploadUrl: string | null;
  memoryAlbumUrl: string | null;
  giftUrl: string | null;
  giftTitle: string | null;
  inviteHref: string;
};

function formatEventWhen(startDate: Date | string): string {
  const d = typeof startDate === "string" ? new Date(startDate) : startDate;
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

function SectionRule({ color }: { color: string }) {
  return (
    <div
      className="mx-auto h-px w-16"
      style={{
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
      }}
      aria-hidden
    />
  );
}

/**
 * Post-admission companion — themed to the live invitation so arrival feels
 * like the same celebration, with seat, venue, programme, and guest actions.
 */
export function EventCompanionExperience({
  theme,
  eventTitle,
  guestName,
  isGroup,
  admittedCount,
  remainingCount,
  allowance,
  seat,
  showSeat,
  continuity,
  features,
  event,
  memoryUploadUrl,
  memoryAlbumUrl,
  giftUrl,
  giftTitle,
  inviteHref,
}: EventCompanionExperienceProps) {
  const { colors } = theme;
  const fonts = companionFontStyles(theme.fonts);
  const heldCopy = continuity ? describeHeldSeats(continuity) : null;
  const enabled = (key: ResolvedFeature["key"]) =>
    features.some((f) => f.key === key && f.enabled);
  const showHelp = enabled("GUEST_HELP") && Boolean(event.contactPhone);
  const showProgramme =
    (enabled("LIVE_PROGRAMME") || theme.programmeItems.length > 0) &&
    theme.programmeItems.length > 0;
  const whenLabel = formatEventWhen(event.startDate);
  const firstName = guestName?.trim().split(/\s+/)[0] ?? null;

  const cssVars = {
    ["--ec-primary" as string]: colors.primary,
    ["--ec-secondary" as string]: colors.secondary,
    ["--ec-accent" as string]: colors.accent,
    ["--ec-bg" as string]: colors.background,
    ["--ec-text" as string]: colors.text,
    ["--ec-heading" as string]: fonts.heading,
    ["--ec-script" as string]: fonts.script,
    ["--ec-body" as string]: fonts.body,
    ["--ec-eyebrow" as string]: fonts.eyebrow,
  };

  return (
    <div
      className={cn(invitationFontVars, "relative min-h-[100dvh] overflow-hidden")}
      style={{
        ...cssVars,
        color: colors.text,
        backgroundColor: colors.background,
        fontFamily: fonts.body,
      }}
    >
      {/* Atmosphere — invitation cover wash + theme gradients */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {theme.backgroundImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={theme.backgroundImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-[0.22] saturate-[0.85]"
          />
        ) : null}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 90% 55% at 50% -10%, ${theme.accentWash}, transparent 70%),
              radial-gradient(ellipse 70% 50% at 100% 100%, ${colors.accent}22, transparent 55%),
              linear-gradient(180deg, ${theme.paperWash} 0%, ${colors.background} 42%, ${colors.background} 100%)
            `,
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-40 opacity-40"
          style={{
            backgroundImage: `radial-gradient(${colors.secondary}33 0.6px, transparent 0.6px)`,
            backgroundSize: "18px 18px",
            maskImage: "linear-gradient(180deg, black, transparent)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[540px] flex-col px-5 pb-16 pt-12 sm:px-6 sm:pt-16">
        {/* Hero — brand-first welcome, one job */}
        <header className="text-center">
          <p
            className="text-[10px] uppercase tracking-[0.42em]"
            style={{ color: colors.secondary, fontFamily: fonts.eyebrow }}
          >
            You&apos;ve arrived
          </p>
          <h1
            className="mt-4 text-[2.35rem] leading-[1.1] sm:text-5xl"
            style={{ color: colors.primary, fontFamily: fonts.script, fontWeight: 400 }}
          >
            {firstName ? `Welcome, ${firstName}` : "Welcome"}
          </h1>
          <SectionRule color={colors.secondary} />
          <p
            className="mt-5 text-lg leading-snug sm:text-xl"
            style={{ color: colors.primary, fontFamily: fonts.heading }}
          >
            {eventTitle}
          </p>
          {whenLabel ? (
            <p
              className="mt-2 text-xs uppercase tracking-[0.22em]"
              style={{ color: colors.text, opacity: 0.7, fontFamily: fonts.eyebrow }}
            >
              {whenLabel}
            </p>
          ) : null}
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed" style={{ opacity: 0.88 }}>
            Your arrival is confirmed. Here is everything you need for the celebration —
            seating, venue, and ways to take part.
          </p>
        </header>

        {isGroup ? (
          <p
            className="mt-6 text-center text-sm"
            style={{ color: colors.primary }}
            aria-live="polite"
          >
            <span className="font-medium">
              {admittedCount} of {allowance} arrived
            </span>
            {remainingCount > 0 ? (
              <span style={{ opacity: 0.75 }}>
                {" "}
                · {remainingCount} {remainingCount === 1 ? "place" : "places"} still open on this
                pass
              </span>
            ) : null}
          </p>
        ) : null}

        {/* Seat — the one critical wayfinding signal */}
        {showSeat ? (
          <section
            className="mt-10 text-center"
            aria-labelledby="ec-seat-heading"
            style={{
              background: `linear-gradient(165deg, ${theme.accentWash}, ${colors.background}cc)`,
              border: `1px solid ${colors.secondary}40`,
              borderRadius: "1.75rem",
              padding: "1.75rem 1.5rem",
              boxShadow: `0 24px 60px -36px ${colors.primary}55`,
            }}
          >
            <h2
              id="ec-seat-heading"
              className="text-[10px] uppercase tracking-[0.36em]"
              style={{ color: colors.secondary, fontFamily: fonts.eyebrow }}
            >
              Your place
            </h2>
            {seat ? (
              <>
                <p
                  className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl"
                  style={{ color: colors.primary, fontFamily: fonts.heading }}
                >
                  Table {seat.tableNumber}
                </p>
                {seat.seatLabel ? (
                  <p className="mt-2 text-base" style={{ opacity: 0.9 }}>
                    Seat {seat.seatLabel}
                  </p>
                ) : null}
                {seat.zone ? (
                  <p
                    className="mt-1 text-xs uppercase tracking-[0.2em]"
                    style={{ color: colors.secondary, opacity: 0.85 }}
                  >
                    {seat.zone}
                  </p>
                ) : null}
              </>
            ) : continuity?.revealed.length ? (
              <ul className="mt-4 space-y-2 text-left">
                {continuity.revealed.map((s) => (
                  <li key={s.guestId} className="text-sm" style={{ color: colors.primary }}>
                    <span className="font-medium">{s.guestName}</span>
                    <span style={{ opacity: 0.75 }}>
                      {" "}
                      — Table {s.tableNumber}
                      {s.seatLabel ? `, Seat ${s.seatLabel}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-relaxed" style={{ opacity: 0.8 }}>
                Your table will appear here once seating is assigned. An usher can guide you in
                the meantime.
              </p>
            )}
            {heldCopy ? (
              <p className="mt-4 text-xs leading-relaxed" style={{ opacity: 0.72 }}>
                {heldCopy}
              </p>
            ) : null}
          </section>
        ) : null}

        {/* Venue & dress — navigate the room */}
        {(event.venueName || event.dressCode || event.mapsLink) && (
          <section className="mt-10 text-center" aria-labelledby="ec-venue-heading">
            <h2
              id="ec-venue-heading"
              className="text-[10px] uppercase tracking-[0.36em]"
              style={{ color: colors.secondary, fontFamily: fonts.eyebrow }}
            >
              Find your way
            </h2>
            <SectionRule color={`${colors.secondary}99`} />
            {event.venueName ? (
              <p
                className="mt-5 text-xl leading-snug"
                style={{ color: colors.primary, fontFamily: fonts.heading }}
              >
                {event.venueName}
              </p>
            ) : null}
            {event.landmark ? (
              <p className="mt-2 text-sm" style={{ opacity: 0.75 }}>
                {event.landmark}
              </p>
            ) : null}
            {event.dressCode ? (
              <p className="mt-4 text-sm">
                <span
                  className="uppercase tracking-[0.18em] text-[10px]"
                  style={{ color: colors.secondary, fontFamily: fonts.eyebrow }}
                >
                  Dress code
                </span>
                <span className="mt-1 block" style={{ color: colors.primary }}>
                  {event.dressCode}
                </span>
              </p>
            ) : null}
            {event.mapsLink ? (
              <Link
                href={event.mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full px-7 text-[11px] uppercase tracking-[0.22em] transition-transform active:scale-[0.98]"
                style={{
                  background: colors.secondary,
                  color: colors.background,
                  fontFamily: fonts.eyebrow,
                }}
              >
                Open directions
              </Link>
            ) : null}
          </section>
        )}

        {/* Programme — invitation order of day */}
        {showProgramme ? (
          <section className="mt-12" aria-labelledby="ec-programme-heading">
            <h2
              id="ec-programme-heading"
              className="text-center text-[10px] uppercase tracking-[0.36em]"
              style={{ color: colors.secondary, fontFamily: fonts.eyebrow }}
            >
              Today&apos;s programme
            </h2>
            <SectionRule color={`${colors.secondary}99`} />
            <ol className="mt-6 space-y-0">
              {theme.programmeItems.map((item, index) => (
                <li
                  key={item.id || `${item.time}-${item.title}`}
                  className="grid grid-cols-[4.5rem_1fr] gap-3 border-t py-4 first:border-t-0"
                  style={{ borderColor: `${colors.secondary}28` }}
                >
                  <span
                    className="pt-0.5 text-xs tabular-nums tracking-wide"
                    style={{ color: colors.secondary, fontFamily: fonts.eyebrow }}
                  >
                    {item.time || `${index + 1}`.padStart(2, "0")}
                  </span>
                  <div>
                    <p
                      className="text-base leading-snug"
                      style={{ color: colors.primary, fontFamily: fonts.heading }}
                    >
                      {item.title}
                    </p>
                    {item.description ? (
                      <p className="mt-1 text-sm leading-relaxed" style={{ opacity: 0.75 }}>
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* Guest actions — memory, gift, help */}
        {(enabled("MEMORY_VAULT") && (memoryUploadUrl || memoryAlbumUrl)) ||
        (enabled("GIFT_WALLET") && giftUrl) ||
        showHelp ? (
          <section className="mt-12" aria-labelledby="ec-actions-heading">
            <h2
              id="ec-actions-heading"
              className="text-center text-[10px] uppercase tracking-[0.36em]"
              style={{ color: colors.secondary, fontFamily: fonts.eyebrow }}
            >
              Take part
            </h2>
            <SectionRule color={`${colors.secondary}99`} />
            <div className="mt-6 flex flex-col gap-3">
              {enabled("MEMORY_VAULT") && memoryUploadUrl ? (
                <Link
                  href={memoryUploadUrl}
                  className="flex min-h-[52px] items-center justify-between rounded-2xl px-5 py-3 transition-colors"
                  style={{
                    background: theme.accentWash,
                    border: `1px solid ${colors.secondary}35`,
                  }}
                >
                  <span>
                    <span
                      className="block text-[10px] uppercase tracking-[0.24em]"
                      style={{ color: colors.secondary, fontFamily: fonts.eyebrow }}
                    >
                      Memory Vault
                    </span>
                    <span className="mt-0.5 block text-sm" style={{ color: colors.primary }}>
                      Add a photo or video
                    </span>
                  </span>
                  <span style={{ color: colors.secondary }} aria-hidden>
                    →
                  </span>
                </Link>
              ) : null}
              {enabled("MEMORY_VAULT") && memoryAlbumUrl ? (
                <Link
                  href={memoryAlbumUrl}
                  className="flex min-h-[52px] items-center justify-between rounded-2xl px-5 py-3"
                  style={{
                    background: `${colors.primary}08`,
                    border: `1px solid ${colors.secondary}28`,
                  }}
                >
                  <span>
                    <span
                      className="block text-[10px] uppercase tracking-[0.24em]"
                      style={{ color: colors.secondary, fontFamily: fonts.eyebrow }}
                    >
                      Live album
                    </span>
                    <span className="mt-0.5 block text-sm" style={{ color: colors.primary }}>
                      View shared memories
                    </span>
                  </span>
                  <span style={{ color: colors.secondary }} aria-hidden>
                    →
                  </span>
                </Link>
              ) : null}
              {enabled("GIFT_WALLET") && giftUrl ? (
                <Link
                  href={giftUrl}
                  className="flex min-h-[52px] items-center justify-between rounded-2xl px-5 py-3"
                  style={{
                    background: `${colors.primary}08`,
                    border: `1px solid ${colors.secondary}28`,
                  }}
                >
                  <span>
                    <span
                      className="block text-[10px] uppercase tracking-[0.24em]"
                      style={{ color: colors.secondary, fontFamily: fonts.eyebrow }}
                    >
                      {giftTitle || "Send a gift"}
                    </span>
                    <span className="mt-0.5 block text-sm" style={{ color: colors.primary }}>
                      Open Gift Wallet
                    </span>
                  </span>
                  <span style={{ color: colors.secondary }} aria-hidden>
                    →
                  </span>
                </Link>
              ) : null}
              {showHelp && event.contactPhone ? (
                <a
                  href={`tel:${event.contactPhone.replace(/\s/g, "")}`}
                  className="flex min-h-[52px] items-center justify-between rounded-2xl px-5 py-3"
                  style={{
                    background: `${colors.primary}08`,
                    border: `1px solid ${colors.secondary}28`,
                  }}
                >
                  <span>
                    <span
                      className="block text-[10px] uppercase tracking-[0.24em]"
                      style={{ color: colors.secondary, fontFamily: fonts.eyebrow }}
                    >
                      Need help
                    </span>
                    <span className="mt-0.5 block text-sm" style={{ color: colors.primary }}>
                      Call host · {event.contactPhone}
                    </span>
                  </span>
                  <span style={{ color: colors.secondary }} aria-hidden>
                    →
                  </span>
                </a>
              ) : null}
            </div>
          </section>
        ) : null}

        <footer className="mt-14 text-center">
          <Link
            href={inviteHref}
            className="text-[10px] uppercase tracking-[0.28em] underline-offset-4 hover:underline"
            style={{ color: colors.secondary, fontFamily: fonts.eyebrow }}
          >
            View invitation
          </Link>
        </footer>
      </div>
    </div>
  );
}
