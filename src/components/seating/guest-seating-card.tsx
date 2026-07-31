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
        className="max-w-[3.25rem] truncate text-center text-lg font-bold leading-none sm:text-xl"
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
        <Armchair className="mx-auto h-8 w-8 opacity-70" style={{ color: theme.secondary }} />
        <h3
          className="mt-3 text-sm font-semibold uppercase tracking-[0.22em]"
          style={{ color: theme.secondary, fontFamily: theme.fontHeading }}
        >
          My seating
        </h3>
        <p className="mt-3 text-sm leading-relaxed opacity-80">{seatingHoldMessage(reveal.reason)}</p>
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
        <Armchair className="mx-auto h-8 w-8" style={{ color: theme.secondary }} />
        <p className="mt-3 text-sm opacity-80">
          Your seat assignment will appear here once the host finalizes seating.
        </p>
      </section>
    );
  }

  const bothStages = hasCeremony && hasReception;

  return (
    <motion.section
      className={cn("overflow-hidden rounded-2xl border", className)}
      style={{
        borderColor: theme.border,
        background: theme.background,
        color: theme.foreground,
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
          className="border-b px-5 py-4"
          style={{
            borderColor: theme.border,
            background: `linear-gradient(135deg, color-mix(in srgb, ${theme.secondary} 14%, transparent), transparent)`,
          }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.28em]"
            style={{ color: theme.secondary, fontFamily: theme.fontHeading }}
          >
            Your seating
          </p>
          <h3 className="mt-2 text-xl font-semibold" style={{ fontFamily: theme.fontHeading }}>
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
            className="rounded-xl border px-3.5 py-3.5 text-left"
            style={{ borderColor: theme.border }}
            data-testid="seating-ceremony-stage"
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: theme.secondary }}
            >
              Main wedding ceremony
            </p>
            <div className="mt-3 flex items-center gap-3">
              <StageSeal value={ceremonySeal} theme={theme} />
              <div className="min-w-0">
                <p className="text-lg font-semibold leading-tight" style={{ fontFamily: theme.fontHeading }}>
                  {ceremonyRowLabel ? tableDisplayName(ceremonyRowLabel) : "Reserved section"}
                </p>
                {ceremonySeatLabel ? (
                  <p className="mt-1 text-sm opacity-80">{seatDisplayName(ceremonySeatLabel)}</p>
                ) : (
                  <p className="mt-1 text-sm opacity-70">Chair reserved for you</p>
                )}
                {ceremonyZone && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs opacity-70">
                    <MapPin className="h-3.5 w-3.5" /> {ceremonyZone}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {hasReception && tableNumber && (
          <div
            className="rounded-xl border px-3.5 py-3.5 text-left"
            style={{ borderColor: theme.border }}
            data-testid="seating-reception-stage"
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: theme.secondary }}
            >
              Reception
            </p>
            <div className="mt-3 flex items-center gap-3">
              <StageSeal
                value={/^tables?$/i.test(receptionTableName) ? "·" : receptionSeal}
                theme={theme}
              />
              <div className="min-w-0">
                <p className="text-lg font-semibold leading-tight" style={{ fontFamily: theme.fontHeading }}>
                  {receptionTableName}
                </p>
                {tableOnly ? (
                  <p className="mt-1 text-sm opacity-80">
                    {allowance && allowance > 1
                      ? `${allowance} reserved places at this table`
                      : "Reserved places at this table"}
                  </p>
                ) : (
                  <p className="mt-1 text-sm opacity-80">{seatDisplayName(seatLabel!)}</p>
                )}
                {zone && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs opacity-70">
                    <MapPin className="h-3.5 w-3.5" /> {zone}
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
          <div className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: theme.border }}>
            <p className="inline-flex items-center gap-1.5 font-medium">
              <Users className="h-4 w-4" style={{ color: theme.secondary }} />
              {admittedCount} of {allowance ?? Math.max(members.length, 1)} guests have arrived
            </p>
            {remaining > 0 && (
              <p className="mt-1 text-xs opacity-75">
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
              className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: theme.border }}
            >
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-xs opacity-70">
                  {[
                    member.ceremonySeatLabel
                      ? `Ceremony ${seatDisplayName(member.ceremonySeatLabel)}`
                      : null,
                    member.seatLabel ? `Reception ${seatDisplayName(member.seatLabel)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {member.admitted ? (
                <Badge className="gap-1 bg-emerald-500/15 text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Admitted
                </Badge>
              ) : (
                <Badge variant="outline">Awaiting</Badge>
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
                  {mapOpen === "reception" ? "Hide directions" : "Find reception table"}
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
            <ol className="mt-3 space-y-2 text-left text-sm opacity-85">
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
                  style={{ background: theme.secondary }}
                >
                  ★
                </span>
                <span>
                  {mapOpen === "ceremony"
                    ? `Look for ${ceremonyRowLabel ? tableDisplayName(ceremonyRowLabel) : "your ceremony section"}${
                        ceremonySeatLabel ? `, ${seatDisplayName(ceremonySeatLabel)}` : ""
                      }.`
                    : `Look for ${tableNumber ? tableDisplayName(tableNumber) : "your reception table"}${
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
