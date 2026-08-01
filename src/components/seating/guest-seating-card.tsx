"use client";

import { useMemo, useState } from "react";
import { Armchair, CheckCircle2, MapPin, Users } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  evaluateSeatingReveal,
  resolveSeatingTheme,
  seatingHoldMessage,
} from "@/lib/seating/seating-theme";
import { seatingStageEyebrow } from "@/lib/seating/plan-display";
import {
  seatDisplayName,
  tableCaptionValue,
  tableDisplayName,
} from "@/lib/seating/seating-types";
import {
  DEFAULT_STUDIO_SETTINGS,
  type ReceptionAssignmentMode,
  type StudioSettings,
} from "@/lib/seating/studio-types";
import { cn } from "@/lib/utils";

/** Compact modern table + chair mark for “Find my seat” actions. */
function SeatTableIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-4 w-4 shrink-0", className)}
      aria-hidden
    >
      {/* Round table top */}
      <ellipse cx="12" cy="10.5" rx="7.2" ry="3.2" stroke="currentColor" strokeWidth="1.75" />
      {/* Table pedestal */}
      <path
        d="M12 13.7V18.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M9.2 18.2h5.6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Chair back + seat (right) */}
      <path
        d="M18.6 7.2v4.4c0 .7.5 1.2 1.2 1.2h.4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.2 12.8h3.4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Chair leg hint */}
      <path
        d="M19.8 14v2.4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface GuestSeatingMember {
  id: string;
  name: string;
  seatLabel?: string | null;
  ceremonySeatLabel?: string | null;
  admitted?: boolean;
}

export interface GuestSeatingCardProps {
  design: InvitationDesignConfig;
  guestName: string;
  partyName?: string | null;
  /** Reception table / places */
  tableNumber?: string | null;
  seatLabel?: string | null;
  zone?: string | null;
  /** Ceremony row / chairs */
  ceremonyRowLabel?: string | null;
  ceremonySeatLabel?: string | null;
  ceremonyZone?: string | null;
  receptionMode?: ReceptionAssignmentMode;
  members?: GuestSeatingMember[];
  allowance?: number;
  admittedCount?: number;
  guestStatus?: string | null;
  planStatus?: "draft" | "published";
  settings?: Partial<StudioSettings>;
  eventStartDate?: Date | string | null;
  isPortal?: boolean;
  directions?: string[];
  ceremonyDirections?: string[];
  /**
   * `placeCard` — compact dual-stage embed on the invitation (no gate arrival strip).
   * `full` — seat lookup / companion with party arrival detail.
   */
  variant?: "full" | "placeCard";
  className?: string;
}

function StageSeal({
  value,
  theme,
}: {
  value: string;
  theme: { secondary: string; primary: string; background: string; fontHeading: string };
}) {
  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 shadow-inner sm:h-16 sm:w-16"
      style={{
        borderColor: theme.secondary,
        background: `radial-gradient(circle at 30% 30%, color-mix(in srgb, ${theme.secondary} 28%, white), ${theme.background})`,
      }}
      aria-hidden
    >
      <span
        className="max-w-[3.25rem] truncate text-center text-xl font-bold leading-none sm:text-2xl"
        style={{ color: theme.primary, fontFamily: theme.fontHeading }}
      >
        {value}
      </span>
    </div>
  );
}

