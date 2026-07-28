import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { invitationService } from "@/services/invitations/invitation.service";
import { seatingService } from "@/services/seating/seating.service";
import { getInvitationAdmission } from "@/services/admission/admission.service";
import { resolveInvitationFeatures } from "@/services/invitation-features/feature-resolver";
import {
  describeHeldSeats,
  resolveSeatingContinuity,
  type SeatingContinuity,
} from "@/lib/admission/seating-continuity";
import { getDefaultDesignConfig, mergeDesignConfig } from "@/lib/invitation-templates";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import { ensureEventMemoryLinks } from "@/lib/memory/ensure-event-memory-links";
import { giftCampaignService } from "@/services/gifts/gift-campaign.service";
import { PortalStatusPoller } from "./portal-status-poller";
import type { ResolvedFeature } from "@/lib/invitation-features/registry";

// Admission is verified per request on the server — never cached, never trusted
// from the client (spec §21, §27).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Your Event Companion",
  robots: { index: false, follow: false },
};

const FALLBACK_COLORS: InvitationDesignConfig["colors"] = {
  primary: "#3A2A2E",
  secondary: "#C7A35A",
  accent: "#D99A93",
  background: "#FBF6EF",
  text: "#3A2A2E",
};

function resolveColors(invitation: {
  designConfig: unknown;
  template: { slug: string; config: unknown } | null;
}): InvitationDesignConfig["colors"] {
  const stored = invitation.designConfig as InvitationDesignConfig | null;
  if (stored?.colors) return { ...FALLBACK_COLORS, ...stored.colors };
  const templateConfig = invitation.template?.config as { layout?: string } | null;
  const identitySlug = invitation.template?.slug ?? templateConfig?.layout;
  try {
    const base = getDefaultDesignConfig(identitySlug);
    const merged = mergeDesignConfig(base, templateConfig as Partial<InvitationDesignConfig> | undefined);
    return { ...FALLBACK_COLORS, ...merged.colors };
  } catch {
    return FALLBACK_COLORS;
  }
}

export default async function EventDayPortal({
  params,
  searchParams,
}: {
  params: Promise<{ link: string }>;
  searchParams: Promise<{ guest?: string }>;
}) {
  const { link } = await params;
  const { guest: guestToken } = await searchParams;

  const invitation = await prisma.invitation.findUnique({
    where: { uniqueLink: link },
    select: {
      id: true,
      uniqueLink: true,
      status: true,
      postAdmissionEnabled: true,
      designConfig: true,
      template: { select: { slug: true, config: true } },
      event: {
        select: {
          id: true,
          title: true,
          status: true,
          startDate: true,
          venueName: true,
          landmark: true,
          mapsLink: true,
          dressCode: true,
          contactPhone: true,
        },
      },
    },
  });

  if (!invitation) notFound();
  if (invitation.status === "EXPIRED" || invitation.event.status === "CANCELLED") notFound();
  // Feature-flagged: portal only exists for invitations the organiser enabled.
  if (!invitation.postAdmissionEnabled) notFound();

  const colors = resolveColors(invitation);
  const summary = await getInvitationAdmission(invitation.id);
  const unlocked = Boolean(summary?.canAccessPortal);

  // Guest personalisation (name + seating) only after admission — never leak
  // seating on the locked screen.
  const guest =
    unlocked && guestToken
      ? await invitationService.getGuestForInvitation(invitation.id, guestToken)
      : null;
  const seating = guest ? await seatingService.lookupByGuestId(guest.id) : null;
  const seat = seating?.assignment ?? null;

  const guestName = guest?.name?.trim() || null;
  const isGroup = (summary?.allowance ?? 1) > 1;

  // Shared feature layer governs which post-admission sections show + their order.
  const features = unlocked ? await resolveInvitationFeatures(invitation.id) : [];
  const showSeat =
    features.find((f) => f.key === "SEATING_REVEAL")?.enabled ?? true;

  const memoryLinks =
    unlocked && features.some((f) => f.key === "MEMORY_VAULT" && f.enabled)
      ? await ensureEventMemoryLinks(invitation.event.id).catch(() => null)
      : null;
  const giftPlacement =
    unlocked && features.some((f) => f.key === "GIFT_WALLET" && f.enabled)
      ? await giftCampaignService
          .resolveInvitePlacement(invitation.event.id, { guestQrToken: guestToken ?? null })
          .catch(() => null)
      : null;

  // Seating continuity — a part-arrived group sees the seats that are live now
  // and is told, in plain words, that the rest are still being held.
  let continuity: SeatingContinuity | null = null;
  if (unlocked && showSeat && isGroup) {
    const partyGuests = await prisma.guest.findMany({
      where: { invitationId: invitation.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
        seatingAssignment: { select: { tableNumber: true, seatLabel: true, zone: true } },
      },
    });
    continuity = resolveSeatingContinuity(
      partyGuests
        .filter((g) => g.seatingAssignment)
        .map((g) => ({
          guestId: g.id,
          guestName: g.name,
          tableNumber: g.seatingAssignment!.tableNumber,
          seatLabel: g.seatingAssignment!.seatLabel,
          zone: g.seatingAssignment!.zone,
          admitted: g.status === "CHECKED_IN",
        })),
      summary?.allowance ?? 1,
      summary?.admittedCount ?? 0
    );
  }

  return (
    <main
      className="min-h-[100dvh] w-full px-5 py-10"
      style={{ background: colors.background, color: colors.text }}
    >
      <PortalStatusPoller link={invitation.uniqueLink} initialUnlocked={unlocked} />

      <div className="mx-auto w-full max-w-[520px]">
        {!unlocked ? (
          <LockedState eventTitle={invitation.event.title} link={invitation.uniqueLink} colors={colors} />
        ) : (
          <UnlockedState
            eventTitle={invitation.event.title}
            guestName={guestName}
            isGroup={isGroup}
            admittedCount={summary?.admittedCount ?? 1}
            remainingCount={summary?.remainingCount ?? 0}
            allowance={summary?.allowance ?? 1}
            seat={showSeat ? seat : null}
            showSeat={showSeat}
            continuity={continuity}
            colors={colors}
            features={features}
            event={invitation.event}
            memoryUploadUrl={memoryLinks?.uploadUrl ?? null}
            memoryAlbumUrl={memoryLinks?.albumUrl ?? null}
            giftUrl={giftPlacement?.giftUrl ?? null}
            giftTitle={giftPlacement?.title ?? null}
          />
        )}
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */

function LockedState({
  eventTitle,
  link,
  colors,
}: {
  eventTitle: string;
  link: string;
  colors: InvitationDesignConfig["colors"];
}) {
  return (
    <section className="flex flex-col items-center text-center" aria-live="polite">
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ border: `1.5px solid ${colors.secondary}`, color: colors.secondary }}
        aria-hidden
      >
        {/* Simple lock glyph — no essential info conveyed by motion alone */}
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold" style={{ color: colors.primary }}>
        Your Event Companion Unlocks on Arrival
      </h1>
      <p className="mt-4 max-w-[24rem] text-sm leading-relaxed" style={{ color: colors.text }}>
        Once your invitation is scanned and your arrival is confirmed, you&apos;ll gain access to your
        seating details, event programme, Memory Vault, Gift Wallet and other event-day features for{" "}
        <span style={{ color: colors.secondary }}>{eventTitle}</span>.
      </p>
      <p className="mt-3 text-xs" style={{ color: colors.text, opacity: 0.7 }}>
        This page refreshes automatically the moment you&apos;re admitted.
      </p>
      <Link
        href={`/invite/${encodeURIComponent(link)}`}
        className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[11px] uppercase tracking-[0.22em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ background: colors.secondary, color: colors.background }}
      >
        Return to invitation
      </Link>
    </section>
  );
}

