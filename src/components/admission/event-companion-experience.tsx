import Link from "next/link";
import {
  companionFontStyles,
  type CompanionTheme,
} from "@/lib/admission/event-companion-theme";
import {
  displayContactPhone,
  normalizeCallablePhone,
} from "@/lib/admission/contact-phone";
import {
  type PartySeat,
  type SeatingContinuity,
} from "@/lib/admission/seating-continuity";
import { resolveCompanionPlace } from "@/lib/admission/event-companion";
import { EVENT_TIME_ZONE } from "@/lib/constants";
import type { ResolvedFeature } from "@/lib/invitation-features/registry";
import { invitationFontVars } from "@/lib/invitation-fonts";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import { GuestSeatingCard } from "@/components/seating/guest-seating-card";
import { cn } from "@/lib/utils";
import type { InvitationDesignConfig } from "@/types/invitation-design";

export type EventCompanionExperienceProps = {
  theme: CompanionTheme;
  eventTitle: string;
  guestName: string | null;
  seat: { tableNumber: string; seatLabel: string | null; zone: string | null } | null;
  showSeat: boolean;
  /** Every allocated seat on this invitation, shown after admit. */
  partySeats?: PartySeat[];
  continuity: SeatingContinuity | null;
  features: ResolvedFeature[];
  event: {
    startDate: Date | string;
    contactPhone: string | null;
  };
  memoryUploadUrl: string | null;
  memoryAlbumUrl: string | null;
  giftUrl: string | null;
  giftTitle: string | null;
  /** Companion TAKE PART secondary line under the gift title. */
  giftTeaser?: string | null;
  giftHeadline?: string | null;
  giftCtaLabel?: string | null;
  giftOptionalNote?: string | null;
  inviteHref: string;
  /** Optional menu copy for in-event dining guidance. */
  menuBody?: string | null;
  menuUrl?: string | null;
};

/** Same timezone + clock as live invitations (Africa/Accra, 12-hour). */
function formatEventWhen(startDate: Date | string): string {
  const raw = typeof startDate === "string" ? startDate : startDate.toISOString();
  const instant = new Date(raw);
  if (Number.isNaN(instant.getTime())) return "";
  try {
    const parts = formatInvitationDateParts(raw);
    const clock = new Intl.DateTimeFormat("en-GB", {
      timeZone: EVENT_TIME_ZONE,
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    }).formatToParts(instant);
    const hour = Number(clock.find((p) => p.type === "hour")?.value ?? "0");
    const minute = Number(clock.find((p) => p.type === "minute")?.value ?? "0");
    const dateLabel = `${parts.weekday} ${parts.day} ${parts.month}`;
    // Date-only events are stored at midnight; omit a misleading clock.
    if (hour === 0 && minute === 0) return dateLabel;
    return `${dateLabel} at ${parts.time}`;
  } catch {
    return "";
  }
}

function SectionRule({ color }: { color: string }) {
  return (
    <div
      className="mx-auto h-px w-20"
      style={{
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
      }}
      aria-hidden
    />
  );
}

/**
 * Post-admission companion — themed to the live invitation.
 * Shown only after a successful gate admission (QR or manual code).
 */
