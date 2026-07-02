"use client";

import type { CalendarEventInput } from "@/lib/invitation/calendar-utils";
import { getCalendarStyleForLayout } from "@/lib/invitation/calendar-style-engine";
import { ThemedSaveDateCard } from "@/components/guest-portal/themed-save-date-card";
import type { InvitationLayoutSlug } from "@/types/invitation-design";

interface SaveDateCalendarCardProps {
  event: CalendarEventInput;
  accentColor?: string;
  secondaryColor?: string;
  layout?: InvitationLayoutSlug | string;
  collectionId?: string;
}

export function SaveDateCalendarCard({
  event,
  accentColor = "#0B8A83",
  secondaryColor = "#D4A63A",
  layout = "classic-gold",
  collectionId,
}: SaveDateCalendarCardProps) {
  const styleId = getCalendarStyleForLayout(layout, collectionId as Parameters<typeof getCalendarStyleForLayout>[1]);

  return (
    <ThemedSaveDateCard
      event={event}
      styleId={styleId}
      accentColor={accentColor}
      secondaryColor={secondaryColor}
    />
  );
}