export function GuestSeatingCard({
  design,
  guestName,
  partyName,
  tableNumber,
  seatLabel,
  zone,
  ceremonyRowLabel,
  ceremonySeatLabel,
  ceremonyZone,
  receptionMode = "TABLE_AND_CHAIR",
  members = [],
  allowance,
  admittedCount = 0,
  guestStatus,
  planStatus = "published",
  settings,
  eventStartDate,
  isPortal = false,
  directions,
  ceremonyDirections,
  variant = "full",
  className,
}: GuestSeatingCardProps) {
  const reduceMotion = useReducedMotion();
  const [mapOpen, setMapOpen] = useState<"ceremony" | "reception" | null>(null);
  const theme = useMemo(() => resolveSeatingTheme(design), [design]);
  const resolvedSettings = { ...DEFAULT_STUDIO_SETTINGS, ...settings };
  const reveal = evaluateSeatingReveal({
    settings: resolvedSettings,
    planStatus,
    guestStatus,
    admittedCount,
    eventStartDate,
    isPortal,
  });

  const placeCard = variant === "placeCard";
  const partyLabel = partyName?.trim() || guestName;
  const remaining = Math.max(0, (allowance ?? (members.length || 1)) - admittedCount);
  const hasCeremony = Boolean(ceremonyRowLabel || ceremonySeatLabel);
  const hasReception = Boolean(tableNumber);
  const tableOnly = receptionMode === "TABLE_ONLY" || !seatLabel;
  const receptionTableName = tableNumber ? tableDisplayName(tableNumber) : "";
  const receptionSeal = tableNumber ? tableCaptionValue(tableNumber) : "";
  const ceremonySeal = ceremonySeatLabel
    ? ceremonySeatLabel.replace(/^seat\s+/i, "").trim() || ceremonySeatLabel
    : ceremonyRowLabel
      ? tableCaptionValue(ceremonyRowLabel)
      : "·";

  const receptionSteps = directions?.length
    ? directions
    : resolvedSettings.receptionDirections ?? resolvedSettings.directionsFromEntrance;
  const ceremonySteps = ceremonyDirections?.length
    ? ceremonyDirections
    : resolvedSettings.ceremonyDirections ?? resolvedSettings.directionsFromEntrance;

  if (!reveal.visible) {
    return (
      <section
        className={cn("rounded-2xl border px-5 py-6 text-center", className)}
        style={{
          borderColor: theme.border,
          background: `color-mix(in srgb, ${theme.secondary} 8%, ${theme.background})`,
          color: theme.foreground,
          borderRadius: theme.radius,
        }}
        aria-live="polite"
      >
        <Armchair className="mx-auto h-8 w-8 opacity-80" style={{ color: theme.primary }} />
        <h3
          className="mt-3 text-xs font-bold uppercase tracking-[0.2em] sm:text-sm"
          style={{
            color: `color-mix(in srgb, ${theme.secondary} 42%, ${theme.foreground})`,
            fontFamily: theme.fontHeading,
          }}
        >
          My seating
        </h3>
        <p className="mt-3 text-base font-semibold leading-relaxed" style={{ color: theme.foreground }}>
          {seatingHoldMessage(reveal.reason)}
        </p>
      </section>
    );
  }

  if (!hasCeremony && !hasReception) {
    return (
      <section
        className={cn("rounded-2xl border px-5 py-6 text-center", className)}
        style={{
          borderColor: theme.border,
          background: `color-mix(in srgb, ${theme.secondary} 8%, ${theme.background})`,
          borderRadius: theme.radius,
          color: theme.foreground,
        }}
      >
        <Armchair className="mx-auto h-8 w-8" style={{ color: theme.primary }} />
        <p className="mt-3 text-base font-semibold" style={{ color: theme.foreground }}>
          Your seat assignment will appear here once the host finalizes seating.
        </p>
      </section>
    );
  }

  const bothStages = hasCeremony && hasReception;
  // On gold themes, secondary ≈ background. Use primary ink + cream panels for contrast.
  const inkColor = `color-mix(in srgb, ${theme.foreground} 78%, #0c0a09)`;
  const labelColor = theme.primary;
  const stagePanelBg = `color-mix(in srgb, #fffaf0 78%, ${theme.background})`;
  const stagePanelBorder = `color-mix(in srgb, ${theme.primary} 28%, ${theme.border})`;

  return (
    <motion.section
      className={cn("overflow-hidden rounded-2xl border", className)}
      style={{
        borderColor: theme.border,
        background: theme.background,
        color: inkColor,
        borderRadius: theme.radius,
        boxShadow: placeCard ? "none" : `0 18px 40px -28px ${theme.primary}`,
      }}
      initial={reduceMotion || theme.motion === "none" ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      aria-label="Your ceremony and reception seating"
    >
      {!placeCard && (
        <div
          className="border-b px-5 py-5"
          style={{
            borderColor: theme.border,
            background: `linear-gradient(135deg, color-mix(in srgb, ${theme.secondary} 22%, ${theme.background}), color-mix(in srgb, ${theme.secondary} 8%, ${theme.background}))`,
          }}
        >
          <p
            className="text-sm font-bold uppercase tracking-[0.18em]"
            style={{ color: labelColor, fontFamily: theme.fontHeading }}
          >
            Your seating
          </p>
          <h3
            className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl"
            style={{ color: inkColor, fontFamily: theme.fontHeading }}
          >
            {partyLabel}
          </h3>
        </div>
      )}

      <div
        className={cn(
          "gap-3 px-4 py-4 sm:px-5",
          bothStages ? "grid sm:grid-cols-2" : "flex flex-col"
        )}
      >
        {hasCeremony && (
          <div
            className="rounded-xl border-2 px-4 py-4 text-left"
            style={{ borderColor: stagePanelBorder, background: stagePanelBg }}
            data-testid="seating-ceremony-stage"
          >
            <p
              className="text-sm font-bold uppercase tracking-[0.14em]"
              style={{ color: labelColor, fontFamily: theme.fontHeading }}
            >
              Main wedding ceremony
            </p>
            <div className="mt-3 flex items-center gap-3">
              <StageSeal value={ceremonySeal} theme={theme} />
              <div className="min-w-0">
                <p
                  className="text-xl font-bold leading-tight sm:text-2xl"
                  style={{ color: inkColor, fontFamily: theme.fontHeading }}
                >
                  {ceremonyRowLabel ? tableDisplayName(ceremonyRowLabel) : "Reserved section"}
                </p>
                {ceremonySeatLabel ? (
                  <p className="mt-1.5 text-lg font-bold" style={{ color: inkColor }}>
                    {seatDisplayName(ceremonySeatLabel)}
                  </p>
                ) : (
                  <p className="mt-1.5 text-lg font-bold" style={{ color: inkColor }}>
                    Chair reserved for you
                  </p>
                )}
                {ceremonyZone && (
                  <p
                    className="mt-1.5 inline-flex items-center gap-1 text-sm font-bold"
                    style={{ color: labelColor }}
                  >
                    <MapPin className="h-4 w-4" /> {ceremonyZone}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {hasReception && tableNumber && (
          <div
            className="rounded-xl border-2 px-4 py-4 text-left"
            style={{ borderColor: stagePanelBorder, background: stagePanelBg }}
            data-testid="seating-reception-stage"
          >
            <p
              className="text-sm font-bold uppercase tracking-[0.14em]"
              style={{ color: labelColor, fontFamily: theme.fontHeading }}
            >
              {seatingStageEyebrow("RECEPTION")}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <StageSeal
                value={/^tables?$/i.test(receptionTableName) ? "·" : receptionSeal}
                theme={theme}
              />
              <div className="min-w-0">
                <p
                  className="text-xl font-bold leading-tight sm:text-2xl"
                  style={{ color: inkColor, fontFamily: theme.fontHeading }}
                >
                  {receptionTableName}
                </p>
                {tableOnly ? (
                  <p className="mt-1.5 text-lg font-bold" style={{ color: inkColor }}>
                    {allowance && allowance > 1
                      ? `${allowance} reserved places at this table`
                      : "Reserved places at this table"}
                  </p>
                ) : (
                  <p className="mt-1.5 text-lg font-bold" style={{ color: inkColor }}>
                    {seatDisplayName(seatLabel!)}
                  </p>
                )}
                {zone && (
                  <p
                    className="mt-1.5 inline-flex items-center gap-1 text-sm font-bold"
                    style={{ color: labelColor }}
                  >
                    <MapPin className="h-4 w-4" /> {zone}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gate / seat-lookup only — place card already shows party capacity above. */}
      {!placeCard && (allowance != null || members.length > 0) && (
        <div className="px-4 pb-4 sm:px-5">
          <div className="rounded-xl border px-3 py-2.5 text-base" style={{ borderColor: theme.border }}>
            <p
              className="inline-flex items-center gap-1.5 font-bold"
              style={{ color: inkColor }}
            >
              <Users className="h-4 w-4" style={{ color: labelColor }} />
              {admittedCount} of {allowance ?? Math.max(members.length, 1)} guests have arrived
            </p>
            {remaining > 0 && (
              <p className="mt-1 text-sm font-semibold" style={{ color: labelColor }}>
                {remaining} place{remaining === 1 ? "" : "s"} remain reserved for your party.
              </p>
            )}
          </div>
        </div>
      )}

      {!placeCard && members.length > 0 && (
        <div className="space-y-2 px-4 pb-4 sm:px-5">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-base"
              style={{ borderColor: theme.border }}
            >
              <div>
                <p className="font-bold" style={{ color: inkColor }}>
                  {member.name}
                </p>
                <p className="text-sm font-semibold" style={{ color: labelColor }}>
                  {[
                    member.ceremonySeatLabel
                      ? `Ceremony ${seatDisplayName(member.ceremonySeatLabel)}`
                      : null,
                    member.seatLabel ? `Event Seating ${seatDisplayName(member.seatLabel)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {member.admitted ? (
                <Badge
                  className="shrink-0 gap-1.5 border border-emerald-700/20 bg-emerald-600 px-3 py-1 text-sm font-bold text-white shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Admitted
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="shrink-0 border-2 px-3 py-1 text-sm font-bold"
                  style={{
                    borderColor: labelColor,
                    color: inkColor,
                    background: `color-mix(in srgb, ${theme.background} 88%, white)`,
                  }}
                >
                  Awaiting
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}

      {resolvedSettings.showFindMySeat && (
        <div className="space-y-2 border-t px-4 py-4 sm:px-5" style={{ borderColor: theme.border }}>
          <div className="flex flex-wrap justify-center gap-2">
            {hasCeremony && hasReception ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setMapOpen((value) => (value === "ceremony" ? null : "ceremony"))}
                >
                  <SeatTableIcon />
                  {mapOpen === "ceremony" ? "Hide directions" : "Find ceremony seat"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setMapOpen((value) => (value === "reception" ? null : "reception"))}
                >
                  <SeatTableIcon />
                  {mapOpen === "reception" ? "Hide directions" : "Find event table"}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() =>
                  setMapOpen((value) => {
                    const stage = hasCeremony ? "ceremony" : "reception";
                    return value === stage ? null : stage;
                  })
                }
              >
                <SeatTableIcon />
                {mapOpen ? "Hide directions" : "Find my seat"}
              </Button>
            )}
          </div>
          {mapOpen && (
            <ol className="mt-3 space-y-2 text-left text-base font-semibold" style={{ color: inkColor }}>
              {(mapOpen === "ceremony" ? ceremonySteps : receptionSteps)?.map((step, index) => (
                <li key={`${mapOpen}-${index}-${step}`} className="flex gap-2">
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: theme.primary }}
                  >
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
              <li className="flex gap-2">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: theme.primary }}
                >
                  ★
                </span>
                <span>
                  {mapOpen === "ceremony"
                    ? `Look for ${ceremonyRowLabel ? tableDisplayName(ceremonyRowLabel) : "your ceremony section"}${
                        ceremonySeatLabel ? `, ${seatDisplayName(ceremonySeatLabel)}` : ""
                      }.`
                    : `Look for ${tableNumber ? tableDisplayName(tableNumber) : "your event table"}${
                        zone ? ` in the ${zone} zone` : ""
                      }.`}
                </span>
              </li>
            </ol>
          )}
        </div>
      )}
    </motion.section>
  );
}
