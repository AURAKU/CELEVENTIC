"use client";

import { useMemo, useState } from "react";
import { Armchair, CheckCircle2, MapPin, Navigation, Users } from "lucide-react";
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
  type StudioSettings,
} from "@/lib/seating/studio-types";
import { cn } from "@/lib/utils";

export interface GuestSeatingMember {
  id: string;
  name: string;
  seatLabel?: string | null;
  admitted?: boolean;
}

export interface GuestSeatingCardProps {
  design: InvitationDesignConfig;
  guestName: string;
  partyName?: string | null;
  tableNumber?: string | null;
  seatLabel?: string | null;
  zone?: string | null;
  members?: GuestSeatingMember[];
  allowance?: number;
  admittedCount?: number;
  guestStatus?: string | null;
  planStatus?: "draft" | "published";
  settings?: Partial<StudioSettings>;
  eventStartDate?: Date | string | null;
  isPortal?: boolean;
  directions?: string[];
  className?: string;
}

export function GuestSeatingCard({
  design,
  guestName,
  partyName,
  tableNumber,
  seatLabel,
  zone,
  members = [],
  allowance,
  admittedCount = 0,
  guestStatus,
  planStatus = "published",
  settings,
  eventStartDate,
  isPortal = false,
  directions,
  className,
}: GuestSeatingCardProps) {
  const reduceMotion = useReducedMotion();
  const [mapOpen, setMapOpen] = useState(false);
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

  const partyLabel = partyName?.trim() || guestName;
  const remaining = Math.max(0, (allowance ?? (members.length || 1)) - admittedCount);
  const steps = directions?.length ? directions : resolvedSettings.directionsFromEntrance;

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

  if (!tableNumber) {
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

  return (
    <motion.section
      className={cn("overflow-hidden rounded-2xl border", className)}
      style={{
        borderColor: theme.border,
        background: theme.background,
        color: theme.foreground,
        borderRadius: theme.radius,
        boxShadow: `0 18px 40px -28px ${theme.primary}`,
      }}
      initial={reduceMotion || theme.motion === "none" ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      aria-label={`Assigned ${tableDisplayName(tableNumber)}${seatLabel ? `, ${seatDisplayName(seatLabel)}` : ""}`}
    >
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

      <div className="grid gap-4 px-5 py-5 sm:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex items-end gap-3">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full border-2 shadow-inner"
              style={{
                borderColor: theme.secondary,
                background: `radial-gradient(circle at 30% 30%, color-mix(in srgb, ${theme.secondary} 28%, white), ${theme.background})`,
              }}
            >
              <span className="text-2xl font-bold" style={{ color: theme.primary, fontFamily: theme.fontHeading }}>
                {tableCaptionValue(tableNumber)}
              </span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Table</p>
              <p className="text-2xl font-semibold" style={{ fontFamily: theme.fontHeading }}>
                {tableDisplayName(tableNumber)}
              </p>
              {seatLabel && (
                <p className="mt-1 text-sm opacity-80">{seatDisplayName(seatLabel)}</p>
              )}
              {zone && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs opacity-70">
                  <MapPin className="h-3.5 w-3.5" /> {zone}
                </p>
              )}
            </div>
          </div>

          {(allowance != null || members.length > 0) && (
            <div className="mt-4 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: theme.border }}>
              <p className="inline-flex items-center gap-1.5 font-medium">
                <Users className="h-4 w-4" style={{ color: theme.secondary }} />
                {admittedCount} of {allowance ?? Math.max(members.length, 1)} guests have arrived
              </p>
              {remaining > 0 && (
                <p className="mt-1 text-xs opacity-75">
                  {remaining} seat{remaining === 1 ? "" : "s"} remain reserved for your party.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: theme.border }}
            >
              <div>
                <p className="font-medium">{member.name}</p>
                {member.seatLabel && (
                  <p className="text-xs opacity-70">{seatDisplayName(member.seatLabel)}</p>
                )}
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
      </div>

      {resolvedSettings.showFindMySeat && (
        <div className="border-t px-5 py-4" style={{ borderColor: theme.border }}>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => setMapOpen((value) => !value)}
          >
            <Navigation className="h-4 w-4" />
            {mapOpen ? "Hide directions" : "Find my seat"}
          </Button>
          {mapOpen && (
            <ol className="mt-3 space-y-2 text-sm opacity-85">
              {(steps ?? []).map((step, index) => (
                <li key={`${index}-${step}`} className="flex gap-2">
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
                  {(steps?.length ?? 0) + 1}
                </span>
                <span>
                  Look for {tableDisplayName(tableNumber)}
                  {zone ? ` in the ${zone} zone` : ""}.
                </span>
              </li>
            </ol>
          )}
        </div>
      )}
    </motion.section>
  );
}