function UnlockedState({
  eventTitle,
  guestName,
  isGroup,
  admittedCount,
  remainingCount,
  allowance,
  seat,
  showSeat,
  continuity,
  colors,
  features,
  event,
  memoryUploadUrl,
  memoryAlbumUrl,
  giftUrl,
  giftTitle,
}: {
  eventTitle: string;
  guestName: string | null;
  isGroup: boolean;
  admittedCount: number;
  remainingCount: number;
  allowance: number;
  seat: { tableNumber: string; seatLabel: string | null; zone: string | null } | null;
  showSeat: boolean;
  continuity: SeatingContinuity | null;
  colors: InvitationDesignConfig["colors"];
  features: ResolvedFeature[];
  event: {
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
}) {
  const heldCopy = continuity ? describeHeldSeats(continuity) : null;
  const enabled = (key: ResolvedFeature["key"]) =>
    features.some((f) => f.key === key && f.enabled);
  const showDirections = Boolean(event.mapsLink || event.venueName);
  const showHelp = enabled("GUEST_HELP") && Boolean(event.contactPhone);

  return (
    <section className="flex flex-col items-center text-center" aria-live="polite">
      <p className="text-[11px] uppercase tracking-[0.32em]" style={{ color: colors.secondary }}>
        You&apos;ve arrived
      </p>
      <h1 className="mt-3 text-3xl font-semibold" style={{ color: colors.primary }}>
        {guestName ? `Welcome, ${guestName}` : "Welcome to the Celebration"}
      </h1>
      <p className="mt-4 max-w-[24rem] text-sm leading-relaxed" style={{ color: colors.text }}>
        Your arrival has been confirmed. We are delighted to celebrate this beautiful chapter with you
        at <span style={{ color: colors.secondary }}>{eventTitle}</span>.
      </p>
      <p className="mt-2 text-xs" style={{ color: colors.text, opacity: 0.75 }}>
        Everything you need for today&apos;s celebration is right here.
      </p>

      {isGroup && (
        <div className="mt-5 space-y-1" aria-live="polite">
          <p className="text-sm font-medium" style={{ color: colors.primary }}>
            {admittedCount} of {allowance} in your party {admittedCount === 1 ? "has" : "have"}{" "}
            arrived
          </p>
          {remainingCount > 0 && (
            <p className="text-xs" style={{ color: colors.text, opacity: 0.75 }}>
              {remainingCount} {remainingCount === 1 ? "place is" : "places are"} still open on
              this invitation — the rest of your party can arrive at any time with the same pass.
            </p>
          )}
        </div>
      )}

      {/* My Seat — gated by the shared feature layer (SEATING_REVEAL) */}
      {showSeat && (
      <div
        className="mt-8 w-full rounded-2xl px-6 py-6 text-left"
        style={{ background: `${colors.secondary}14`, border: `1px solid ${colors.secondary}55` }}
      >
        <h2 className="text-[11px] uppercase tracking-[0.24em]" style={{ color: colors.secondary }}>
          My Seat
        </h2>
        {seat ? (
          <div className="mt-2">
            <p className="text-2xl font-semibold" style={{ color: colors.primary }}>
              Table {seat.tableNumber}
            </p>
            {seat.seatLabel && (
              <p className="mt-1 text-sm" style={{ color: colors.text }}>
                Seat {seat.seatLabel}
              </p>
            )}
            {seat.zone && (
              <p className="mt-1 text-xs" style={{ color: colors.text, opacity: 0.7 }}>
                {seat.zone}
              </p>
            )}
          </div>
        ) : continuity?.revealed.length ? (
          <div className="mt-2 space-y-1">
            {continuity.revealed.map((s) => (
              <p key={s.guestId} className="text-sm" style={{ color: colors.primary }}>
                <span className="font-medium">{s.guestName}</span> — Table {s.tableNumber}
                {s.seatLabel ? `, Seat ${s.seatLabel}` : ""}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm" style={{ color: colors.text, opacity: 0.8 }}>
            Your table will be shown here once seating is assigned. Please ask an usher for guidance.
          </p>
        )}

        {heldCopy && (
          <p className="mt-3 text-xs" style={{ color: colors.text, opacity: 0.75 }}>
            {heldCopy}
          </p>
        )}
      </div>
      )}

      {(showDirections || event.dressCode) && (
        <div
          className="mt-4 w-full rounded-2xl px-6 py-5 text-left"
          style={{ background: `${colors.primary}08`, border: `1px solid ${colors.secondary}33` }}
        >
          <h2 className="text-[11px] uppercase tracking-[0.24em]" style={{ color: colors.secondary }}>
            Today&apos;s details
          </h2>
          {event.venueName && (
            <p className="mt-2 text-sm font-medium" style={{ color: colors.primary }}>
              {event.venueName}
            </p>
          )}
          {event.landmark && (
            <p className="mt-1 text-xs" style={{ color: colors.text, opacity: 0.75 }}>
              {event.landmark}
            </p>
          )}
          {event.dressCode && (
            <p className="mt-2 text-sm" style={{ color: colors.text }}>
              Dress code · {event.dressCode}
            </p>
          )}
          {event.mapsLink && (
            <Link
              href={event.mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex text-[11px] uppercase tracking-[0.18em] underline underline-offset-4"
              style={{ color: colors.secondary }}
            >
              Open directions
            </Link>
          )}
        </div>
      )}

      <div className="mt-4 flex w-full flex-col gap-3">
        {enabled("MEMORY_VAULT") && (memoryUploadUrl || memoryAlbumUrl) && (
          <div
            className="rounded-2xl px-5 py-4 text-left"
            style={{ border: `1px solid ${colors.secondary}44` }}
          >
            <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: colors.secondary }}>
              Memory Vault
            </p>
            <p className="mt-1 text-sm" style={{ color: colors.text }}>
              Share photos and videos from your lens.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {memoryUploadUrl && (
                <Link
                  href={memoryUploadUrl}
                  className="text-[11px] uppercase tracking-[0.16em] underline underline-offset-4"
                  style={{ color: colors.primary }}
                >
                  Add memories
                </Link>
              )}
              {memoryAlbumUrl && (
                <Link
                  href={memoryAlbumUrl}
                  className="text-[11px] uppercase tracking-[0.16em] underline underline-offset-4"
                  style={{ color: colors.primary }}
                >
                  View album
                </Link>
              )}
            </div>
          </div>
        )}

        {enabled("GIFT_WALLET") && giftUrl && (
          <div
            className="rounded-2xl px-5 py-4 text-left"
            style={{ border: `1px solid ${colors.secondary}44` }}
          >
            <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: colors.secondary }}>
              {giftTitle || "Send a Gift"}
            </p>
            <Link
              href={giftUrl}
              className="mt-2 inline-flex text-[11px] uppercase tracking-[0.16em] underline underline-offset-4"
              style={{ color: colors.primary }}
            >
              Open Gift Wallet
            </Link>
          </div>
        )}

        {showHelp && event.contactPhone && (
          <div
            className="rounded-2xl px-5 py-4 text-left"
            style={{ border: `1px solid ${colors.secondary}44` }}
          >
            <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: colors.secondary }}>
              Need help?
            </p>
            <a
              href={`tel:${event.contactPhone.replace(/\s/g, "")}`}
              className="mt-2 inline-flex text-sm font-medium"
              style={{ color: colors.primary }}
            >
              Call host · {event.contactPhone}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