export function EventCompanionExperience({
  theme,
  eventTitle,
  guestName,
  seat,
  showSeat,
  partySeats = [],
  continuity,
  features,
  event,
  memoryUploadUrl,
  memoryAlbumUrl,
  giftUrl,
  giftTitle,
  giftTeaser = null,
  giftHeadline = null,
  giftCtaLabel = null,
  giftOptionalNote = null,
  inviteHref,
  menuBody = null,
  menuUrl = null,
}: EventCompanionExperienceProps) {
  const { colors } = theme;
  const fonts = companionFontStyles(theme.fonts);
  const enabled = (key: ResolvedFeature["key"]) =>
    features.some((f) => f.key === key && f.enabled);
  const contactPhoneDisplay = displayContactPhone(event.contactPhone);
  const callablePhone = normalizeCallablePhone(event.contactPhone);
  const showHelp = enabled("GUEST_HELP") && Boolean(callablePhone);
  const showProgramme =
    (enabled("LIVE_PROGRAMME") || theme.programmeItems.length > 0) &&
    theme.programmeItems.length > 0;
  const showMenu =
    enabled("EVENT_MENU") && Boolean((menuBody && menuBody.trim()) || menuUrl);
  const whenLabel = formatEventWhen(event.startDate);
  const firstName = guestName?.trim().split(/\s+/)[0] ?? null;

  const { place: displaySeat, allocatedSeats } = resolveCompanionPlace(
    seat,
    partySeats,
    continuity
  );
  const extraPartySeats = displaySeat
    ? allocatedSeats.filter(
        (s) =>
          !(
            s.tableNumber === displaySeat.tableNumber &&
            (s.seatLabel ?? "") === (displaySeat.seatLabel ?? "")
          )
      )
    : allocatedSeats;

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
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {theme.backgroundImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={theme.backgroundImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-[0.18] saturate-[0.8]"
          />
        ) : null}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 90% 55% at 50% -10%, ${theme.accentWash}, transparent 70%),
              radial-gradient(ellipse 70% 50% at 100% 100%, ${colors.accent}18, transparent 55%),
              linear-gradient(180deg, ${theme.paperWash} 0%, ${colors.background} 42%, ${colors.background} 100%)
            `,
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[540px] flex-col px-5 pb-20 pt-14 sm:px-7 sm:pt-20">
        <header className="text-center">
          <p
            className="text-xs uppercase tracking-[0.38em] sm:text-sm"
            style={{ color: colors.secondary, fontFamily: fonts.eyebrow, fontWeight: 600 }}
          >
            You&apos;ve arrived
          </p>
          <h1
            className="mt-5 text-[2.85rem] leading-[1.05] sm:text-[3.5rem]"
            style={{ color: colors.primary, fontFamily: fonts.script, fontWeight: 400 }}
          >
            {firstName ? `Welcome, ${firstName}` : "Welcome"}
          </h1>
          <SectionRule color={colors.secondary} />
          <p
            className="mt-6 text-2xl leading-snug sm:text-3xl"
            style={{ color: colors.primary, fontFamily: fonts.heading, fontWeight: 600 }}
          >
            {eventTitle}
          </p>
          {whenLabel ? (
            <p
              className="mt-3 text-sm uppercase tracking-[0.18em] sm:text-base"
              style={{
                color: colors.text,
                opacity: 0.78,
                fontFamily: fonts.eyebrow,
                fontWeight: 600,
              }}
            >
              {whenLabel}
            </p>
          ) : null}
          <p
            className="mx-auto mt-6 max-w-md text-base leading-relaxed sm:text-lg"
            style={{ opacity: 0.92, fontWeight: 500 }}
          >
            You&apos;re in. Here is your seat, today&apos;s programme, and everything you need
            while the celebration unfolds.
          </p>
        </header>

        {showSeat ? (
          <section className="mt-12" aria-labelledby="ec-seat-heading">
            <h2 id="ec-seat-heading" className="sr-only">
              Your place
            </h2>
            <GuestSeatingCard
              design={
                {
                  layout: theme.layout,
                  colors: theme.colors,
                  fonts: theme.fonts,
                } as InvitationDesignConfig
              }
              guestName={guestName ?? "Guest"}
              tableNumber={displaySeat?.tableNumber}
              seatLabel={displaySeat?.seatLabel}
              zone={displaySeat?.zone}
              members={allocatedSeats.map((s) => ({
                id: s.guestId,
                name: s.guestName,
                seatLabel: s.seatLabel,
                admitted: s.admitted,
              }))}
              allowance={Math.max(
                1,
                allocatedSeats.length + (continuity?.unseatedCount ?? 0),
                (continuity?.revealed.length ?? 0) +
                  (continuity?.reserved.length ?? 0) +
                  (continuity?.unseatedCount ?? 0)
              )}
              admittedCount={
                continuity?.revealed.length ??
                allocatedSeats.filter((s) => s.admitted).length
              }
              isPortal
              settings={{ revealMode: "immediate" }}
              className="mx-auto max-w-lg text-left shadow-[0_24px_60px_-36px_var(--ec-primary)]"
            />
            {extraPartySeats.length > 0 ? (
              <ul className="mx-auto mt-4 max-w-lg space-y-2 text-left text-sm" style={{ color: colors.primary }}>
                {extraPartySeats.map((s) => (
                  <li key={s.guestId}>
                    <span className="font-semibold">{s.guestName}</span>
                    <span style={{ opacity: 0.8 }}>
                      {s.seatLabel ? ` · Seat ${s.seatLabel}` : ""}
                      {s.admitted ? " · Arrived" : " · Awaiting arrival"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {showProgramme ? (
          <section className="mt-14" aria-labelledby="ec-programme-heading">
            <h2
              id="ec-programme-heading"
              className="text-center text-xs uppercase tracking-[0.32em] sm:text-sm"
              style={{ color: colors.secondary, fontFamily: fonts.eyebrow, fontWeight: 600 }}
            >
              Today&apos;s programme
            </h2>
            <SectionRule color={`${colors.secondary}99`} />
            <ol className="mt-7 space-y-0">
              {theme.programmeItems.map((item, index) => (
                <li
                  key={item.id || `${item.time}-${item.title}`}
                  className="grid grid-cols-[5rem_1fr] gap-3 border-t py-5 first:border-t-0"
                  style={{ borderColor: `${colors.secondary}28` }}
                >
                  <span
                    className="pt-0.5 text-sm tabular-nums tracking-wide sm:text-base"
                    style={{
                      color: colors.secondary,
                      fontFamily: fonts.eyebrow,
                      fontWeight: 600,
                    }}
                  >
                    {item.time || `${index + 1}`.padStart(2, "0")}
                  </span>
                  <div>
                    <p
                      className="text-lg leading-snug sm:text-xl"
                      style={{
                        color: colors.primary,
                        fontFamily: fonts.heading,
                        fontWeight: 600,
                      }}
                    >
                      {item.title}
                    </p>
                    {item.description ? (
                      <p className="mt-1.5 text-base leading-relaxed" style={{ opacity: 0.8 }}>
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {showMenu ? (
          <section className="mt-14 text-center" aria-labelledby="ec-menu-heading">
            <h2
              id="ec-menu-heading"
              className="text-xs uppercase tracking-[0.32em] sm:text-sm"
              style={{ color: colors.secondary, fontFamily: fonts.eyebrow, fontWeight: 600 }}
            >
              Menu
            </h2>
            <SectionRule color={`${colors.secondary}99`} />
            {menuBody?.trim() ? (
              <p
                className="mx-auto mt-6 max-w-md whitespace-pre-line text-base leading-relaxed sm:text-lg"
                style={{ color: colors.primary, fontWeight: 500 }}
              >
                {menuBody.trim()}
              </p>
            ) : null}
            {menuUrl ? (
              <Link
                href={menuUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex min-h-[48px] items-center justify-center rounded-full px-8 text-xs uppercase tracking-[0.2em] transition-transform active:scale-[0.98] sm:text-sm"
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
          </section>
        ) : null}

        {(enabled("MEMORY_VAULT") && (memoryUploadUrl || memoryAlbumUrl)) ||
        (enabled("GIFT_WALLET") && giftUrl) ||
        showHelp ? (
          <section className="mt-14" aria-labelledby="ec-actions-heading">
            <h2
              id="ec-actions-heading"
              className="text-center text-xs uppercase tracking-[0.32em] sm:text-sm"
              style={{ color: colors.secondary, fontFamily: fonts.eyebrow, fontWeight: 600 }}
            >
              Take part
            </h2>
            <SectionRule color={`${colors.secondary}99`} />
            <div className="mt-7 flex flex-col gap-3.5">
              {enabled("MEMORY_VAULT") && memoryUploadUrl ? (
                <Link
                  href={memoryUploadUrl}
                  className="flex min-h-[56px] items-center justify-between rounded-2xl px-5 py-3.5 transition-colors"
                  style={{
                    background: theme.accentWash,
                    border: `1px solid ${colors.secondary}35`,
                  }}
                >
                  <span>
                    <span
                      className="block text-xs uppercase tracking-[0.2em] sm:text-sm"
                      style={{
                        color: colors.secondary,
                        fontFamily: fonts.eyebrow,
                        fontWeight: 600,
                      }}
                    >
                      Memory Vault
                    </span>
                    <span
                      className="mt-1 block text-base sm:text-lg"
                      style={{ color: colors.primary, fontWeight: 500 }}
                    >
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
                  className="flex min-h-[56px] items-center justify-between rounded-2xl px-5 py-3.5"
                  style={{
                    background: `${colors.primary}08`,
                    border: `1px solid ${colors.secondary}28`,
                  }}
                >
                  <span>
                    <span
                      className="block text-xs uppercase tracking-[0.2em] sm:text-sm"
                      style={{
                        color: colors.secondary,
                        fontFamily: fonts.eyebrow,
                        fontWeight: 600,
                      }}
                    >
                      Live album
                    </span>
                    <span
                      className="mt-1 block text-base sm:text-lg"
                      style={{ color: colors.primary, fontWeight: 500 }}
                    >
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
                  className="group relative block overflow-hidden rounded-2xl px-5 py-5 transition-transform duration-200 ease-out active:scale-[0.985]"
                  style={{
                    background: `
                      radial-gradient(ellipse 90% 70% at 100% 0%, ${colors.secondary}28, transparent 55%),
                      radial-gradient(ellipse 70% 60% at 0% 100%, ${colors.accent}16, transparent 50%),
                      linear-gradient(165deg, ${theme.accentWash} 0%, ${colors.background} 48%, ${colors.secondary}12 100%)
                    `,
                    border: `1px solid ${colors.secondary}55`,
                    boxShadow: `
                      0 22px 48px -30px ${colors.secondary},
                      inset 0 1px 0 ${colors.secondary}40
                    `,
                  }}
                  data-testid="companion-gift-card"
                >
                  <span
                    className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full opacity-50 blur-3xl transition-opacity duration-500 group-hover:opacity-80"
                    style={{ background: colors.secondary }}
                    aria-hidden
                  />
                  <span className="relative flex items-start gap-3.5">
                    <span
                      className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-transform duration-300 ease-out group-hover:scale-105 group-active:scale-95"
                      style={{
                        background: `linear-gradient(145deg, ${colors.secondary}42, ${colors.secondary}16)`,
                        border: `1px solid ${colors.secondary}60`,
                        boxShadow: `0 10px 22px -14px ${colors.secondary}, inset 0 1px 0 ${colors.background}88`,
                        color: colors.secondary,
                      }}
                      aria-hidden
                    >
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 7.5c0-1.8 1.2-3.2 2.8-3.2 1.1 0 1.9.7 2.2 1.6.2.7 0 1.5-.6 2.1L12 12.4 7.6 8c-.6-.6-.8-1.4-.6-2.1.3-.9 1.1-1.6 2.2-1.6 1.6 0 2.8 1.4 2.8 3.2Z"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill={`${colors.secondary}22`}
                        />
                        <path
                          d="M4.5 10.5h15v2.2c0 .4-.3.8-.8.8H5.3c-.5 0-.8-.4-.8-.8v-2.2Z"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinejoin="round"
                          fill={`${colors.secondary}18`}
                        />
                        <path
                          d="M6 13.5h12v5.2c0 .7-.5 1.3-1.2 1.3H7.2c-.7 0-1.2-.6-1.2-1.3v-5.2Z"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinejoin="round"
                          fill={`${colors.background}aa`}
                        />
                        <path
                          d="M12 7.5v12.5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className="block text-[0.7rem] font-semibold uppercase tracking-[0.24em] sm:text-xs"
                        style={{
                          color: colors.secondary,
                          fontFamily: fonts.eyebrow,
                        }}
                      >
                        {giftHeadline || "A gift, from the heart"}
                      </span>
                      <span
                        className="mt-1.5 block text-xl font-semibold leading-snug sm:text-2xl"
                        style={{
                          color: colors.primary,
                          fontFamily: fonts.heading,
                        }}
                      >
                        {giftTitle || "Send a Gift"}
                      </span>
                      <span
                        className="mt-2 block text-sm leading-relaxed sm:text-[0.95rem]"
                        style={{ color: colors.text, opacity: 0.88 }}
                      >
                        {giftTeaser ||
                          "Your presence at this celebration means the most. Should you wish to send a gift to the celebrants, you may do so securely here."}
                      </span>
                    </span>
                  </span>
                  <span
                    className="relative mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold tracking-wide transition-transform duration-200 group-hover:translate-y-[-1px] sm:text-[0.95rem]"
                    style={{
                      background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.secondary}d8 55%, ${colors.secondary} 100%)`,
                      color: colors.background,
                      boxShadow: `0 14px 28px -18px ${colors.secondary}, inset 0 1px 0 ${colors.background}55`,
                      fontFamily: fonts.eyebrow,
                    }}
                  >
                    {giftCtaLabel || "Send a Gift"}
                    <span
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden
                    >
                      →
                    </span>
                  </span>
                  <span
                    className="relative mt-3.5 block text-center text-[0.65rem] font-semibold uppercase tracking-[0.16em] sm:text-xs"
                    style={{ color: colors.secondary, opacity: 0.9 }}
                  >
                    {giftOptionalNote || "Entirely optional · Securely processed"}
                  </span>
                </Link>
              ) : null}
              {showHelp && callablePhone ? (
                <a
                  href={`tel:${callablePhone}`}
                  className="flex min-h-[56px] items-center justify-between rounded-2xl px-5 py-3.5"
                  style={{
                    background: `${colors.primary}08`,
                    border: `1px solid ${colors.secondary}28`,
                  }}
                >
                  <span>
                    <span
                      className="block text-xs uppercase tracking-[0.2em] sm:text-sm"
                      style={{
                        color: colors.secondary,
                        fontFamily: fonts.eyebrow,
                        fontWeight: 600,
                      }}
                    >
                      Need help
                    </span>
                    <span
                      className="mt-1 block text-base sm:text-lg"
                      style={{ color: colors.primary, fontWeight: 500 }}
                    >
                      Call host · {contactPhoneDisplay}
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

        <footer className="mt-16 text-center">
          <Link
            href={inviteHref}
            className="text-xs uppercase tracking-[0.24em] underline decoration-from-font underline-offset-[0.35em] transition-opacity hover:opacity-80 sm:text-sm"
            style={{
              color: colors.primary,
              fontFamily: fonts.eyebrow,
              fontWeight: 700,
              textDecorationColor: colors.secondary,
            }}
          >
            View invitation
          </Link>
        </footer>
      </div>
    </div>
  );
}
